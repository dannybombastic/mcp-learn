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
      "User-Agent": "mcp-learn-catalog/1.0 (+https://learn.microsoft.com/api/catalog/)"
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Catalog API error ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
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
 * Quita prefijo fijo 'learn.wwl.' del UID y toma la última parte tras el último punto como slug.
 * Luego normaliza: lowercase, reemplaza no [a-z0-9-] por '-', colapsa guiones y recorta.
 */
function unitSlugFromUid(uid: string): string {
  // Remove any learn.wwl. prefix if present
  let cleaned = uid.replace(/^learn\.wwl\./, "");
  
  // If it contains a dot, take everything after the last dot (final unit name)
  // Otherwise, use the entire string (already cleaned unit name)
  const lastPart = cleaned.includes('.') ? cleaned.split(".").pop() ?? cleaned : cleaned;
  
  return normalizeSlug(lastPart);
}

/** Normaliza a patrón web similar al de Microsoft Learn */
function normalizeSlug(s: string): string {
  // to lower, espacios -> '-', resto chars no permitidos -> '-', colapsa y trim
  const lower = s.toLowerCase();
  const replaced = lower
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return replaced;
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
  version: "1.1.0"
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

