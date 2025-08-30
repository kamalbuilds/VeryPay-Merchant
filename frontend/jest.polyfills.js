/**
 * @note The block below contains polyfills for Node.js globals
 * required for Jest to function when running JSDOM tests.
 * These HAVE to be require's and HAVE to be in this exact
 * order, since "undici" depends on the "TextEncoder" global API.
 */

const { TextDecoder, TextEncoder } = require('node:util');
const { ReadableStream, TransformStream } = require('node:stream/web');
const { clearImmediate, setImmediate } = require('node:timers');
const { performance } = require('node:perf_hooks');

// Polyfill globals for JSDOM
Object.defineProperties(globalThis, {
  TextDecoder: { value: TextDecoder },
  TextEncoder: { value: TextEncoder },
  ReadableStream: { value: ReadableStream },
  TransformStream: { value: TransformStream },
  clearImmediate: { value: clearImmediate },
  setImmediate: { value: setImmediate },
  performance: { value: performance },
});

// Polyfill fetch for Node.js
const { fetch, Headers, Request, Response } = require('undici');

Object.defineProperties(globalThis, {
  fetch: { value: fetch, writable: true },
  Headers: { value: Headers },
  Request: { value: Request },
  Response: { value: Response },
});

// Additional polyfills for modern Web APIs
global.AbortController = AbortController;
global.AbortSignal = AbortSignal;

// Mock File and FileList for testing file uploads
global.File = class File {
  constructor(chunks, filename, options = {}) {
    this.chunks = chunks;
    this.name = filename;
    this.size = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    this.type = options.type || '';
    this.lastModified = options.lastModified || Date.now();
  }
};

global.FileList = class FileList {
  constructor(files = []) {
    this.files = files;
    this.length = files.length;
    
    // Make it iterable
    for (let i = 0; i < files.length; i++) {
      this[i] = files[i];
    }
  }
  
  item(index) {
    return this.files[index] || null;
  }
  
  *[Symbol.iterator]() {
    for (const file of this.files) {
      yield file;
    }
  }
};

// Mock Blob for testing
global.Blob = class Blob {
  constructor(chunks = [], options = {}) {
    this.chunks = chunks;
    this.size = chunks.reduce((acc, chunk) => {
      if (typeof chunk === 'string') return acc + chunk.length;
      if (chunk instanceof ArrayBuffer) return acc + chunk.byteLength;
      return acc + chunk.length;
    }, 0);
    this.type = options.type || '';
  }
  
  slice(start = 0, end = this.size, contentType = '') {
    // Simple implementation for testing
    return new Blob(this.chunks.slice(start, end), { type: contentType });
  }
  
  text() {
    return Promise.resolve(this.chunks.join(''));
  }
  
  arrayBuffer() {
    // Simple implementation for testing
    const text = this.chunks.join('');
    const buffer = new ArrayBuffer(text.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < text.length; i++) {
      view[i] = text.charCodeAt(i);
    }
    return Promise.resolve(buffer);
  }
};

// Mock URL for testing
if (typeof global.URL === 'undefined') {
  const { URL, URLSearchParams } = require('node:url');
  global.URL = URL;
  global.URLSearchParams = URLSearchParams;
}

// Mock FormData
if (typeof global.FormData === 'undefined') {
  global.FormData = class FormData {
    constructor() {
      this.data = new Map();
    }
    
    append(key, value, filename) {
      if (!this.data.has(key)) {
        this.data.set(key, []);
      }
      this.data.get(key).push(filename ? { value, filename } : value);
    }
    
    set(key, value, filename) {
      this.data.set(key, [filename ? { value, filename } : value]);
    }
    
    get(key) {
      const values = this.data.get(key);
      return values ? values[0] : null;
    }
    
    getAll(key) {
      return this.data.get(key) || [];
    }
    
    has(key) {
      return this.data.has(key);
    }
    
    delete(key) {
      this.data.delete(key);
    }
    
    *entries() {
      for (const [key, values] of this.data) {
        for (const value of values) {
          yield [key, value];
        }
      }
    }
    
    *keys() {
      for (const key of this.data.keys()) {
        yield key;
      }
    }
    
    *values() {
      for (const values of this.data.values()) {
        for (const value of values) {
          yield value;
        }
      }
    }
    
    [Symbol.iterator]() {
      return this.entries();
    }
  };
}

// Mock crypto.subtle for testing
if (!global.crypto) {
  global.crypto = {};
}

if (!global.crypto.subtle) {
  global.crypto.subtle = {
    digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
    decrypt: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
    sign: jest.fn().mockResolvedValue(new ArrayBuffer(64)),
    verify: jest.fn().mockResolvedValue(true),
    generateKey: jest.fn().mockResolvedValue({}),
    importKey: jest.fn().mockResolvedValue({}),
    exportKey: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
  };
}

// Mock console methods for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  // Only show actual errors, not React warnings
  if (typeof args[0] === 'string' && args[0].includes('Warning:')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

console.warn = (...args) => {
  // Suppress common warnings during tests
  if (typeof args[0] === 'string' && (
    args[0].includes('validateDOMNesting') ||
    args[0].includes('React does not recognize')
  )) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};