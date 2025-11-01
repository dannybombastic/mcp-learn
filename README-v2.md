# MCP Learn Catalog Server v2.0.0 📚

A dual-transport Model Context Protocol (MCP) server that provides **enhanced access** to Microsoft Learn's catalog API. Now featuring **9 specialized tools** for comprehensive learning content discovery and extraction. Available as both **stdio** (for local development) and **HTTP** (for remote deployment and n8n integration) transports.

## 🚀 Features

- **Enhanced Tool Set**: 9 specialized tools for comprehensive content discovery
- **Dual Transport Support**: stdio (local) and HTTP (remote/web) transports
- **Advanced Search**: Multi-product, multi-role, multi-level filtering capabilities
- **Learning Path Intelligence**: Complete learning path extraction and analysis
- **Certification Tracking**: Find certification paths and prerequisites
- **Content Scraping**: Extract detailed content from learning modules and paths
- **Concurrency Control**: Optimized performance with p-limit
- **TypeScript Enhanced**: Complete type definitions for all data structures
- **n8n Compatible**: HTTP server ready for automation workflows
- **VS Code Integration**: Works seamlessly with VS Code MCP extension
- **Docker Ready**: Containerized for easy deployment
- **Session Management**: Secure HTTP session handling
- **CORS Support**: Configurable cross-origin resource sharing

## 🛠️ Available Tools (v2.0.0)

### Core Tools
1. **listCatalog** - List Microsoft Learn objects by type
2. **searchCatalog** - Search the catalog with filters and text queries  
3. **getDetail** - Get detailed information about specific content
4. **scrapeModuleUnits** - Extract content from learning module units

### Enhanced Tools (NEW in v2.0.0)
5. **findByProduct** - Search content by Microsoft product (Azure, .NET, M365, etc.)
6. **findCertificationPath** - Find certification paths and prerequisites  
7. **getLearningPathDetails** - Get complete learning path information with modules
8. **getAdvancedSearch** - Multi-criteria search with enhanced filtering
9. **scrapeLearningPath** - Extract complete learning path content recursively

## 🎯 New Tool Examples

### findByProduct - Search by Microsoft Product
```json
{
  "name": "findByProduct",
  "arguments": {
    "product": "azure",
    "type": "learningPaths",
    "level": "beginner",
    "role": "developer",
    "max_results": 10
  }
}
```

### findCertificationPath - Find Certification Paths
```json
{
  "name": "findCertificationPath",
  "arguments": {
    "certification_type": "azure-fundamentals",
    "include_prerequisites": true,
    "max_results": 5
  }
}
```

### getLearningPathDetails - Complete Learning Path Info
```json
{
  "name": "getLearningPathDetails",
  "arguments": {
    "learning_path_uid": "learn.wwl.azure-fundamentals",
    "include_modules": true,
    "include_prerequisites": true
  }
}
```

### getAdvancedSearch - Multi-Criteria Search
```json
{
  "name": "getAdvancedSearch",
  "arguments": {
    "query": "machine learning",
    "products": ["azure", "dotnet"],
    "roles": ["data-scientist", "developer"],
    "levels": ["intermediate", "advanced"],
    "subjects": ["artificial-intelligence"],
    "type": "modules,learningPaths",
    "sort_by": "popularity",
    "max_results": 20
  }
}
```

### scrapeLearningPath - Extract Complete Content
```json
{
  "name": "scrapeLearningPath",
  "arguments": {
    "learning_path_uid": "learn.wwl.azure-fundamentals",
    "max_modules": 5,
    "max_units_per_module": 10,
    "with_text_excerpt": true,
    "max_chars_excerpt": 800
  }
}
```

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
      "description": "Microsoft Learn Catalog Server v2.0.0 (stdio)"
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

## 🎯 Use Cases & Examples

### 📚 Azure Learning Path Discovery
```json
{
  "name": "findByProduct",
  "arguments": {
    "product": "azure",
    "type": "learningPaths",
    "level": "beginner",
    "role": "developer"
  }
}
```

### 🏆 Certification Preparation
```json
{
  "name": "findCertificationPath",
  "arguments": {
    "certification_type": "az-104",
    "include_prerequisites": true
  }
}
```

### 📖 Complete Content Extraction
```json
{
  "name": "scrapeLearningPath",
  "arguments": {
    "learning_path_uid": "learn.azure.intro-to-azure-fundamentals",
    "with_text_excerpt": true,
    "max_chars_excerpt": 1000
  }
}
```

### 🔍 Advanced Multi-Product Search
```json
{
  "name": "getAdvancedSearch",
  "arguments": {
    "query": "API development",
    "products": ["azure", "dotnet"],
    "roles": ["developer"],
    "levels": ["intermediate"],
    "type": "modules,learningPaths",
    "sort_by": "popularity"
  }
}
```

## 🚀 What's New in v2.0.0

