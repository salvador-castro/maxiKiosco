/**
 * Módulo de integración con AFIP para Facturación Electrónica
 * @module lib/afip
 */

export { AfipService, getAfipService } from './afipService';
export { requiereFacturaAfip } from './types';
export type {
  AfipConfig,
  FacturaData,
  FacturaResponse,
  FacturaDB,
  FormaPagoAfip,
  TipoComprobante,
} from './types';
