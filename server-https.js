/**
 * Custom HTTPS server for Next.js with self-signed certificate
 * 
 * This allows accessing the app via HTTPS on the local network:
 * https://172.16.10.92:3002
 * 
 * Browser will show security warning, but camera access is allowed
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { createServer } = require('http');

// Try to load certificates
let options = {};
const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  console.log('📄 Using HTTPS certificates');
  options = {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath)
  };
} else {
  // Generate self-signed cert in memory
  const { promisify } = require('util');
  const { generateKeyPairSync } = require('crypto');
  const { createCertificate } = require('pem');
  
  console.log('⚠️  Certificates not found');
  console.log(`
  To use HTTPS, generate a certificate:
  
  Windows (using Chocolatey):
  > choco install mkcert
  > mkcert -install
  > mkcert 172.16.10.92 localhost 127.0.0.1
  
  Then move the generated files to c:\\217\\:
  > move "172.16.10.92+2.pem" cert.pem
  > move "172.16.10.92+2-key.pem" key.pem
  
  Then run: npm run dev:https
  `);
  process.exit(1);
}

// Import Next.js from the frontend folder
const { parse } = require('url');
const nextPath = path.join(__dirname, 'frontend', 'node_modules', 'next');
const next = require(nextPath);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, dir: path.join(__dirname, 'frontend') });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  https.createServer(options, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3002, '0.0.0.0', () => {
    console.log('✅ HTTPS Dev Server running on https://0.0.0.0:3002');
    console.log('   Access from this machine: https://localhost:3002');
    console.log('   Access from network:      https://172.16.10.92:3002');
    console.log('⚠️  Browser will show security warning (normal for self-signed certs)');
    console.log('   Click "Advanced" > "Proceed" to continue');
  });
});