### Enhanced Data Structures
- **TypeScript Interfaces**: ModuleItem, LearningPathItem, CertificationItem
- **Better Type Safety**: Complete type definitions for all API responses
- **Improved Error Handling**: More descriptive error messages

### Advanced Filtering
- **Product-Based Search**: Find content for specific Microsoft products
- **Role-Based Filtering**: Target content for specific professional roles
- **Level-Based Sorting**: Filter by difficulty levels
- **Subject Categorization**: Search by technical subjects

### Performance Improvements
- **Concurrency Control**: Using p-limit for optimal performance
- **Better URL Handling**: Improved slug construction and validation
- **Caching Logic**: Smarter content caching mechanisms

### New Capabilities
- **Learning Path Intelligence**: Complete path analysis with prerequisites
- **Certification Mapping**: Find paths to specific certifications
- **Recursive Content Extraction**: Full learning path content scraping
- **Multi-Criteria Search**: Complex queries with multiple filters

## 📊 API Reference

### Enhanced Tools Reference

#### findByProduct
Search content by Microsoft product.

**Parameters:**
- `product` (required): Microsoft product (azure, dotnet, microsoft-365, etc.)
- `type` (optional): Content types (modules, learningPaths, certifications)
- `level` (optional): Difficulty level (beginner, intermediate, advanced)
- `role` (optional): Professional role filter
- `max_results` (optional): Maximum results (default: 50)

#### findCertificationPath
Find certification paths and prerequisites.

**Parameters:**
- `certification_type` (required): Certification identifier
- `include_prerequisites` (optional): Include prerequisite information
- `max_results` (optional): Maximum results (default: 20)

#### getLearningPathDetails
Get complete learning path information.

**Parameters:**
- `learning_path_uid` (required): Learning path unique identifier
- `include_modules` (optional): Include module details
- `include_prerequisites` (optional): Include prerequisites

#### getAdvancedSearch
Multi-criteria search with enhanced filtering.

**Parameters:**
- `query` (optional): Free text search
- `products` (optional): Array of Microsoft products
- `roles` (optional): Array of professional roles
- `levels` (optional): Array of difficulty levels
- `subjects` (optional): Array of technical subjects
- `type` (optional): Content types
- `sort_by` (optional): Sort criteria (popularity, rating, duration)
- `max_results` (optional): Maximum results

#### scrapeLearningPath
Extract complete learning path content.

**Parameters:**
- `learning_path_uid` (required): Learning path identifier
- `max_modules` (optional): Maximum modules to process
- `max_units_per_module` (optional): Maximum units per module
- `with_text_excerpt` (optional): Include text content
- `max_chars_excerpt` (optional): Maximum text length

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

# Test server
node test-server.js

# Docker development
docker-compose up --build
```

### Project Structure

```
mcp-learn/
├── src/
│   ├── server.ts              # Enhanced stdio MCP server
│   ├── http-server.ts         # HTTP MCP server
│   └── types/
│       └── html-to-text.d.ts  # Type definitions
├── dist/                      # Compiled JavaScript
├── examples.md               # Usage examples
├── test-server.js            # Test script
├── Dockerfile                # Docker configuration
├── docker-compose.yml        # Docker Compose setup
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## 🧪 Testing the Enhanced Server

### Quick Test Script

```bash
# Test all new tools
node test-server.js
```

### Manual Testing Examples

```bash
# Test findByProduct
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"findByProduct","arguments":{"product":"azure","type":"modules","max_results":3}}}' | node dist/server.js

# Test getAdvancedSearch  
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"getAdvancedSearch","arguments":{"query":"fundamentals","products":["azure"],"type":"learningPaths","max_results":3}}}' | node dist/server.js
```

## 📈 Performance & Optimizations

### Concurrency Control
- **p-limit**: Controls concurrent HTTP requests
- **Smart Batching**: Processes content in optimal batches
- **Memory Management**: Efficient handling of large content

### Caching Strategy
- **URL Construction**: Optimized slug generation
- **Content Parsing**: Efficient HTML parsing with cheerio
- **Response Formatting**: Streamlined JSON responses

### Error Handling
- **Graceful Degradation**: Continues processing on individual failures
- **Detailed Logging**: Comprehensive error reporting
- **Recovery Mechanisms**: Automatic retry logic for transient failures

## 🔗 Integration Examples

### VS Code Workflow
1. Search for Azure certification content
2. Extract complete learning paths
3. Generate study materials
4. Track learning progress

### n8n Automation
1. Monitor new Microsoft Learn content
2. Extract and categorize by product/role
3. Generate automated study schedules
4. Send notifications for new content

### Custom Applications
1. Build learning management systems
2. Create personalized learning paths
3. Generate content summaries
4. Track skill development

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

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

**Made with ❤️ to facilitate comprehensive Microsoft Azure learning and automation!** 🚀

**Version 2.0.0 - Enhanced Intelligence for Learning Discovery** 📚✨