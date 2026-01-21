import { Arca, Context } from '@arcasdk/core';
import { IVoucher } from '@arcasdk/core/lib/domain/types/voucher.types';
import fs from 'fs';
import path from 'path';
import type { AfipConfig, FacturaData, FacturaResponse } from './types';

/**
 * Servicio para integración con AFIP Facturación Electrónica (ARCA)
 */
export class AfipService {
  private arca: Arca;
  private config: AfipConfig;

  constructor(config: AfipConfig) {
    this.config = config;

    try {
      // Verificar que existan los archivos de certificados
      const certPathResolved = path.resolve(config.certPath);
      const keyPathResolved = path.resolve(config.keyPath);

      if (!fs.existsSync(certPathResolved)) {
        throw new Error(`Certificado no encontrado: ${certPathResolved}`);
      }

      if (!fs.existsSync(keyPathResolved)) {
        throw new Error(`Clave privada no encontrada: ${keyPathResolved}`);
      }

      // Leer certificados
      const cert = fs.readFileSync(certPathResolved, 'utf8');
      const key = fs.readFileSync(keyPathResolved, 'utf8');

      // Inicializar SDK de ARCA
      const context: Context = {
        cuit: config.cuit,
        cert,
        key,
        production: config.production,
      };

      this.arca = new Arca(context);

      console.log('✅ AfipService inicializado correctamente (@arcasdk/core)');
      console.log(`   CUIT: ${config.cuit}`);
      console.log(`   Ambiente: ${config.production ? 'PRODUCCIÓN' : 'HOMOLOGACIÓN'}`);
      console.log(`   Punto de Venta: ${config.puntoVenta}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Error inicializando AfipService:', errorMessage);
      throw error;
    }
  }

  /**
   * Genera una factura electrónica en AFIP
   */
  async generarFactura(data: FacturaData): Promise<FacturaResponse> {
    try {
      // Preparar fecha
      const fecha = data.fecha || new Date();
      const fechaStr = this.formatearFecha(fecha);

      console.log('📝 Generando factura en AFIP...');
      console.log(`   Total: $${data.total}`);
      console.log(`   Items: ${data.items.length}`);

      console.log(`   Consultando último comprobante -> PtoVta: ${this.config.puntoVenta}, Tipo: ${this.config.tipoComprobante}`);

      // Obtener último comprobante autorizado
      const lastVoucherResult = await this.arca.electronicBillingService.getLastVoucher(
        this.config.puntoVenta,
        this.config.tipoComprobante
      );
      
      const ultimoComprobante = lastVoucherResult.cbteNro;
      const numeroComprobante = ultimoComprobante + 1;

      console.log(`   Último comprobante: ${ultimoComprobante}`);
      console.log(`   Nuevo número: ${numeroComprobante}`);

      // Calcular montos según tipo de comprobante
      const esFacturaC = this.config.tipoComprobante === 11;
      let importeNeto = data.total;
      let importeIVA = 0;
      let ivaAlicuota = 0;
      let ivaArray = null;

      if (!esFacturaC) {
        // Para Factura A o B (RI), calculamos IVA 21%
        ivaAlicuota = 21;
        importeNeto = data.total / (1 + ivaAlicuota / 100);
        importeIVA = data.total - importeNeto;
        
        ivaArray = [
          {
            Id: 5, // 5 = IVA 21%
            BaseImp: parseFloat(importeNeto.toFixed(2)),
            Importe: parseFloat(importeIVA.toFixed(2)),
          },
        ];
      }

      // Crear comprobante según estructura de AFIP
      const comprobante: IVoucher = {
        CantReg: 1, // Cantidad de registros
        PtoVta: this.config.puntoVenta,
        CbteTipo: this.config.tipoComprobante,
        Concepto: 1, // 1 = Productos, 2 = Servicios, 3 = Productos y Servicios
        DocTipo: 99, // 99 = Consumidor Final (cambiar según cliente)
        DocNro: 0, // Sin documento para consumidor final
        CbteDesde: numeroComprobante,
        CbteHasta: numeroComprobante,
        CbteFch: fechaStr, // Formato YYYYMMDD
        ImpTotal: parseFloat(data.total.toFixed(2)),
        ImpTotConc: 0, // Importe neto no gravado
        ImpNeto: parseFloat(importeNeto.toFixed(2)),
        ImpOpEx: 0, // Importe exento
        ImpIVA: parseFloat(importeIVA.toFixed(2)),
        ImpTrib: 0, // Otros tributos
        MonId: 'PES', // Moneda: Pesos
        MonCotiz: 1, // Cotización moneda
        CondicionIVAReceptorId: 5, // 5 = Consumidor Final (Default)
        Iva: ivaArray || undefined, // undefined elimina la propiedad del objeto
      };

      console.log('   Solicitando CAE a AFIP...');

      // Solicitar CAE (Código de Autorización Electrónico)
      const response = await this.arca.electronicBillingService.createVoucher(comprobante);

      if (!response.cae) {
        console.error('❌ Error en respuesta de AFIP:', response);
        // Observaciones might be deep inside response.response
        throw new Error(
            `No se pudo obtener CAE de AFIP. `
        );
      }

      console.log('✅ Factura generada exitosamente');
      console.log(`   CAE: ${response.cae}`);
      console.log(`   Vencimiento CAE: ${response.caeFchVto}`);

      return {
        cae: response.cae,
        caeVencimiento: this.formatearFechaISO(response.caeFchVto),
        numeroComprobante,
        tipoComprobante: this.config.tipoComprobante,
        puntoVenta: this.config.puntoVenta,
        fechaEmision: this.formatearFechaISO(fechaStr),
      };
    } catch (error: unknown) {
      console.error('❌ Error generando factura AFIP:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Error en AFIP: ${errorMessage}`);
    }
  }

