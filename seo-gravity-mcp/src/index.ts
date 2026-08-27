#!/usr/bin/env node

import './utils/polyfill.js';
import { startStdioServer } from './server/server.js';
import { VERSION, PACKAGE_NAME } from './version.js';

export * from './server/types.js';
export * from './server/registry.js';
export * from './server/server.js';
export * from './version.js';

// Start Stdio MCP Server
startStdioServer({
  name: PACKAGE_NAME,
  version: VERSION
}).catch((err) => {
  console.error('Fatal error starting SEO Gravity MCP Server:', err);
  process.exit(1);
});
