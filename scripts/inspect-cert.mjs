
import forge from 'node-forge';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const certPath = path.resolve(__dirname, '../certs/afip-cert.crt');

if (!fs.existsSync(certPath)) {
  console.error('Certificate not found:', certPath);
  process.exit(1);
}

const certPem = fs.readFileSync(certPath, 'utf8');
const cert = forge.pki.certificateFromPem(certPem);

console.log('--- Certificate Details ---');
console.log('Subject:', cert.subject.attributes.map(a => `${a.shortName}=${a.value}`).join(', '));
console.log('Issuer:', cert.issuer.attributes.map(a => `${a.shortName}=${a.value}`).join(', '));
console.log('Validity Not Before:', cert.validity.notBefore);
console.log('Validity Not After:', cert.validity.notAfter);

const isComputadores = cert.issuer.attributes.some(a => a.value === 'Computadores');
const isProduction = cert.issuer.attributes.some(a => a.value.includes('Administración Federal'));

console.log('\n--- Environment Check ---');
if (isComputadores) {
    console.log('✅ Issuer is "Computadores" -> This is a HOMOLOGATION (Testing) Certificate.');
} else if (isProduction) {
    console.log('⚠️ Issuer looks like PRODUCTION.');
} else {
    console.log('❓ Unknown Issuer.');
}

console.log('---------------------------');
