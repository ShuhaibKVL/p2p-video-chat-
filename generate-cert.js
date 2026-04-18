const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if certificates already exist
const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  console.log('✅ Certificates already exist');
  process.exit(0);
}

console.log('📝 Generating self-signed certificate...');

try {
  // Generate using Node's crypto module
  const crypto = require('crypto');
  
  // For now, create empty files - you'll need to run this manually with openssl or use a web service
  console.log(`
  To enable HTTPS for local development:
  
  1. Install mkcert (Windows):
     choco install mkcert
     OR download from: https://github.com/FiloSottile/mkcert/releases
  
  2. Run:
     mkcert -install
     mkcert 172.16.10.92 localhost 127.0.0.1
  
  3. This creates cert.pem and key.pem
  
  4. Then restart the dev server
  
  OR use this simpler approach:
  - Just access from second device using http:// (not https://)
  - But keep both devices connected via same network
  `);
  
} catch (error) {
  console.error('Error:', error.message);
}
