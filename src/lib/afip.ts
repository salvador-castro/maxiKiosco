import Afip from '@aledj02/afip.js';

const AFIP_CUIT = process.env.AFIP_CUIT ? parseInt(process.env.AFIP_CUIT) : 0;
const AFIP_CERT = process.env.AFIP_CERT_PATH || './cert.crt';
const AFIP_KEY = process.env.AFIP_KEY_PATH || './key.key';
const AFIP_PRODUCTION = process.env.AFIP_PRODUCTION === 'true';

// Initialize AFIP SDK
// cert and key can be paths or content. Using paths for now.
const afip = new Afip({
    CUIT: AFIP_CUIT,
    cert: AFIP_CERT,
    key: AFIP_KEY,
    production: AFIP_PRODUCTION,
    res_folder: './afip_res' // Folder to store tokens
});

/**
 * Generates a "Factura B" (for End Consumers)
 * @param amount Total amount of the invoice
 * @param docNro Customer DNI/CUIT (optional, implies Consumidor Final if 0)
 * @param puntoVenta Sales point number (Punto de Venta)
 */
export async function createFacturaB(amount: number, docNro: number = 0, puntoVenta: number = 1) {
    if (!AFIP_CUIT) {
        throw new Error("AFIP_CUIT environment variable is not set");
    }

    try {
        // 1. Get server status (optional but good for debugging)
        // const serverStatus = await afip.ElectronicBilling.getServerStatus();

        // 2. Get last voucher number
        const lastVoucher = await afip.ElectronicBilling.getLastVoucher(puntoVenta, 6); // 6 = Factura B

        // 3. Prepare Invoice Data
        const date = new Date(Date.now() - ((new Date()).getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        const data = {
            'CantReg': 1, // Quantity of records
            'PtoVta': puntoVenta,
            'CbteTipo': 6, // 6 = Factura B
            'Concepto': 1, // 1 = Products
            'DocTipo': docNro ? 96 : 99, // 96 = DNI, 99 = Consumidor Final (if docNro is 0/empty)
            'DocNro': docNro || 0,
            'CbteDesde': lastVoucher + 1,
            'CbteHasta': lastVoucher + 1,
            'CbteFch': parseInt(date.replace(/-/g, '')),
            'ImpTotal': amount,
            'ImpTotConc': 0, // Net amount taxed (0 for C, but B includes VAT? Wait. Factura B total includes VAT)
            // For Factura B (Monotributo emitting or RI emitting to Consumer):
            // If Monotributo (Comprobante 11 - Factura C), we use 11.
            // Assuming this is a Kiosco, likely Monotributo -> Factura C (Type 11).
            // If Responsibility Inscripto -> Factura B (Type 6).
            // Let's assume Factura C (11) for simplicity unless specified.
            // FIXME: Ask user user Tax Condition. Defaulting to Factura C (11) which is safer for small Kioscos.
            // If 11 (C):
            'ImpNeto': amount, // For C, Net = Total
            'ImpOpEx': 0,
            'ImpIVA': 0,
            'ImpTrib': 0,
            'MonId': 'PES',
            'MonCotiz': 1,
        };

        // Adjust for Factura B vs C
        // If Type 6 (Factura B), 'ImpNeto' + 'ImpIVA' = 'ImpTotal'.
        // If Type 11 (Factura C), 'ImpNeto' = 'ImpTotal' (No discrimination).
        // Let's default to C (11) as it's common for Kioscos. 
        // We can parameterize this.

        // Re-assigning for Factura C (Monotributista)
        data.CbteTipo = 11;
        data.CbteDesde = await afip.ElectronicBilling.getLastVoucher(puntoVenta, 11) + 1;
        data.CbteHasta = data.CbteDesde;

        const res = await afip.ElectronicBilling.createVoucher(data);

        return {
            cae: res.CAE,
            vencimiento: res.CAEFchVto,
            nro_comprobante: data.CbteDesde,
            tipo_comprobante: 11,
            punto_venta: puntoVenta
        };

    } catch (error) {
        console.error("Error creating AFIP voucher:", error);
        throw error;
    }
}
