# MCP Learn Catalog Server 📚

A dual-transport Model Context Protocol (MCP) server that provides access to Microsoft Learn's catalog API. Available as both **stdio** (for local development) and **HTTP** (for remote deployment and n8n integration) transports.

## 🚀 Features

- **Dual Transport Support**: stdio (local) and HTTP (remote/web) transports
- **n8n Compatible**: HTTP server ready for automation workflows
- **VS Code Integration**: Works seamlessly with VS Code MCP extension
- **Microsoft Learn API**: Complete access to courses, modules, learning paths
- **Docker Ready**: Containerized for easy deployment
- **Search & Filter**: Advanced search with multiple filter options
- **Content Scraping**: Extract detailed content from learning modules
- **Session Management**: Secure HTTP session handling
- **CORS Support**: Configurable cross-origin resource sharing

## � Available Tools

1. **listCatalog** - List Microsoft Learn objects by type
2. **searchCatalog** - Search the catalog with filters and text queries  
3. **getDetail** - Get detailed information about specific content
4. **scrapeModuleUnits** - Extract content from learning module units

## 🔧 Installation & Setup

### Prerequisites
- Node.js >= 20.0.0
- npm or yarn

### Local Development (stdio)

```bash
# Clone and setup
git clone <repository-url>
cd mcp-learn
npm install
npm run build

# Run stdio server
npm start
```

### Production Deployment (HTTP)

```bash
# Build and run with Docker
docker-compose up -d

# Or run manually
npm install
npm run build
npm run start:http
```

## 🌐 Transport Options

### 1. stdio Transport (Local Development)

Perfect for VS Code MCP extension and local development:

**VS Code Configuration** (`~/.config/Code/User/mcp.json`):
```json
{
  "mcpServers": {
    "learn-catalog": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-learn/dist/server.js"],
      "description": "Microsoft Learn Catalog Server (stdio)"
    }
  }
}
```

### 2. HTTP Transport (Remote/Production)

For web deployment, n8n integration, and remote access:

- **Live Server**: `https://mcp-learn-catalog.devspn.tech/`
- **Endpoint**: `POST /mcp`
- **Protocol**: MCP over HTTP (JSON-RPC 2.0)
- **Headers**: `Content-Type: application/json`, `Accept: application/json`
- **Session Management**: Via `Mcp-Session-Id` header

**VS Code Configuration** (HTTP):
```json
{
  "mcpServers": {
    "learn-catalog-http": {
      "transport": {
        "type": "http",
        "uri": "https://mcp-learn-catalog.devspn.tech/mcp"
      },
      "description": "Microsoft Learn Catalog Server (HTTP)"
    }
  }
}
```

## 🎯 Integration Examples

### VS Code MCP Extension

Complete configuration supporting both transports:

```json
{
  "mcpServers": {
    "learn-catalog": {
      "command": "node",
      "args": ["/home/user/Documents/mcp-learn/dist/server.js"],
      "description": "Microsoft Learn Catalog (Local)"
    },
    "learn-catalog-http": {
      "transport": {
        "type": "http",
        "uri": "https://mcp-learn-catalog.devspn.tech/mcp"
      },
      "description": "Microsoft Learn Catalog (Remote)"
    }
  }
}
```

### n8n Workflow Integration

Use the HTTP transport in n8n:

#### 1. Initialize Session
```javascript
// HTTP Request Node 1 - Initialize
POST https://mcp-learn-catalog.devspn.tech/mcp
Headers: Content-Type: application/json

Body:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-06-18",
    "clientInfo": {"name": "n8n", "version": "1.0.0"},
    "capabilities": {}
  }
}
```

#### 2. Use Tools
```javascript
// HTTP Request Node 2 - Call Tool
POST https://mcp-learn-catalog.devspn.tech/mcp
Headers: 
  Content-Type: application/json
  Mcp-Session-Id: {{session_id_from_step_1}}

Body:
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "searchCatalog",
    "arguments": {
      "q": "Azure Functions",
      "type": "modules",
      "max_results": 5
    }
  }
}
```

### Docker Deployment

