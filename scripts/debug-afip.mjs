import { Arca } from '@arcasdk/core';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testAfip() {
  console.log('Testing AFIP Connection (@arcasdk/core)...');
  
  const cuit = parseInt(process.env.AFIP_CUIT || '0');
  const certPath = process.env.AFIP_CERT_PATH || './certs/afip-cert.crt';
  const keyPath = process.env.AFIP_KEY_PATH || './certs/afip-key.key';
  const production = process.env.AFIP_PRODUCTION === 'true';
  const puntoVenta = parseInt(process.env.AFIP_PUNTO_VENTA || '1');
  const tipoComprobante = parseInt(process.env.AFIP_TIPO_COMPROBANTE || '11');

  // Resolve absolute paths properly from the root of the project
  const rootDir = path.resolve(__dirname, '..');
  const certPathResolved = path.resolve(rootDir, certPath);
  const keyPathResolved = path.resolve(rootDir, keyPath);

  console.log('Config:', {
    cuit,
    production,
    puntoVenta,
    tipoComprobante,
    certPath: certPathResolved,
    keyPath: keyPathResolved
  });

  if (!fs.existsSync(certPathResolved)) {
    console.error('Cert file not found at:', certPathResolved);
    return;
  }
  if (!fs.existsSync(keyPathResolved)) {
    console.error('Key file not found at:', keyPathResolved);
    return;
  }

  const cert = fs.readFileSync(certPathResolved, 'utf8');
  const key = fs.readFileSync(keyPathResolved, 'utf8');

  try {
    const context = {
      cuit,
      cert,
      key,
      production,
    };

    const arca = new Arca(context);

    console.log('Getting last voucher...');
    const lastVoucher = await arca.electronicBillingService.getLastVoucher(puntoVenta, tipoComprobante);
    console.log('Last Voucher:', lastVoucher);
    console.log('✅ Connection Successful!');

  } catch (error) {
    console.error('❌ Error testing AFIP:', error);
  }
}

testAfip();
