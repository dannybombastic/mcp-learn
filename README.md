# MCP Learn Catalog Server 📚

An MCP (Model Context Protocol) server for extracting and processing Microsoft Learn content. Provides access to certification catalogs, learning modules, and complete content extraction from study units.

## 🚀 Features

- **Catalog Search**: Search modules, certifications, learning paths and more on Microsoft Learn
- **Content Extraction**: Extract complete module content including tables, diagrams and technical text
- **Smart Scraping**: Automatically builds URLs and extracts structured content
- **Certification Support**: Optimized for certifications like AZ-104, AZ-900, etc.
- **Microsoft Learn API**: Direct integration with official Microsoft Learn API

## 🛠️ Available Tools

### 1. `listCatalog`
Lists Microsoft Learn objects by type.

**Parameters:**
- `type`: Content type (modules, certifications, learningPaths, etc.)
- `locale`: Language (default: en-us)
- `max_results`: Maximum number of results

### 2. `searchCatalog`
Search Microsoft Learn catalog with advanced filters.

**Parameters:**
- `q`: Free text search
- `type`: Content types separated by commas
- `level`: Levels (beginner, intermediate, advanced)
- `product`: Specific products
- `role`: Specific roles

### 3. `getDetail`
Get complete object details by UID.

**Parameters:**
- `uid`: UIDs separated by commas
- `locale`: Language
- `type`: Optional type filter

### 4. `scrapeModuleUnits` ⭐
**Main tool**: Extract complete content from Microsoft Learn modules.

**Parameters:**
- `module`: Module object with UID, firstUnitUrl and units
- `firstUnitUrl`: First unit URL (alternative)
- `units`: Array of unit UIDs (alternative)
- `max_chars_excerpt`: Maximum characters per unit (default: 20,000)
- `max_units`: Maximum number of units
- `with_text_excerpt`: Include complete text excerpt

## 📋 Prerequisites

- Node.js >= 18.17
- npm or yarn

## 🔧 Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd mcp-learn-catalog
```

### 2. Install dependencies
```bash
npm install
```

### 3. Build the project
```bash
npm run build
```

### 4. Configure in Visual Studio Code

#### MCP Configuration in VS Code

1. **Install Claude/MCP extension** (if not installed)

2. **Configure MCP server** in VS Code:
   - Open VS Code
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Search for "MCP: Add Server" or edit MCP configuration

3. **Add configuration in `mcp.json`**:
```json
{
  "servers": {
    "learn-catalog": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/home/dannybombastic/Documents/mcp-learn/dist/server.js"
      ],
      "env": {
        "NODE_NO_WARNINGS": "1"
      }
    }
  }
}
```

4. **Configuration file location**:
   - **Windows**: `%APPDATA%\Code\User\mcp.json`
   - **macOS**: `~/Library/Application Support/Code/User/mcp.json`
   - **Linux**: `~/.config/Code/User/mcp.json`

#### Alternative configuration (settings.json)
You can also configure it in VS Code `settings.json`:
```json
{
  "mcp.servers": {
    "mcp-learn-catalog": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-learn-catalog/dist/server.js"]
    }
  }
}
```

### 5. Run the server (standalone mode)
```bash
npm start
```

## 🚀 Usage with Visual Studio Code

### Verify the server works

1. **Restart VS Code** after adding MCP configuration
2. **Open command palette** (`Ctrl+Shift+P`)
3. **Search "MCP"** to see available commands
4. **Verify connection** - you should see the `learn-catalog` server listed

### Available commands in VS Code

Once configured, you can use the tools from Claude or any MCP client:

#### 🔍 Search certifications
```javascript
// Search for AZ-104 certification
searchCatalog({
  q: "AZ-104 Azure Administrator",
  type: "certifications,learningPaths"
})
```

#### 📚 Extract module content
```javascript
// Extract complete content from a module
scrapeModuleUnits({
  firstUnitUrl: "https://learn.microsoft.com/training/modules/configure-storage-accounts/1-introduction/",
  max_chars_excerpt: 25000,
  with_text_excerpt: true
})
```

#### 📋 List modules by type
```javascript
// List all available modules
listCatalog({
  type: "modules",
  max_results: 50
})
```

### Troubleshooting VS Code

#### Issue: Server doesn't appear
- ✅ Verify the path in `mcp.json` is absolute and correct
- ✅ Ensure `npm run build` executed successfully
- ✅ Restart VS Code completely
- ✅ Check logs in VS Code developer console

#### Issue: Connection errors
- ✅ Verify Node.js ≥18.17 is installed
- ✅ Check all dependencies are installed (`npm install`)
- ✅ Review file permissions on Linux/macOS

#### Issue: Tools not available
- ✅ Verify MCP extension is enabled
- ✅ Check server is running without errors
- ✅ Verify valid JSON configuration in `mcp.json`

## 🚀 Development

### Run in development mode
```bash
npm run dev
```

### Check TypeScript types
```bash
npm run check
```

### Project structure
```
mcp-learn-catalog/
├── src/
│   ├── server.ts          # Main MCP server
│   └── types/
│       └── html-to-text.d.ts  # Type definitions
├── dist/                  # Compiled files
├── package.json
├── tsconfig.json
└── README.md
```

## 📝 Complete Configuration Example

### Complete `mcp.json` file example:
```json
{
  "$schema": "https://raw.githubusercontent.com/modelcontextprotocol/servers/main/schemas/mcp.json",
  "servers": {
    "mcp-learn-catalog": {
      "command": "node",
      "args": [
        "/home/user/Documents/mcp-learn/dist/server.js"
      ],
      "env": {},
      "description": "Microsoft Learn Catalog Server - Extract certification and module content"
    }
  }
}
```

### Automatic setup script (Linux/macOS):
```bash
#!/bin/bash
# setup-vscode-mcp.sh

