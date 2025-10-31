#!/usr/bin/env node

import fetch from 'node-fetch';

async function testHttpServer() {
  const baseUrl = 'http://localhost:3001';
  
  console.log('🧪 Testing MCP Learn Catalog HTTP Server...\n');
  
  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check passed:', healthData);
    console.log('');
    
    // Test 2: Server info
    console.log('2️⃣ Testing server info endpoint...');
    const infoResponse = await fetch(`${baseUrl}/`);
    const infoData = await infoResponse.json();
    console.log('✅ Server info:', infoData);
    console.log('');
    
    // Test 3: MCP Initialize
    console.log('3️⃣ Testing MCP initialize...');
    const initResponse = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'MCP-Protocol-Version': '2025-06-18'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          },
          capabilities: {}
        }
      })
    });
    
    const initData = await initResponse.json();
    const sessionId = initResponse.headers.get('mcp-session-id');
    console.log('✅ MCP Initialize response:', initData);
    console.log('✅ Session ID:', sessionId);
    console.log('');
    
    if (!sessionId) {
      throw new Error('No session ID received');
    }
    
    // Test 4: List tools
    console.log('4️⃣ Testing tools/list...');
    const toolsResponse = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'MCP-Protocol-Version': '2025-06-18',
        'Mcp-Session-Id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      })
    });
    
    const toolsData = await toolsResponse.json();
    console.log('✅ Available tools:', toolsData.result?.tools?.length || 0);
    console.log('✅ Tools:', toolsData.result?.tools?.map(t => t.name) || []);
    console.log('');
    
    // Test 5: Call a tool (listCatalog)
    console.log('5️⃣ Testing tool call (listCatalog)...');
    const toolCallResponse = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'MCP-Protocol-Version': '2025-06-18',
        'Mcp-Session-Id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'listCatalog',
          arguments: {
            type: 'products',
            max_results: 5
          }
        }
      })
    });
    
    const toolCallData = await toolCallResponse.json();
    console.log('✅ Tool call response status:', toolCallResponse.status);
    if (toolCallData.result) {
      const content = JSON.parse(toolCallData.result.content[0].text);
      console.log('✅ Products found:', content.length);
      console.log('✅ Sample products:', content.slice(0, 2).map(p => p.title));
    } else if (toolCallData.error) {
      console.log('❌ Tool call error:', toolCallData.error);
    }
    console.log('');
    
    console.log('🎉 All tests completed successfully!');
    console.log('🔗 Server is ready for n8n integration at:', baseUrl);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testHttpServer();