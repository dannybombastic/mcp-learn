import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as cheerio from "cheerio";
import pLimit from "p-limit";
import { htmlToText } from "html-to-text";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const BASE_CATALOG = "https://learn.microsoft.com/api/catalog/";
const DEFAULT_LOCALE = "en-us";

// ---------------------------------------------------------------------------
// Types based on JSON structure analysis
// ---------------------------------------------------------------------------
interface ModuleItem {
  uid: string;
  type: "module";
  title: string;
  summary?: string;
  duration_in_minutes?: number;
  levels?: string[];
  roles?: string[];
  products?: string[];
  subjects?: string[];
  url: string;
  firstUnitUrl: string;
  units: string[];
  number_of_children: number;
  rating?: { count: number; average: number };
  popularity?: number;
  last_modified?: string;
}

interface LearningPathItem {
  uid: string;
  type: "learningPath";
  title: string;
  summary?: string;
  duration_in_minutes?: number;
  levels?: string[];
  roles?: string[];
  products?: string[];
  subjects?: string[];
  url: string;
  firstModuleUrl: string;
  modules: string[];
  number_of_children: number;
  rating?: { count: number; average: number };
  popularity?: number;
  last_modified?: string;
}

interface CertificationItem {
  uid: string;
  type: "cert";
  title: string;
  summary?: string;
  certification_type?: string;
  levels?: string[];
  roles?: string[];
  products?: string[];
  subjects?: string[];
  url: string;
  skills?: string[];
  renewal_frequency_in_days?: number;
  prerequisites?: string[];
  study_guide?: any[];
  exam_duration_in_minutes?: number;
  last_modified?: string;
}

// ---------------------------------------------------------------------------
// Helpers comunes
// ---------------------------------------------------------------------------
async function fetchCatalog(params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && v.length > 0) usp.set(k, v);
  }
  const url = usp.toString() ? `${BASE_CATALOG}?${usp.toString()}` : BASE_CATALOG;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "mcp-learn-catalog/2.0 (+https://learn.microsoft.com/api/catalog/)"
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Catalog API error ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

// Enhanced filtering functions based on JSON structure analysis
function filterByProduct(items: any[], products: string[]): any[] {
  return items.filter(item => 
    item.products && Array.isArray(item.products) && 
    products.some(p => item.products.includes(p))
  );
}

function filterByRole(items: any[], roles: string[]): any[] {
  return items.filter(item => 
    item.roles && Array.isArray(item.roles) && 
    roles.some(r => item.roles.includes(r))
  );
}

function filterByLevel(items: any[], levels: string[]): any[] {
  return items.filter(item => 
    item.levels && Array.isArray(item.levels) && 
    levels.some(l => item.levels.includes(l))
  );
}

function filterBySubject(items: any[], subjects: string[]): any[] {
  return items.filter(item => 
    item.subjects && Array.isArray(item.subjects) && 
    subjects.some(s => item.subjects.includes(s))
  );
}

function sortByPopularity(items: any[]): any[] {
  return items.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
}

function sortByRating(items: any[]): any[] {
  return items.sort((a, b) => {
    const aRating = a.rating?.average || 0;
    const bRating = b.rating?.average || 0;
    return bRating - aRating;
  });
}

function sortByDuration(items: any[]): any[] {
  return items.sort((a, b) => (a.duration_in_minutes || 0) - (b.duration_in_minutes || 0));
}

function contains(hay: unknown, needle: string): boolean {
  if (!hay || typeof hay !== "string") return false;
  return hay.toLowerCase().includes(needle.toLowerCase());
}

function maybeLimit<T>(arr: T[], max?: number): T[] {
  if (!max || max <= 0) return arr;
  return arr.slice(0, max);
}

// ---------------------------------------------------------------------------
// Scraper helpers
// ---------------------------------------------------------------------------

/**
 * Construye la URL base del módulo a partir de firstUnitUrl.
 * Ej: https://.../modules/configure-storage-accounts/1-introduction/?WT.mc_id=api_CatalogApi
 * -> base: https://.../modules/configure-storage-accounts
 */
function deriveModuleBase(firstUnitUrl: string): string {
  const urlNoQuery = firstUnitUrl.split("?")[0];
  // Para URLs como https://learn.microsoft.com/en-us/training/modules/configure-storage-accounts/1-introduction/
  // queremos: https://learn.microsoft.com/en-us/training/modules/configure-storage-accounts
  const match = urlNoQuery.match(/^(.*\/modules\/[^\/]+)/);
  if (match) {
    return match[1];
  }
  // Fallback: remover la última parte
  const parts = urlNoQuery.split("/");
  parts.pop();
  return parts.join("/");
}

