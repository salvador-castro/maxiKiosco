# Guía para Generar Certificados de AFIP (Modo Testing/Homologación)

Para poder facturar electrónicamente, necesitás dos archivos:
1. **Private Key (`key.key`)**: Una llave privada que generás en tu computadora.
2. **Certificate (`cert.crt`)**: Un certificado digital firmado por AFIP.

## Paso 1: Generar la Llave Privada y el Pedido de Certificado (CSR)

Necesitás tener `openssl` instalado (en Mac y Linux ya viene). Abrí una terminal (o el terminal de VS Code con `Cmd+J`) y ejecutá:

```bash
# 1. Generar la llave privada (ESTE ARCHIVO ES SECRETO, NO LO COMPARTAS)
openssl genrsa -out key.key 2048

# 2. Generar el pedido de firma (CSR).
# IMPORTANTE: Reemplazá "20XXXXXXXXX" con tu CUIT real.
# En "Common Name" (CN) poné "maxikiosco-testing" o tu nombre.
openssl req -new -key key.key -out pedido.csr -subj "/C=AR/O=Maxikiosco/CN=maxikiosco-testing/serialNumber=CUIT 20392088742"
```

Esto creará `key.key` y `pedido.csr`.

## Paso 2: Obtener el Certificado en AFIP

1. Ingresá a la web de AFIP con tu CUIT y Clave Fiscal.
2. Buscá el servicio **"Administración de Certificados Digitales"** (si no lo tenés, agregalo desde "Administrador de Relaciones de Clave Fiscal").
3. Entrá y seleccioná el contribuyente (vos).
4. Hacé clic en **"Agregar Alias"**.
   - Alias: `maxikiosco_testing` (o lo que quieras).
   - Subir Archivo CSR: Seleccioná el `pedido.csr` que generaste recién.
   - Confirmá.
5. Una vez creado, hacé clic en **"Ver"** (la lupa) al lado del alias.
6. Hacé clic en el botón de descarga para bajar el archivo `.crt`.
7. Renombrá ese archivo a `cert.crt` y colocalo en la carpeta raíz de tu proyecto (junto con `key.key`).

## Paso 3: Autorizar el Servicio de Facturación (WSFE)

Este paso es CRUCIAL. Sin esto, el certificado no tiene permiso para facturar.

1. Volvé al menú principal de AFIP.
2. Entrá a **"Administrador de Relaciones de Clave Fiscal"**.
3. Hacé clic en **"Nueva Relación"**.
4. En **"Servicio"**, buscá:
   - **AFIP** -> **WebServices** -> **Facturación Electrónica** (puede figurar como `wsfe` o "Factura Electrónica").
5. En **"Representante"**, buscá el Alias que creaste en el paso anterior (`maxikiosco_testing`) -> Confirmar.
   - *Nota: A veces tenés que buscar tu propio CUIT y luego seleccionar el Computador Fiscal / Alias.*
6. Confirmá la relación.

## Paso 4: Configurar el Proyecto

Asegurate de tener esto en tu `.env.local`:

```bash
AFIP_CUIT=20XXXXXXXXX
AFIP_CERT_PATH=./cert.crt
AFIP_KEY_PATH=./key.key
AFIP_PRODUCTION=false
```

¡Listo! Reiniciá el servidor (`npm run dev`) y probá facturar.
