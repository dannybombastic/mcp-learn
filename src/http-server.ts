import express, { Request, Response } from 'express';
import cors from 'cors';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as cheerio from "cheerio";
import pLimit from "p-limit";
import { htmlToText } from "html-to-text";
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const BASE_CATALOG = "https://learn.microsoft.com/api/catalog/";
const DEFAULT_LOCALE = "en-us";
const PORT = process.env.PORT || 3001;
const MCP_PROTOCOL_VERSION = "2025-06-18";

// ---------------------------------------------------------------------------
// Types for MCP HTTP Transport
// ---------------------------------------------------------------------------
interface McpSession {
  id: string;
  server: McpServer;
  initialized: boolean;
  createdAt: Date;
}

interface McpHttpError {
  error: {
    code: number;
    message: string;
    data?: any;
  };
}

interface McpRequest {
  jsonrpc: string;
  id?: number | string;
  method: string;
  params?: any;
}

interface McpResponse {
  jsonrpc: string;
  id?: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface McpNotification {
  jsonrpc: string;
  method: string;
  params?: any;
}

// ---------------------------------------------------------------------------
// Helpers comunes (igual que el servidor stdio)
// ---------------------------------------------------------------------------
async function fetchCatalog(params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && v.length > 0) usp.set(k, v);
  }
  const url = usp.toString() ? `${BASE_CATALOG}?${usp.toString()}` : BASE_CATALOG;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "mcp-learn-catalog-http/1.0 (+https://learn.microsoft.com/api/catalog/)"
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
// Scraper helpers (igual que el servidor stdio)
// ---------------------------------------------------------------------------
function deriveModuleBase(firstUnitUrl: string): string {
  const urlNoQuery = firstUnitUrl.split("?")[0];
  const match = urlNoQuery.match(/^(.*\/modules\/[^\/]+)/);
  if (match) {
    return match[1];
  }
  const parts = urlNoQuery.split("/");
  parts.pop();
  return parts.join("/");
}

function unitSlugFromUid(uid: string): string {
  let cleaned = uid.replace(/^learn\.wwl\./, "");
  const lastPart = cleaned.includes('.') ? cleaned.split(".").pop() ?? cleaned : cleaned;
  return normalizeSlug(lastPart);
}

function normalizeSlug(s: string): string {
  const lower = s.toLowerCase();
  const replaced = lower
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return replaced;
}

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
// Session Management
// ---------------------------------------------------------------------------
const sessions = new Map<string, McpSession>();

function createSession(): McpSession {
  const sessionId = randomUUID();
  const server = createMcpServer();
  
  const session: McpSession = {
    id: sessionId,
    server,
    initialized: false,
    createdAt: new Date()
  };
  
  sessions.set(sessionId, session);
  
  // Clean up sessions after 1 hour
  setTimeout(() => {
    sessions.delete(sessionId);
  }, 60 * 60 * 1000);
  
  return session;
}

function getSession(sessionId: string): McpSession | undefined {
  return sessions.get(sessionId);
}