  /**
   * Consulta información de un comprobante en AFIP
   */
  async consultarComprobante(
    puntoVenta: number,
    tipoComprobante: number,
    numeroComprobante: number
  ): Promise<unknown> {
    try {
      return await this.arca.electronicBillingService.getVoucherInfo(
        numeroComprobante,
        puntoVenta,
        tipoComprobante
      );
    } catch (error: unknown) {
      console.error('Error consultando comprobante:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Error consultando comprobante: ${errorMessage}`);
    }
  }

  /**
   * Formatea una fecha al formato YYYYMMDD requerido por AFIP
   */
  private formatearFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Convierte formato YYYYMMDD a ISO (YYYY-MM-DD)
   */
  private formatearFechaISO(fechaAfip: string | number): string {
    const str = String(fechaAfip);
    const year = str.substring(0, 4);
    const month = str.substring(4, 6);
    const day = str.substring(6, 8);
    return `${year}-${month}-${day}`;
  }
}

/**
 * Instancia singleton del servicio AFIP
 */
let afipInstance: AfipService | null = null;

/**
 * Obtiene la instancia del servicio AFIP (singleton)
 */
export function getAfipService(): AfipService {
  if (!afipInstance) {
    const config: AfipConfig = {
      cuit: parseInt(process.env.AFIP_CUIT || '0'),
      certPath: process.env.AFIP_CERT_PATH || './certs/afip-cert.crt',
      keyPath: process.env.AFIP_KEY_PATH || './certs/afip-key.key',
      production: process.env.AFIP_PRODUCTION === 'true',
      puntoVenta: parseInt(process.env.AFIP_PUNTO_VENTA || '1'),
      tipoComprobante: parseInt(process.env.AFIP_TIPO_COMPROBANTE || '6'),
    };

    // Validar configuración
    if (!config.cuit || config.cuit === 0) {
      throw new Error('AFIP_CUIT no configurado en variables de entorno');
    }

    afipInstance = new AfipService(config);
  }

  return afipInstance;
}
