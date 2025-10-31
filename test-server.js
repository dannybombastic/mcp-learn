#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testMCPServer() {
  console.log('🚀 Testing MCP Learn Catalog Server v2.0.0...\n');
  
  // Create client and transport
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/server.js']
  });
  
  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });
  
  try {
    await client.connect(transport);
    console.log('✅ Connected to MCP server\n');
    
    // Test 1: List available tools
    console.log('📋 Available tools:');
    const tools = await client.listTools();
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log();
    
    // Test 2: findByProduct
    console.log('🔍 Testing findByProduct...');
    try {
      const result = await client.callTool({
        name: 'findByProduct',
        arguments: {
          product: 'azure',
          type: 'modules',
          level: 'beginner',
          max_results: 5
        }
      });
      console.log('✅ findByProduct works!');
      console.log(`   Found ${JSON.parse(result.content[0].text).length} items\n`);
    } catch (error) {
      console.log('❌ findByProduct failed:', error.message);
    }
    
    // Test 3: getAdvancedSearch
    console.log('🔍 Testing getAdvancedSearch...');
    try {
      const result = await client.callTool({
        name: 'getAdvancedSearch',
        arguments: {
          query: 'fundamentals',
          products: ['azure'],
          type: 'learningPaths',
          max_results: 3
        }
      });
      console.log('✅ getAdvancedSearch works!');
      console.log(`   Found ${JSON.parse(result.content[0].text).length} items\n`);
    } catch (error) {
      console.log('❌ getAdvancedSearch failed:', error.message);
    }
    
    // Test 4: getLearningPathDetails
    console.log('📚 Testing getLearningPathDetails...');
    try {
      const result = await client.callTool({
        name: 'getLearningPathDetails',
        arguments: {
          learning_path_uid: 'learn.wwl.azure-fundamentals',
          include_modules: true
        }
      });
      console.log('✅ getLearningPathDetails works!');
      const data = JSON.parse(result.content[0].text);
      console.log(`   Learning Path: ${data.title}`);
      console.log(`   Modules: ${data.modules?.length || 0}\n`);
    } catch (error) {
      console.log('❌ getLearningPathDetails failed:', error.message);
    }
    
    // Test 5: findCertificationPath
    console.log('🏆 Testing findCertificationPath...');
    try {
      const result = await client.callTool({
        name: 'findCertificationPath',
        arguments: {
          certification_type: 'azure-fundamentals',
          max_results: 3
        }
      });
      console.log('✅ findCertificationPath works!');
      console.log(`   Found ${JSON.parse(result.content[0].text).length} certifications\n`);
    } catch (error) {
      console.log('❌ findCertificationPath failed:', error.message);
    }
    
    console.log('🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
  } finally {
    await client.close();
  }
}

testMCPServer().catch(console.error);