// ---------------------------------------------------------------------------
// MCP Server Factory (para crear instancias por sesión)
// ---------------------------------------------------------------------------
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "mcp-learn-catalog",
    version: "1.1.0"
  });

  // Tool: listCatalog - adaptado al formato Microsoft
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

      // Formato similar a microsoft_docs_search (array de objetos)
      const formattedItems = out.map((item: any) => ({
        title: item.title || item.displayName || item.name || "Unknown",
        content: item.summary || item.description || "No description available",
        contentUrl: item.url || `https://learn.microsoft.com/en-us/training/${type}/${item.uid || item.id || 'unknown'}`
      }));

      return {
        content: [
          { type: "text", text: JSON.stringify(formattedItems, null, 2) }
        ]
      };
    }
  );

  // Tool: searchCatalog - adaptado al formato Microsoft  
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

      // Formato similar a microsoft_docs_search
      const formattedResults = out.map((item: any) => ({
        title: item.title || item.displayName || item.name || "Unknown",
        content: item.summary || item.description || "No description available",
        contentUrl: item.url || `https://learn.microsoft.com/en-us/training/${item.type || 'modules'}/${item.uid || item.id || 'unknown'}`
      }));

      return {
        content: [
          { type: "text", text: JSON.stringify(formattedResults, null, 2) }
        ]
      };
    }
  );

  // Tool: getDetail - adaptado al formato Microsoft
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

      // Formato similar a microsoft_docs_fetch (texto completo estructurado)
      const formattedContent = Object.entries(aggregates)
        .map(([type, items]) => {
          return `# ${type.charAt(0).toUpperCase() + type.slice(1)}\n\n${items.map((item: any) => {
            return `## ${item.title || item.displayName || 'Unknown'}\n\n${item.summary || item.description || 'No description available'}\n\nURL: ${item.url || 'No URL available'}\n`;
          }).join('\n')}`;
        })
        .join('\n\n');

      return {
        content: [
          { type: "text", text: formattedContent }
        ]
      };
    }
  );

  // Tool: scrapeModuleUnits - adaptado al formato Microsoft
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

      const pairs = units.map((unitUid, idx) => {
        const slug = unitSlugFromUid(unitUid);
        const index = idx + 1;
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

      // Formato similar a microsoft_code_sample_search
      const formattedResults = results.map((r: any) => ({
        description: r.ok ? `${r.index}. ${r.title}` : `${r.index}. [ERROR ${r.status}] ${r.slug}`,
        codeSnippet: r.text_excerpt || "No content available",
        link: r.url,
        language: "markdown"
      }));

      return {
        content: [
          { type: "text", text: JSON.stringify(formattedResults, null, 2) }
        ]
      };
    }
  );

  return server;
}

// ---------------------------------------------------------------------------
// Express App Setup
// ---------------------------------------------------------------------------
const app = express();

// CORS configuration for production/homelab deployment
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // Get allowed origins from environment variable or use defaults
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : [
          'http://localhost:3000',
          'http://localhost:8080', 
          'https://localhost:3000',
          'https://localhost:8080',
          // Add your domain patterns here
          /^https?:\/\/.*\.your-domain\.com$/,
          /^https?:\/\/n8n\./,
        ];
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'MCP-Protocol-Version', 'Mcp-Session-Id'],
}));

app.use(express.json());

// Security headers for MCP
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ---------------------------------------------------------------------------
// MCP Endpoint Implementation
// ---------------------------------------------------------------------------
app.post('/mcp', async (req: Request, res: Response) => {
  try {
    // Check required headers - be more flexible for VS Code compatibility
    const protocolVersion = req.headers['mcp-protocol-version'] as string;
    
    // Only check protocol version if it's provided (VS Code might not always send it)
    if (protocolVersion && protocolVersion !== MCP_PROTOCOL_VERSION) {
      return res.status(400).json({
        error: {
          code: -32600,
          message: `Unsupported protocol version: ${protocolVersion}`
        }
      });
    }

    // Validate Accept header for Streamable HTTP - be more flexible
    const acceptHeader = req.headers.accept as string;
    if (acceptHeader && 
        !acceptHeader.includes('application/json') && 
        !acceptHeader.includes('text/event-stream') &&
        !acceptHeader.includes('*/*')) {
      return res.status(400).json({
        error: {
          code: -32600,
          message: "Accept header must include application/json, text/event-stream, or */*"
        }
      });
    }

    const message = req.body as McpRequest | McpResponse | McpNotification;

    // Validate JSON-RPC
    if (!message.jsonrpc || message.jsonrpc !== "2.0") {
      return res.status(400).json({
        error: {
          code: -32600,
          message: "Invalid JSON-RPC message"
        }
      });
    }

    // Handle session management
    let sessionId = req.headers['mcp-session-id'] as string;
    let session: McpSession;

    if ('method' in message && message.method === 'initialize') {
      // Initialize new session
      session = createSession();
      sessionId = session.id;
    } else {
      // Use existing session
      if (!sessionId) {
        return res.status(400).json({
          error: {
            code: -32600,
            message: "Missing Mcp-Session-Id header"
          }
        });
      }
      
      const existingSession = getSession(sessionId);
      if (!existingSession) {
        return res.status(404).json({
          error: {
            code: -32600,
            message: "Session not found"
          }
        });
      }
      session = existingSession;
    }

    // Handle different message types
    if ('method' in message) {
      // This is a request or notification
      if ('id' in message && message.id !== undefined) {
        // This is a request - handle it
        const result = await handleMcpRequest(session, message as McpRequest);
        
        const response: McpResponse = {
          jsonrpc: "2.0",
          id: message.id,
          ...result
        };

        // For initialize method, include session ID in header
        if (message.method === 'initialize') {
          res.setHeader('Mcp-Session-Id', sessionId);
          session.initialized = true;
        }

        res.setHeader('Content-Type', 'application/json');
        res.json(response);
      } else {
        // This is a notification - handle and return 202
        await handleMcpNotification(session, message as McpNotification);
        res.status(202).send();
      }
    } else {
      // This is a response - handle and return 202
      res.status(202).send();
    }

  } catch (error) {
    console.error('MCP endpoint error:', error);
    res.status(500).json({
      error: {
        code: -32603,
        message: "Internal error",
        data: error instanceof Error ? error.message : String(error)
      }
    });
  }
});

// Handle GET requests for SSE (optional - for server-initiated messages)
app.get('/mcp', (req: Request, res: Response) => {
  const acceptHeader = req.headers.accept as string;
  if (!acceptHeader || !acceptHeader.includes('text/event-stream')) {
    return res.status(405).json({
      error: {
        code: -32601,
        message: "Method not allowed - use POST for MCP messages"
      }
    });
  }
  
  // For now, we don't support server-initiated SSE streams
  res.status(405).json({
    error: {
      code: -32601,
      message: "Server-initiated SSE streams not supported"
    }
  });
});

// DELETE endpoint for session termination
app.delete('/mcp', (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  if (sessionId && sessions.has(sessionId)) {
    sessions.delete(sessionId);
    res.status(200).send();
  } else {
    res.status(404).json({
      error: {
        code: -32600,
        message: "Session not found"
      }
    });
  }
});

// ---------------------------------------------------------------------------
// MCP Message Handlers
// ---------------------------------------------------------------------------
async function handleMcpRequest(session: McpSession, request: McpRequest): Promise<{ result?: any; error?: any }> {
  try {
    const { server } = session;
    
    switch (request.method) {
      case 'initialize':
        return {
          result: {
            protocolVersion: MCP_PROTOCOL_VERSION,
            serverInfo: {
              name: "mcp-learn-catalog",
              version: "1.1.0"
            },
            capabilities: {
              tools: {}
            }
          }
        };
        
      case 'tools/list':
        const tools = [
          {
            name: "listCatalog",
            description: "List Microsoft Learn objects by type",
            inputSchema: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["modules", "units", "learningPaths", "appliedSkills", "certifications", "mergedCertifications", "exams", "courses", "levels", "roles", "products", "subjects"]
                },
                locale: { type: "string", default: DEFAULT_LOCALE },
                max_results: { type: "number", minimum: 1 }
              },
              required: ["type"]
            }
          },
          {
            name: "searchCatalog", 
            description: "Search Microsoft Learn Catalog",
            inputSchema: {
              type: "object",
              properties: {
                type: { type: "string" },
                locale: { type: "string", default: DEFAULT_LOCALE },
                level: { type: "string" },
                role: { type: "string" },
                product: { type: "string" },
                subject: { type: "string" },
                popularity: { type: "string" },
                last_modified: { type: "string" },
                q: { type: "string" },
                max_results: { type: "number", minimum: 1 }
              }
            }
          },
          {
            name: "getDetail",
            description: "Fetch catalog objects by UID",
            inputSchema: {
              type: "object", 
              properties: {
                uid: { type: "string" },
                locale: { type: "string", default: DEFAULT_LOCALE },
                type: { type: "string" }
              },
              required: ["uid"]
            }
          },
          {
            name: "scrapeModuleUnits",
            description: "Scrape module units with content",
            inputSchema: {
              type: "object",
              properties: {
                module: {
                  type: "object",
                  properties: {
                    uid: { type: "string" },
                    firstUnitUrl: { type: "string" },
                    units: { type: "array", items: { type: "string" } },
                    number_of_children: { type: "number" }
                  }
                },
                firstUnitUrl: { type: "string" },
                units: { type: "array", items: { type: "string" } },
                with_text_excerpt: { type: "boolean", default: false },
                max_chars_excerpt: { type: "number", default: 800 },
                max_units: { type: "number" }
              }
            }
          }
        ];
        
        return { result: { tools } };
        
      case 'tools/call':
        if (!session.initialized) {
          return {
            error: {
              code: -32601,
              message: "Session not initialized"
            }
          };
        }
        
        const { name, arguments: args } = request.params;
        
        // Execute the tool using the MCP server
        const toolResult = await executeToolCall(session.server, name, args);
        return { result: toolResult };
        
      default:
        return {
          error: {
            code: -32601,
            message: `Method not found: ${request.method}`
          }
        };
    }
  } catch (error) {
    return {
      error: {
        code: -32603,
        message: "Internal error",
        data: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

async function handleMcpNotification(session: McpSession, notification: McpNotification): Promise<void> {
  // Handle notifications (methods without ID)
  console.log(`Received notification: ${notification.method}`);
}

async function executeToolCall(server: McpServer, toolName: string, args: any): Promise<any> {
  // This is a simplified tool execution - in a real implementation,
  // you'd need to properly integrate with the MCP server's tool system
  
  switch (toolName) {
    case 'listCatalog':
      return await callListCatalog(args);
    case 'searchCatalog':
      return await callSearchCatalog(args);
    case 'getDetail':
      return await callGetDetail(args);
    case 'scrapeModuleUnits':
      return await callScrapeModuleUnits(args);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Tool implementation functions (simplified versions)
async function callListCatalog(args: any) {
  const { type, locale = DEFAULT_LOCALE, max_results } = args;
  const data = await fetchCatalog({ type, locale });
  const items = Array.isArray(data?.[type]) ? data[type] : [];
  const out = maybeLimit(items, max_results);

  const formattedItems = out.map((item: any) => ({
    title: item.title || item.displayName || item.name || "Unknown",
    content: item.summary || item.description || "No description available", 
    contentUrl: item.url || `https://learn.microsoft.com/en-us/training/${type}/${item.uid}`
  }));

  return {
    content: [
      { type: "text", text: JSON.stringify(formattedItems, null, 2) }
    ]
  };
}

