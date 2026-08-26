#!/usr/bin/env node

import { startStdioServer } from './server/server.js';

export * from './server/types.js';
export * from './server/registry.js';
export * from './server/server.js';

// Start Stdio MCP Server
startStdioServer({
  name: 'seo-gravity-mcp',
  version: '1.2.0'
}).catch((err) => {
  console.error('Fatal error starting SEO Gravity MCP Server:', err);
  process.exit(1);
});