/**
 * Construye URLs de unidades eliminando prefijo 'learn.wwl.' y normalizando slugs
 * Basado en análisis del JSON: las units tienen formato learn.wwl.module-name.unit-name
 */
function unitSlugFromUid(uid: string): string {
  // Remove learn.wwl. prefix if present (as observed in JSON structure)
  let cleaned = uid.replace(/^learn\.wwl\./, "");
  
  // Remove module prefix to get just the unit name
  // Example: deploy-device-data-protection.introduction -> introduction
  const lastPart = cleaned.includes('.') ? cleaned.split(".").pop() ?? cleaned : cleaned;
  
  return normalizeSlug(lastPart);
}

/** Normaliza a patrón web similar al de Microsoft Learn */
function normalizeSlug(s: string): string {
  return s.toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Construye URL de Learning Path basándose en firstModuleUrl
 * Similar a deriveModuleBase pero para learning paths
 */
function deriveLearningPathBase(firstModuleUrl: string): string {
  const urlNoQuery = firstModuleUrl.split("?")[0];
  const match = urlNoQuery.match(/^(.*\/paths\/[^\/]+)/);
  if (match) {
    return match[1];
  }
  // Fallback
  const parts = urlNoQuery.split("/");
  parts.pop();
  return parts.join("/");
}

/** Intenta detectar un título legible en la página de la unidad. */
function detectUnitTitle($: cheerio.CheerioAPI): string | undefined {
  const candidates = ["main h1", "article h1", ".unit-title", "header h1", "h1"];
  for (const sel of candidates) {
    const t = $(sel).first().text().trim();
    if (t) return t;
  }
  const og = $('meta[property="og:title"]').attr("content")?.trim();
  if (og) return og;
  return undefined;
}

/** Devuelve un extracto de texto limpio (opcional) */
function extractBodyText($: cheerio.CheerioAPI, maxChars = 20000): string {
  const root = $("main").html() || $("article").html() || $("body").html() || "";
  const text = htmlToText(root || "", {
    wordwrap: false,
    preserveNewlines: true,
    selectors: [
      { selector: "nav", format: "skip" },
      { selector: "header", format: "skip" },
      { selector: "footer", format: "skip" },
      { selector: "script", format: "skip" },
      { selector: "style", format: "skip" }
    ]
  }).trim();
  return text.length > maxChars ? text.slice(0, maxChars) + "…" : text;
}

const limit = pLimit(4);

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------
const server = new McpServer({
  name: "mcp-learn-catalog",
  version: "2.0.0"
});

// ---------------------------------------------------------------------------
// Tool: listCatalog
// ---------------------------------------------------------------------------
server.tool(
  "listCatalog",
  "List Microsoft Learn objects by type (modules, units, learningPaths, appliedSkills, certifications, mergedCertifications, exams, courses, levels, roles, products, subjects).",
  {
    type: z.enum([
      "modules",
      "units",
      "learningPaths",
      "appliedSkills",
      "certifications",
      "mergedCertifications",
      "exams",
      "courses",
      "levels",
      "roles",
      "products",
      "subjects"
    ]),
    locale: z.string().default(DEFAULT_LOCALE).describe("Locale like en-us, es-es"),
    max_results: z.number().int().min(1).optional()
  },
  async ({ type, locale, max_results }) => {
    const data = await fetchCatalog({ type, locale });
    const items = Array.isArray(data?.[type]) ? data[type] : [];
    const out = maybeLimit(items, max_results);

    return {
      content: [
        { type: "text", text: JSON.stringify({ type, count: out.length, items: out }, null, 2) }
      ]
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: searchCatalog
// ---------------------------------------------------------------------------
server.tool(
  "searchCatalog",
  "Search Microsoft Learn Catalog via API filters and optional free-text q over title/summary.",
  {
    type: z
      .string()
      .optional()
      .describe("Comma-separated: modules,units,learningPaths,appliedSkills,certifications,mergedCertifications,exams,courses"),
    locale: z.string().default(DEFAULT_LOCALE),
    level: z.string().optional().describe("Comma-separated levels (e.g., beginner, intermediate, advanced)"),
    role: z.string().optional().describe("Comma-separated roles"),
    product: z.string().optional().describe("Comma-separated products (use exact IDs from products list)"),
    subject: z.string().optional().describe("Comma-separated subjects"),
    popularity: z.string().optional().describe("Operator and value, e.g., 'gte 0.5', 'gt 0.8', 'lte 0.2'"),
    last_modified: z.string().optional().describe("Operator and ISO date, e.g., 'gte 2024-01-01'"),
    q: z.string().optional().describe("Free text search on title and summary (client-side)."),
    max_results: z.number().int().min(1).optional()
  },
  async (args) => {
    const { q, max_results, ...raw } = args;
    const data = await fetchCatalog(raw as Record<string, string | undefined>);
    const types = (raw.type?.split(",") ?? [
      "modules",
      "learningPaths",
      "appliedSkills",
      "certifications",
      "mergedCertifications",
      "exams",
      "courses",
      "units"
    ]) as (keyof typeof data)[];

    let results: any[] = [];
    for (const t of types) {
      const arr = Array.isArray(data?.[t]) ? (data[t] as any[]) : [];
      results = results.concat(
        q ? arr.filter((x) => contains(x?.title, q) || contains(x?.summary, q) || contains(x?.subtitle, q)) : arr
      );
    }

    const out = maybeLimit(results, max_results);
    return {
      content: [{ type: "text", text: JSON.stringify({ count: out.length, items: out }, null, 2) }]
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: findByProduct
// ---------------------------------------------------------------------------
server.tool(
  "findByProduct",
  "Find all learning content related to specific Microsoft products (Azure, M365, Power Platform, etc.)",
  {
    products: z.string().describe("Comma-separated product names (e.g., 'azure', 'm365', 'power-platform')"),
    content_type: z.enum(["modules", "learningPaths", "certifications", "all"]).default("all"),
    level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    sort_by: z.enum(["popularity", "rating", "duration", "recent"]).default("popularity"),
    max_results: z.number().int().min(1).default(20)
  },
  async ({ products, content_type, level, sort_by, max_results }) => {
    const productList = products.split(",").map(p => p.trim());
    const types = content_type === "all" ? ["modules", "learningPaths", "certifications"] : [content_type];
    
    let allResults: any[] = [];
    
    for (const type of types) {
      const data = await fetchCatalog({ type });
      const items = Array.isArray(data?.[type]) ? data[type] : [];
      
      let filtered = filterByProduct(items, productList);
      if (level) {
        filtered = filterByLevel(filtered, [level]);
      }
      
      allResults = allResults.concat(filtered);
    }
    
    // Sort results
    switch (sort_by) {
      case "popularity":
        allResults = sortByPopularity(allResults);
        break;
      case "rating":
        allResults = sortByRating(allResults);
        break;
      case "duration":
        allResults = sortByDuration(allResults);
        break;
      case "recent":
        allResults = allResults.sort((a, b) => 
          new Date(b.last_modified || 0).getTime() - new Date(a.last_modified || 0).getTime()
        );
        break;
    }
    
    const results = allResults.slice(0, max_results);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          products: productList,
          content_type,
          level,
          sort_by,
          count: results.length,
          total_found: allResults.length,
          results
        }, null, 2)
      }]
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: findCertificationPath
// ---------------------------------------------------------------------------
server.tool(
  "findCertificationPath",
  "Find certification requirements and related learning paths for Microsoft certifications",
  {
    certification_code: z.string().describe("Certification code (e.g., 'AZ-104', 'AZ-900', 'MS-900')"),
    include_prerequisites: z.boolean().default(true),
    include_study_materials: z.boolean().default(true)
  },
  async ({ certification_code, include_prerequisites, include_study_materials }) => {
    // Search for certification
    const certData = await fetchCatalog({ type: "certifications" });
    const certifications = Array.isArray(certData?.certifications) ? certData.certifications : [];
    
    const cert = certifications.find((c: any) => 
      c.title?.includes(certification_code) || 
      c.uid?.includes(certification_code.toLowerCase())
    );
    
    if (!cert) {
      return {
        content: [{
          type: "text", 
          text: JSON.stringify({ 
            error: `Certification ${certification_code} not found`,
            available_certifications: certifications.slice(0, 10).map((c: any) => ({
              uid: c.uid,
              title: c.title
            }))
          }, null, 2)
        }]
      };
    }
    
    const result: any = {
      certification: cert,
      learning_path: null,
      related_modules: []
    };
    
    // Find related learning paths
    if (include_study_materials) {
      const pathData = await fetchCatalog({ type: "learningPaths" });
      const paths = Array.isArray(pathData?.learningPaths) ? pathData.learningPaths : [];
      
      result.learning_path = paths.find((p: any) => 
        p.title?.includes(certification_code) ||
        p.summary?.includes(certification_code)
      );
      
      // Find related modules
      const moduleData = await fetchCatalog({ type: "modules" });
      const modules = Array.isArray(moduleData?.modules) ? moduleData.modules : [];
      
      result.related_modules = modules.filter((m: any) =>
        m.title?.includes(certification_code) ||
        m.summary?.includes(certification_code) ||
        (cert.products && m.products && 
         cert.products.some((p: string) => m.products.includes(p)))
      ).slice(0, 10);
    }
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2)
      }]
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: getLearningPathDetails
// ---------------------------------------------------------------------------
server.tool(
  "getLearningPathDetails",
  "Get detailed information about a learning path including all modules and estimated completion time",
  {
    learning_path_uid: z.string().describe("Learning path UID"),
    include_module_details: z.boolean().default(true)
  },
  async ({ learning_path_uid, include_module_details }) => {
    const data = await fetchCatalog({ uid: learning_path_uid, type: "learningPaths" });
    
    if (!data?.learningPaths || data.learningPaths.length === 0) {
      throw new Error(`Learning path ${learning_path_uid} not found`);
    }
    
    const learningPath = data.learningPaths[0];
    const result: any = { learning_path: learningPath };
    
    if (include_module_details && learningPath.modules) {
      const moduleUids = learningPath.modules.join(",");
      const moduleData = await fetchCatalog({ uid: moduleUids, type: "modules" });
      result.modules = moduleData?.modules || [];
      
      // Calculate total duration
      const totalDuration = result.modules.reduce((sum: number, module: any) => 
        sum + (module.duration_in_minutes || 0), 0
      );
      result.total_duration_minutes = totalDuration;
      result.estimated_hours = Math.round(totalDuration / 60 * 100) / 100;
    }
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2)
      }]
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: scrapeLearningPath  
// ---------------------------------------------------------------------------
server.tool(
  "scrapeLearningPath",
  "Scrape content from all modules in a learning path",
  {
    learning_path_uid: z.string().describe("Learning path UID"),
    max_modules: z.number().int().min(1).optional().describe("Maximum number of modules to scrape"),
    max_units_per_module: z.number().int().min(1).default(5).describe("Maximum units per module"),
    with_text_excerpt: z.boolean().default(false),
    max_chars_excerpt: z.number().int().default(1000)
  },
  async (args) => {
    const { learning_path_uid, max_modules, max_units_per_module, with_text_excerpt, max_chars_excerpt } = args;
    
    // Get learning path details
    const pathData = await fetchCatalog({ uid: learning_path_uid, type: "learningPaths" });
    
    if (!pathData?.learningPaths || pathData.learningPaths.length === 0) {
      throw new Error(`Learning path ${learning_path_uid} not found`);
    }
    
    const learningPath = pathData.learningPaths[0];
    const moduleUids = learningPath.modules || [];
    
    if (moduleUids.length === 0) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ 
            learning_path: learningPath,
            error: "No modules found in learning path"
          }, null, 2)
        }]
      };
    }
    
    // Limit modules if specified
    const targetModules = max_modules ? moduleUids.slice(0, max_modules) : moduleUids;
    
    // Get module details
    const moduleData = await fetchCatalog({ uid: targetModules.join(","), type: "modules" });
    const modules = moduleData?.modules || [];
    
    // Scrape each module
    const moduleResults = await Promise.all(
      modules.map(async (module: any) => {
        try {
          // Manually call scrapeModuleUnits logic instead of server.request
          const base = deriveModuleBase(module.firstUnitUrl);
          const units = module.units || [];
          
          const pairs = units.map((unitUid: string, idx: number) => {
            const slug = unitSlugFromUid(unitUid);
            const index = idx + 1;
            const url = `${base}/${index}-${slug}/`;
            return { index, uid: unitUid, slug, url };
          });

          const target = max_units_per_module ? pairs.slice(0, max_units_per_module) : pairs;

          const unitResults = await Promise.all(
            target.map(({ index, uid, slug, url }: { index: number; uid: string; slug: string; url: string }) =>
              limit(async () => {
                const res = await fetch(url, {
                  headers: { "User-Agent": "mcp-learn-catalog-scraper/2.0" }
                });
                if (!res.ok) {
                  return { index, uid, slug, url, ok: false, status: res.status, title: null };
                }
                const html = await res.text();
                const $ = cheerio.load(html);
                const title = detectUnitTitle($) ?? slug.replace(/-/g, " ");
                const item: any = { index, uid, slug, url, ok: true, title };
                if (with_text_excerpt) {
                  item.text_excerpt = extractBodyText($, max_chars_excerpt);
                }
                return item;
              })
            )
          );
          
          return {
            module_info: module,
            scraped_content: {
              base,
              count: unitResults.length,
              units: unitResults
            }
          };
        } catch (error) {
          return {
            module_info: module,
            error: error instanceof Error ? error.message : "Unknown error"
          };
        }
      })
    );
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          learning_path: learningPath,
          total_modules: moduleUids.length,
          scraped_modules: targetModules.length,
          results: moduleResults
        }, null, 2)
      }]
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: getDetail
// ---------------------------------------------------------------------------
server.tool(
  "getDetail",
  "Fetch one or more catalog objects by exact uid (case-sensitive per API). Works across content types.",
  {
    uid: z.string().describe("Comma-separated one or more UIDs"),
    locale: z.string().default(DEFAULT_LOCALE),
    type: z.string().optional().describe("Optional comma-separated filter to narrow API response")
  },
  async ({ uid, locale, type }) => {
    const data = await fetchCatalog({ uid, locale, type });

    const aggregates: Record<string, any[]> = {};
    for (const key of Object.keys(data ?? {})) {
      if (Array.isArray((data as any)[key])) {
        const arr = (data as any)[key] as any[];
        if (arr.length > 0) aggregates[key] = arr;
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ uid: uid.split(","), results: aggregates }, null, 2)
        }
      ]
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: scrapeModuleUnits
// ---------------------------------------------------------------------------
server.tool(
  "scrapeModuleUnits",
  "Dado un module (o {firstUnitUrl, units}), construye URLs N-slug, scrapea y devuelve 'numero + titulo' con metadatos.",
  {
    module: z
      .object({
        uid: z.string(),
        firstUnitUrl: z.string(),
        units: z.array(z.string()),
        number_of_children: z.number().int().optional()
      })
      .optional(),
    firstUnitUrl: z.string().optional(),
    units: z.array(z.string()).optional(),
    with_text_excerpt: z.boolean().default(false),
    max_chars_excerpt: z.number().int().default(800),
    max_units: z.number().int().optional()
  },
  async (args) => {
    const firstUnitUrl = args.module?.firstUnitUrl ?? args.firstUnitUrl;
    const units = args.module?.units ?? args.units;

    if (!firstUnitUrl || !units || units.length === 0) {
      throw new Error(
        "Faltan datos. Debes enviar {module:{firstUnitUrl, units}} o bien {firstUnitUrl, units}."
      );
    }

    const base = deriveModuleBase(firstUnitUrl);

    // Construir N-slug a partir de UID de unidad (tratando prefijo learn.wwl y normalizando slug)
    const pairs = units.map((unitUid, idx) => {
      const slug = unitSlugFromUid(unitUid);
      const index = idx + 1; // 1-based
      // Construir URL correcta: base + / + numero + - + slug + /
      const url = `${base}/${index}-${slug}/`;
      return { index, uid: unitUid, slug, url };
    });

    const target = args.max_units ? pairs.slice(0, Math.max(0, args.max_units)) : pairs;

    const results = await Promise.all(
      target.map(({ index, uid, slug, url }) =>
        limit(async () => {
          const res = await fetch(url, {
            headers: { "User-Agent": "mcp-learn-catalog-scraper/1.0" }
          });
          if (!res.ok) {
            return { index, uid, slug, url, ok: false, status: res.status, title: null };
          }
          const html = await res.text();
          const $ = cheerio.load(html);
          const title = detectUnitTitle($) ?? slug.replace(/-/g, " ");
          const item: any = { index, uid, slug, url, ok: true, title };
          if (args.with_text_excerpt) {
            item.text_excerpt = extractBodyText($, args.max_chars_excerpt);
          }
          return item;
        })
      )
    );

    const summaryLines = results.map((r: any) =>
      r.ok ? `${r.index}. ${r.title}` : `${r.index}. [ERROR ${r.status}] ${r.slug}`
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              base,
              count: results.length,
              lines: summaryLines,
              items: results
            },
            null,
            2
          )
        }
      ]
    };
  }
);

// ---------------------------------------------------------------------------
// Transport (stdio)
// ---------------------------------------------------------------------------
const transport = new StdioServerTransport();
server.connect(transport);