```yaml
# docker-compose.yml
version: '3.8'
services:
  mcp-learn-catalog:
    build: .
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - NODE_ENV=production
      - ALLOWED_ORIGINS=https://your-n8n-domain.com,http://localhost:3000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## � API Reference

### listCatalog

List Microsoft Learn content by type.

**Parameters:**
- `type` (required): Content type (modules, learningPaths, certifications, etc.)
- `locale` (optional): Language locale (default: en-us)
- `max_results` (optional): Maximum number of results

**Example:**
```json
{
  "name": "listCatalog",
  "arguments": {
    "type": "modules",
    "max_results": 5
  }
}
```

**Response Format:**
```json
[
  {
    "title": "Deploy device data protection",
    "content": "This module describes how you can use Intune...",
    "contentUrl": "https://learn.microsoft.com/en-us/training/modules/..."
  }
]
```

### searchCatalog

Search through the Microsoft Learn catalog with advanced filters.

**Parameters:**
- `type` (optional): Comma-separated content types
- `q` (optional): Free text search query
- `level` (optional): Difficulty level (beginner, intermediate, advanced)
- `role` (optional): Target role filter
- `product` (optional): Microsoft product filter
- `subject` (optional): Subject area filter
- `popularity` (optional): Popularity filter (e.g., "gte 0.5")
- `last_modified` (optional): Date filter (e.g., "gte 2024-01-01")
- `max_results` (optional): Maximum results to return

**Example:**
```json
{
  "name": "searchCatalog",
  "arguments": {
    "q": "Azure Functions",
    "type": "modules",
    "level": "intermediate",
    "max_results": 3
  }
}
```

### getDetail

Get detailed information about specific content by UID.

**Parameters:**
- `uid` (required): Comma-separated UIDs
- `locale` (optional): Language locale
- `type` (optional): Content type filter

**Example:**
```json
{
  "name": "getDetail",
  "arguments": {
    "uid": "learn.wwl.develop-azure-functions"
  }
}
```

**Response Format:**
```markdown
# Modules

## Develop Azure Functions

Learn how to create and deploy Azure Functions.

URL: https://learn.microsoft.com/en-us/training/modules/develop-azure-functions/
```

### scrapeModuleUnits

Extract detailed content from learning module units.

**Parameters:**
- `module` (optional): Module object with uid, firstUnitUrl, units
- `firstUnitUrl` (optional): Direct URL to first unit
- `units` (optional): Array of unit UIDs
- `with_text_excerpt` (optional): Include text content (default: false)
- `max_chars_excerpt` (optional): Maximum text length (default: 800)
- `max_units` (optional): Maximum units to process

**Example:**
```json
{
  "name": "scrapeModuleUnits",
  "arguments": {
    "firstUnitUrl": "https://learn.microsoft.com/en-us/training/modules/develop-azure-functions/1-introduction/",
    "units": ["learn.wwl.develop-azure-functions.introduction"],
    "with_text_excerpt": true,
    "max_units": 3
  }
}
```

## 🔍 Response Format

All tools return responses in Microsoft-compatible format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "[JSON array of results or markdown content]"
    }
  ]
}
```

Response formats match Microsoft MCP tools:
- **listCatalog/searchCatalog**: Similar to `microsoft_docs_search` (array of objects)
- **getDetail**: Similar to `microsoft_docs_fetch` (structured markdown)
- **scrapeModuleUnits**: Similar to `microsoft_code_sample_search` (code snippets format)

## 🛠️ Development

### Available Scripts

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run stdio server (development)
npm start
npm run dev

# Run HTTP server (production)
npm run start:http

# Type checking
npm run check

# Docker development
docker-compose up --build
```

### Project Structure

```
mcp-learn/
├── src/
│   ├── server.ts              # stdio MCP server
│   ├── http-server.ts         # HTTP MCP server
│   └── types/
│       └── html-to-text.d.ts  # Type definitions
├── dist/                      # Compiled JavaScript
├── Dockerfile                 # Docker configuration
├── docker-compose.yml         # Docker Compose setup
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## � Security & CORS

The HTTP server includes:
- **CORS Configuration**: Configurable origins via `ALLOWED_ORIGINS` environment variable
- **Security Headers**: Content-Type validation, XSS protection, frame options
- **Session Management**: Secure session handling with automatic cleanup
- **Input Validation**: Zod schema validation for all parameters
- **Rate Limiting**: Built-in concurrency control

## 🌍 Environment Variables

```bash
# Server Configuration
PORT=3001                     # HTTP server port
NODE_ENV=production          # Environment mode

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://your-n8n-domain.com

# Session Configuration (optional)
SESSION_TIMEOUT=3600000      # 1 hour in milliseconds
```

