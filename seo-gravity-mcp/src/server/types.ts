import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export interface ServerOptions {
  name?: string;
  version?: string;
  transport?: 'stdio';
}

export type ToolRegistrationFn = (server: McpServer) => void;
