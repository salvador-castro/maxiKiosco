
import forge from 'node-forge';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const certDir = path.resolve(__dirname, '../certs');

// Ensure certs dir exists
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir);
}

console.log('Generating 2048-bit RSA Key Pair...');
const keys = forge.pki.rsa.generateKeyPair(2048);

console.log('Creating Certificate Signing Request (CSR)...');
const csr = forge.pki.createCertificationRequest();
csr.publicKey = keys.publicKey;

csr.setSubject([
  {
    name: 'commonName',
    value: 'faturacion_testing' // Usual alias for testing
  },
  {
    name: 'countryName',
    value: 'AR'
  },
  {
    name: 'organizationName',
    value: 'MaxiKiosco Testing'
  },
  {
    name: 'organizationalUnitName',
    value: 'IT'
  }
]);

// Sign the CSR with the private key
csr.sign(keys.privateKey);

// Convert to PEM format
const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
const csrPem = forge.pki.certificationRequestToPem(csr);

// Save files
const keyPath = path.join(certDir, 'afip-key.key');
const csrPath = path.join(certDir, 'afip.csr');

fs.writeFileSync(keyPath, privateKeyPem);
console.log(`✅ Private Key saved to: ${keyPath}`);

fs.writeFileSync(csrPath, csrPem);
console.log(`✅ CSR saved to: ${csrPath}`);

console.log('\n-----------------------------------------------------------');
console.log('NEXT STEPS:');
console.log('1. Go to AFIP website (WSASS - Autoservicio de Autenticación).');
console.log('   (https://wsass-homo.afip.gob.ar/wsass-homo/MainPage.aspx)');
console.log('2. Create a new DN (Distinguished Name) with alias "faturacion_testing" if not exists.');
console.log('3. Upload the content of "certs/afip.csr" to get your Certificate.');
console.log('4. Create a file "certs/afip-cert.crt" with the downloaded certificate.');
console.log('-----------------------------------------------------------');
