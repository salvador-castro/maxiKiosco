/**
 * Tipos TypeScript para la integración con AFIP
 */

export type TipoComprobante = 
  | 1  // Factura A
  | 6  // Factura B
  | 11 // Factura C
  | 51 // Factura M
  | number;

export type FormaPagoAfip = 
  | 'efectivo'
  | 'transferencia'
  | 'debito'
  | 'credito';

/**
 * Determina si una forma de pago requiere factura electrónica AFIP
 */
export const requiereFacturaAfip = (formaPago: FormaPagoAfip): boolean => {
  return formaPago === 'transferencia' || formaPago === 'debito';
};

/**
 * Datos de configuración de AFIP
 */
export interface AfipConfig {
  cuit: number;
  certPath: string;
  keyPath: string;
  production: boolean;
  puntoVenta: number;
  tipoComprobante: TipoComprobante;
  access_token?: string;
}

/**
 * Datos de una factura para enviar a AFIP
 */
export interface FacturaData {
  total: number;
  items: Array<{
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    iva?: number;
  }>;
  formaPago: string;
  fecha?: Date;
}

/**
 * Respuesta de AFIP al generar una factura
 */
export interface FacturaResponse {
  cae: string;
  caeVencimiento: string;
  numeroComprobante: number;
  tipoComprobante: number;
  puntoVenta: number;
  fechaEmision: string;
}

/**
 * Datos de una compra almacenados en la base de datos
 */
export interface FacturaDB {
  id_venta: string;
  factura_cae?: string;
  factura_cae_vencimiento?: string;
  factura_numero?: number;
  factura_tipo_comprobante?: number;
  factura_punto_venta?: number;
  factura_fecha_emision?: string;
  es_comanda: boolean;
}

/**
 * Interfaz para el SDK de AFIP
 */
export interface AfipSdk {
  ElectronicBilling: {
    /**
     * Obtiene el número del último comprobante autorizado
     */
    getLastVoucher(puntoVenta: number, tipoComprobante: number): Promise<number>;

    /**
     * Crea un nuevo comprobante (solicita CAE)
     */
    createVoucher(comprobante: Record<string, unknown>): Promise<{
      CAE: string;
      CAEFchVto: string;
      Observaciones?: string;
      [key: string]: unknown;
    }>;

    /**
     * Obtiene información de un comprobante
     */
    getVoucherInfo(numeroComprobante: number, puntoVenta: number, tipoComprobante: number): Promise<unknown>;
  };
}
