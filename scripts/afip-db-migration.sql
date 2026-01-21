-- Script SQL para agregar campos de facturación AFIP a la base de datos
-- Ejecutar este script en Supabase SQL Editor

-- ==============================================================================
-- OPCIÓN 1: Agregar campos de facturación directamente a la tabla ventas
-- ==============================================================================

-- Agregar campos de facturación AFIP a la tabla ventas
ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS factura_cae VARCHAR(14),
ADD COLUMN IF NOT EXISTS factura_cae_vencimiento DATE,
ADD COLUMN IF NOT EXISTS factura_numero BIGINT,
ADD COLUMN IF NOT EXISTS factura_tipo_comprobante INTEGER,
ADD COLUMN IF NOT EXISTS factura_punto_venta INTEGER,
ADD COLUMN IF NOT EXISTS factura_fecha_emision DATE,
ADD COLUMN IF NOT EXISTS es_comanda BOOLEAN DEFAULT false;

-- Crear índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_ventas_factura_cae ON ventas(factura_cae);
CREATE INDEX IF NOT EXISTS idx_ventas_es_comanda ON ventas(es_comanda);
CREATE INDEX IF NOT EXISTS idx_ventas_factura_numero ON ventas(factura_numero, factura_punto_venta);

-- Agregar comentarios a las columnas
COMMENT ON COLUMN ventas.factura_cae IS 'Código de Autorización Electrónico de AFIP';
COMMENT ON COLUMN ventas.factura_cae_vencimiento IS 'Fecha de vencimiento del CAE';
COMMENT ON COLUMN ventas.factura_numero IS 'Número de comprobante generado en AFIP';
COMMENT ON COLUMN ventas.factura_tipo_comprobante IS 'Tipo de comprobante AFIP (6=Factura B, 11=Factura C, etc.)';
COMMENT ON COLUMN ventas.factura_punto_venta IS 'Punto de venta configurado en AFIP';
COMMENT ON COLUMN ventas.factura_fecha_emision IS 'Fecha de emisión de la factura en AFIP';
COMMENT ON COLUMN ventas.es_comanda IS 'Indica si es una comanda (sin factura electrónica)';

-- ==============================================================================
-- OPCIÓN 2 (ALTERNATIVA): Crear tabla separada para facturas AFIP
-- Esta opción es mejor si querés mantener la tabla ventas más limpia
-- Comentar la Opción 1 si usás esta alternativa
-- ==============================================================================

/*
-- Crear tabla para facturas AFIP
CREATE TABLE IF NOT EXISTS facturas_afip (
  id_factura UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_venta UUID NOT NULL REFERENCES ventas(id_venta) ON DELETE CASCADE,
  cae VARCHAR(14) NOT NULL,
  cae_vencimiento DATE NOT NULL,
  numero_comprobante BIGINT NOT NULL,
  tipo_comprobante INTEGER NOT NULL,
  punto_venta INTEGER NOT NULL,
  fecha_emision DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(punto_venta, tipo_comprobante, numero_comprobante)
);

-- Índices para facturas_afip
CREATE INDEX IF NOT EXISTS idx_facturas_id_venta ON facturas_afip(id_venta);
CREATE INDEX IF NOT EXISTS idx_facturas_cae ON facturas_afip(cae);
CREATE INDEX IF NOT EXISTS idx_facturas_comprobante ON facturas_afip(punto_venta, tipo_comprobante, numero_comprobante);

-- Actualizar tabla ventas para marcar si es comanda
ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS es_comanda BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ventas_es_comanda ON ventas(es_comanda);

-- Comentarios
COMMENT ON TABLE facturas_afip IS 'Almacena información de facturas electrónicas emitidas a través de AFIP';
COMMENT ON COLUMN facturas_afip.cae IS 'Código de Autorización Electrónico de AFIP';
COMMENT ON COLUMN facturas_afip.cae_vencimiento IS 'Fecha de vencimiento del CAE';
COMMENT ON COLUMN facturas_afip.numero_comprobante IS 'Número de comprobante generado en AFIP';
COMMENT ON COLUMN facturas_afip.tipo_comprobante IS 'Tipo de comprobante AFIP (6=Factura B, 11=Factura C, etc.)';
COMMENT ON COLUMN facturas_afip.punto_venta IS 'Punto de venta configurado en AFIP';

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at
CREATE TRIGGER update_facturas_afip_updated_at BEFORE UPDATE ON facturas_afip
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
*/

-- ==============================================================================
-- Verificar los cambios
-- ==============================================================================

-- Ver estructura de la tabla ventas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'ventas'
ORDER BY ordinal_position;

-- Verificar índices creados
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'ventas' AND indexname LIKE '%factura%';