async function callSearchCatalog(args: any) {
  const { q, max_results, ...raw } = args;
  const data = await fetchCatalog(raw as Record<string, string | undefined>);
  const types = (raw.type?.split(",") ?? [
    "modules", "learningPaths", "appliedSkills", "certifications", 
    "mergedCertifications", "exams", "courses", "units"
  ]) as (keyof typeof data)[];

  let results: any[] = [];
  for (const t of types) {
    const arr = Array.isArray(data?.[t]) ? (data[t] as any[]) : [];
    results = results.concat(
      q ? arr.filter((x) => contains(x?.title, q) || contains(x?.summary, q) || contains(x?.subtitle, q)) : arr
    );
  }

  const out = maybeLimit(results, max_results);
  const formattedResults = out.map((item: any) => ({
    title: item.title || item.displayName || item.name || "Unknown",
    content: item.summary || item.description || "No description available",
    contentUrl: item.url || `https://learn.microsoft.com/en-us/training/${item.type || 'modules'}/${item.uid}`
  }));

  return {
    content: [
      { type: "text", text: JSON.stringify(formattedResults, null, 2) }
    ]
  };
}

async function callGetDetail(args: any) {
  const { uid, locale = DEFAULT_LOCALE, type } = args;
  const data = await fetchCatalog({ uid, locale, type });

  const aggregates: Record<string, any[]> = {};
  for (const key of Object.keys(data ?? {})) {
    if (Array.isArray((data as any)[key])) {
      const arr = (data as any)[key] as any[];
      if (arr.length > 0) aggregates[key] = arr;
    }
  }

  const formattedContent = Object.entries(aggregates)
    .map(([type, items]) => {
      return `# ${type.charAt(0).toUpperCase() + type.slice(1)}\n\n${items.map((item: any) => {
        return `## ${item.title || item.displayName || 'Unknown'}\n\n${item.summary || item.description || 'No description available'}\n\nURL: ${item.url || 'No URL available'}\n`;
      }).join('\n')}`;
    })
    .join('\n\n');

  return {
    content: [
      { type: "text", text: formattedContent }
    ]
  };
}

async function callScrapeModuleUnits(args: any) {
  const firstUnitUrl = args.module?.firstUnitUrl ?? args.firstUnitUrl;
  const units = args.module?.units ?? args.units;

  if (!firstUnitUrl || !units || units.length === 0) {
    throw new Error("Missing required data: firstUnitUrl and units are required");
  }

  const base = deriveModuleBase(firstUnitUrl);
  const pairs = units.map((unitUid: string, idx: number) => {
    const slug = unitSlugFromUid(unitUid);
    const index = idx + 1;
    const url = `${base}/${index}-${slug}/`;
    return { index, uid: unitUid, slug, url };
  });

  const target = args.max_units ? pairs.slice(0, Math.max(0, args.max_units)) : pairs;

  const results = await Promise.all(
    target.map(({ index, uid, slug, url }: any) =>
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

  const formattedResults = results.map((r: any) => ({
    description: r.ok ? `${r.index}. ${r.title}` : `${r.index}. [ERROR ${r.status}] ${r.slug}`,
    codeSnippet: r.text_excerpt || "No content available",
    link: r.url,
    language: "markdown"
  }));

  return {
    content: [
      { type: "text", text: JSON.stringify(formattedResults, null, 2) }
    ]
  };
}

// ---------------------------------------------------------------------------
// Health Check and Info Endpoints
// ---------------------------------------------------------------------------
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.1.0',
    protocol: MCP_PROTOCOL_VERSION
  });
});

app.get('/', (req: Request, res: Response) => {
  res.json({
    name: "MCP Learn Catalog Server",
    description: "HTTP-based MCP server for Microsoft Learn Catalog API",
    version: "1.1.0",
    protocol: MCP_PROTOCOL_VERSION,
    endpoints: {
      mcp: "/mcp",
      health: "/health"
    },
    compatibility: {
      n8n: true,
      microsoft_format: true
    }
  });
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 MCP Learn Catalog HTTP Server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`📖 Protocol version: ${MCP_PROTOCOL_VERSION}`);
  console.log(`🔗 Compatible with n8n and Microsoft MCP format`);
});

export default app;