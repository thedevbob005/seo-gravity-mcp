import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { TOOLS, executeTool } from './registry.js';
import { ServerOptions } from './types.js';

export function createMcpServer(options: ServerOptions = {}) {
  const server = new Server(
    {
      name: options.name || 'seo-gravity-mcp',
      version: options.version || '1.2.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const a = (args || {}) as Record<string, any>;

    try {
      const result = await executeTool(name, a);
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `SEO Gravity Tool Execution Error (${name}): ${error.message}`
          }
        ]
      };
    }
  });

  return server;
}

export async function startStdioServer(options: ServerOptions = {}) {
  const server = createMcpServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`SEO Gravity MCP Server (v${options.version || '1.2.0'}) running on stdio`);
  return server;
}
