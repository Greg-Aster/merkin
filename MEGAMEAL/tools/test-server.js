#!/usr/bin/env node

// Simple server test
const http = require('http');

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  if (req.url === '/test') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Server is working!' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(3002, () => {
  console.log('Test server running at http://localhost:3002');
  console.log('Try: curl http://localhost:3002/test');
});

process.on('SIGINT', () => {
  console.log('\nShutting down test server...');
  process.exit(0);
});