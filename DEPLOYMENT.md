# MCP Learn Catalog Server - Deployment & VS Code Integration

## 🚀 Quick Deployment

### Docker Deployment (Recommended)
```bash
# Build and start the server
docker compose up -d

# Check status
docker ps
curl http://localhost:3023/health
```

### Local Development
```bash
# Build TypeScript
npm run build

# Start HTTP server
npm run dev:http

# Or start stdio server
npm run dev
```

## 🔧 Visual Studio Code Integration

### Option 1: HTTP Transport (Recommended for remote deployment)
Add this to your VS Code MCP configuration:

```json
{
  "mcpServers": {
    "mcp-learn-catalog": {
      "transport": {
        "type": "http",
        "url": "http://localhost:3023/mcp",
        "headers": {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "MCP-Protocol-Version": "2025-06-18"
        }
      }
    }
  }
}
```

### Option 2: Local stdio Transport
```json
{
  "mcpServers": {
    "mcp-learn-catalog": {
      "command": "node",
      "args": ["dist/server.js"],
      "cwd": "/home/dannybombastic/Documents/mcp-learn"
    }
  }
}
```

## 🛠️ Available Tools

1. **listCatalog** - List Microsoft Learn objects by type
2. **searchCatalog** - Search catalog with filters and text queries  
3. **getDetail** - Get detailed information by UID
4. **scrapeModuleUnits** - Extract content from learning modules

## 🌐 Remote Deployment

### With nginx proxy manager:
1. Deploy with docker-compose
2. Configure nginx proxy with your domain
3. Update VS Code config with your domain URL
4. Set ALLOWED_ORIGINS environment variable

### Example for production:
```bash
# Set environment variables
export ALLOWED_ORIGINS="*"
export PORT=3001

# Deploy
docker compose up -d
```

## 📋 Health Check
- Health: `GET /health`
- Info: `GET /`
- MCP Protocol: `POST /mcp`

## 🔐 Security
- CORS configured for all origins (`*`)
- Session management with UUIDs
- Request validation and error handling
- Security headers included

## 📖 Protocol Support
- MCP Protocol Version: 2025-06-18
- HTTP Streamable transport
- JSON-RPC 2.0 compliant
- Compatible with n8n, VS Code, and other MCP clients