# Get current project path
PROJECT_PATH=$(pwd)

# Create configuration directory if it doesn't exist
mkdir -p ~/.config/Code/User

# Create mcp.json file
cat > ~/.config/Code/User/mcp.json << EOF
{
  "\$schema": "https://raw.githubusercontent.com/modelcontextprotocol/servers/main/schemas/mcp.json",
  "servers": {
    "mcp-learn-catalog": {
      "command": "node",
      "args": ["$PROJECT_PATH/dist/server.js"],
      "env": {},
      "description": "Microsoft Learn Catalog Server"
    }
  }
}
EOF

echo "✅ MCP configuration created at ~/.config/Code/User/mcp.json"
echo "🔄 Restart VS Code to apply changes"
```

### Windows setup script (PowerShell):
```powershell
# setup-vscode-mcp.ps1

$projectPath = Get-Location
$configPath = "$env:APPDATA\Code\User"

# Create directory if it doesn't exist
New-Item -ItemType Directory -Force -Path $configPath

# Create JSON content
$mcpConfig = @{
    '$schema' = 'https://raw.githubusercontent.com/modelcontextprotocol/servers/main/schemas/mcp.json'
    servers = @{
        'mcp-learn-catalog' = @{
            command = 'node'
            args = @("$projectPath\dist\server.js")
            env = @{}
            description = 'Microsoft Learn Catalog Server'
        }
    }
}

# Convert to JSON and save
$mcpConfig | ConvertTo-Json -Depth 3 | Out-File -FilePath "$configPath\mcp.json" -Encoding UTF8

Write-Host "✅ MCP configuration created at $configPath\mcp.json"
Write-Host "🔄 Restart VS Code to apply changes"
```

## 🎯 Use Cases

### Extract AZ-104 certification content
```javascript
// Search for AZ-104 certification
searchCatalog({
  q: "AZ-104",
  type: "certifications,learningPaths,modules"
})

// Extract content from a specific module
scrapeModuleUnits({
  firstUnitUrl: "https://learn.microsoft.com/en-us/training/modules/configure-storage-accounts/1-introduction/",
  units: ["learn.wwl.configure-storage-accounts.introduction", "learn.wwl.configure-storage-accounts.implement-azure-storage"],
  max_chars_excerpt: 25000,
  with_text_excerpt: true
})
```

### Search modules by technology
```javascript
searchCatalog({
  q: "Azure Storage",
  type: "modules",
  level: "intermediate",
  product: "azure"
})
```

## 🔍 Advanced Features

### Table Extraction
The `scrapeModuleUnits` tool automatically extracts:
- ✅ Comparison tables
- ✅ Technical specifications
- ✅ Feature lists
- ✅ Diagrams and notes
- ✅ Links and references

### Smart URL Construction
The server automatically builds valid URLs for Microsoft Learn units:
- Detects URL base patterns
- Numbers units sequentially
- Handles different slug formats

### Configurable Content Limits
- Extract up to 25,000 characters per unit
- Process multiple units in parallel
- Concurrency control to avoid rate limiting

## 🛡️ Dependencies

### Production
- **@modelcontextprotocol/sdk**: MCP framework
- **cheerio**: HTML parser for scraping
- **html-to-text**: HTML to text conversion
- **p-limit**: Concurrency control
- **zod**: Schema validation

### Development
- **tsx**: TypeScript runner
- **typescript**: TypeScript compiler

## 📊 Microsoft Learn API

This server integrates with:
- **Microsoft Learn Catalog API**: For search and metadata
- **Microsoft Learn Web Content**: For content extraction
- **Multiple locales**: International support

## 🚨 Limitations

- Microsoft Learn rate limiting may apply
- Some content may require authentication
- Scraping depends on Microsoft Learn HTML structure

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is for private use.

## 🔗 Useful Links

- [Microsoft Learn](https://learn.microsoft.com)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [AZ-104 Certification](https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/)

## 📞 Support

To report issues or request features, please open an issue in the repository.

---

**Made with ❤️ to facilitate Microsoft Azure learning!**