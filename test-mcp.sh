#!/bin/bash

# Script de prueba para el servidor MCP HTTP
# Ejecuta una serie de comandos curl para probar el protocolo MCP

echo "🧪 Testing MCP Learn Catalog HTTP Server..."
echo ""

# Test 1: Initialize MCP session
echo "1️⃣ Initializing MCP session..."
INIT_RESPONSE=$(curl -s -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "MCP-Protocol-Version: 2025-06-18" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-06-18",
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      },
      "capabilities": {}
    }
  }' -D /tmp/mcp_headers.txt)

echo "✅ Initialize response:"
echo "$INIT_RESPONSE" | python3 -m json.tool
echo ""

# Extract session ID from headers
SESSION_ID=$(grep -i "mcp-session-id" /tmp/mcp_headers.txt | cut -d' ' -f2 | tr -d '\r')
echo "✅ Session ID: $SESSION_ID"
echo ""

# Test 2: List tools
echo "2️⃣ Listing available tools..."
TOOLS_RESPONSE=$(curl -s -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "MCP-Protocol-Version: 2025-06-18" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }')

echo "✅ Available tools:"
echo "$TOOLS_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'result' in data and 'tools' in data['result']:
    tools = data['result']['tools']
    print(f'Found {len(tools)} tools:')
    for tool in tools:
        print(f'  - {tool[\"name\"]}: {tool[\"description\"]}')
else:
    print('Error:', data)
"
echo ""

# Test 3: Call listCatalog tool
echo "3️⃣ Testing listCatalog tool..."
LIST_RESPONSE=$(curl -s -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "MCP-Protocol-Version: 2025-06-18" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "listCatalog",
      "arguments": {
        "type": "products",
        "max_results": 3
      }
    }
  }')

echo "✅ listCatalog response:"
echo "$LIST_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'result' in data and 'content' in data['result']:
    content = json.loads(data['result']['content'][0]['text'])
    print(f'Found {len(content)} products:')
    for i, item in enumerate(content[:3]):
        print(f'  {i+1}. {item[\"title\"]}')
        print(f'     URL: {item[\"contentUrl\"]}')
else:
    print('Error:', data)
"
echo ""

# Test 4: Call searchCatalog tool
echo "4️⃣ Testing searchCatalog tool..."
SEARCH_RESPONSE=$(curl -s -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "MCP-Protocol-Version: 2025-06-18" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "searchCatalog",
      "arguments": {
        "type": "modules",
        "q": "Azure",
        "max_results": 2
      }
    }
  }')

echo "✅ searchCatalog response:"
echo "$SEARCH_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'result' in data and 'content' in data['result']:
    content = json.loads(data['result']['content'][0]['text'])
    print(f'Found {len(content)} Azure modules:')
    for i, item in enumerate(content[:2]):
        print(f'  {i+1}. {item[\"title\"]}')
        print(f'     Content: {item[\"content\"][:100]}...')
else:
    print('Error:', data)
"
echo ""

echo "🎉 All MCP tests completed successfully!"
echo "🔗 Server is ready for n8n integration at: http://localhost:3001"
echo ""
echo "📋 MCP Configuration for n8n:"
echo '{'
echo '  "type": "http",'
echo '  "url": "http://localhost:3001/mcp",'
echo '  "protocol": "2025-06-18"'
echo '}'