## 🚀 Deployment Options

### 1. Local Development
- Use stdio transport with VS Code
- Direct Node.js execution
- Full debugging capabilities

### 2. Docker Container
- Production-ready containerization
- Multi-stage build optimization
- Health checks included
- Automatic session cleanup

### 3. Cloud Deployment
- Compatible with any Node.js hosting
- Environment variable configuration
- Horizontal scaling support
- SSL/TLS termination ready

### 4. Homelab/Self-hosted
- Docker Compose setup
- Reverse proxy compatible (nginx, traefik)
- Let's Encrypt SSL support
- Resource monitoring included

## 🧪 Testing the Server

### Health Check (HTTP)
```bash
curl https://mcp-learn-catalog.devspn.tech/health
```

### Basic Tool Test (HTTP)
```bash
# Initialize session
curl -X POST https://mcp-learn-catalog.devspn.tech/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","clientInfo":{"name":"test","version":"1.0.0"},"capabilities":{}}}'

# Call tool (use session ID from above)
curl -X POST https://mcp-learn-catalog.devspn.tech/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"searchCatalog","arguments":{"q":"Azure","max_results":2}}}'
```

## 🎯 Use Cases

### Extract AZ-104 Certification Content
```javascript
// Search for AZ-104 certification
searchCatalog({
  q: "AZ-104",
  type: "certifications,learningPaths,modules"
})

// Extract content from specific modules
scrapeModuleUnits({
  firstUnitUrl: "https://learn.microsoft.com/en-us/training/modules/configure-storage-accounts/1-introduction/",
  units: ["introduction", "implement-azure-storage"],
  max_chars_excerpt: 25000,
  with_text_excerpt: true
})
```

### n8n Learning Automation
```javascript
// Create automated learning content workflows
// 1. Search for latest Azure modules
// 2. Extract content summaries
// 3. Generate study guides
// 4. Send to notification systems
```

### VS Code Study Assistant
```javascript
// Directly within VS Code:
// 1. Search certification requirements
// 2. Extract module content
// 3. Create personalized study notes
// 4. Track learning progress
```

## 🔍 Advanced Features

### Intelligent Content Extraction
- **Table Extraction**: Automatically extracts comparison tables and specifications
- **Smart URL Construction**: Builds valid URLs for Microsoft Learn units
- **Flexible Unit Naming**: Supports both simple names and full UIDs
- **Automatic Prefix Removal**: Strips `learn.wwl.` prefixes intelligently
- **Configurable Limits**: Extract up to 25,000 characters per unit

### Session Management (HTTP)
- **Automatic Session Creation**: On initialize method
- **Session Cleanup**: Automatic cleanup after 1 hour
- **Concurrent Session Support**: Multiple clients simultaneously
- **Session Persistence**: Maintains state across requests

### CORS & Security
- **Flexible CORS**: Environment-configurable origins
- **Security Headers**: XSS protection, content-type validation
- **Input Validation**: Zod schemas for all parameters
- **Error Handling**: Comprehensive error responses

## 📊 Microsoft Learn API Integration

This server integrates with:
- **Microsoft Learn Catalog API**: For search and metadata
- **Microsoft Learn Web Content**: For content extraction
- **Multiple Locales**: International support (en-us, es-es, etc.)
- **Real-time Data**: Direct API access for latest content

## 🚨 Limitations & Considerations

- **Rate Limiting**: Microsoft Learn may apply rate limits
- **Content Structure**: Scraping depends on current HTML structure
- **Session Timeout**: HTTP sessions expire after 1 hour
- **CORS Restrictions**: Configure allowed origins properly
- **Memory Usage**: Large content extraction may require adequate RAM

## 📞 Support & Compatibility

- **MCP Protocol**: 2025-06-18
- **Node.js**: 20+ recommended
- **Transport**: stdio and HTTP
- **Clients**: VS Code MCP extension, n8n, any MCP-compatible client
- **API**: Microsoft Learn Catalog API
- **Docker**: Multi-stage builds with Node.js 20 Alpine

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Useful Links

- [Microsoft Learn](https://learn.microsoft.com)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Live HTTP Server](https://mcp-learn-catalog.devspn.tech/)
- [VS Code MCP Extension](https://marketplace.visualstudio.com/items?itemName=ClaudeAI.claude-dev)

---

**Made with ❤️ to facilitate Microsoft Azure learning and automation!** 🚀