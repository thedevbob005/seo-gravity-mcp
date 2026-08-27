import { File as BufferFile } from 'node:buffer';

// Polyfill globalThis.File for Node.js 18.x environments where undici/jsdom expects File to be globally available
if (typeof (globalThis as any).File === 'undefined') {
  if (typeof BufferFile !== 'undefined') {
    (globalThis as any).File = BufferFile;
  } else {
    (globalThis as any).File = class File {};
  }
}
