# Script para generar CSR de AFIP
# Uso: .\scripts\generar-csr-afip.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$CUIT,
    
    [Parameter(Mandatory=$true)]
    [string]$RazonSocial
)

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Generador de Certificados AFIP - Homologación" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que existe OpenSSL
try {
    $null = openssl version
    Write-Host "✅ OpenSSL encontrado" -ForegroundColor Green
} catch {
    Write-Host "❌ OpenSSL no encontrado. Por favor instalar desde:" -ForegroundColor Red
    Write-Host "   https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
    Write-Host "   O usar Git Bash que incluye OpenSSL" -ForegroundColor Yellow
    exit 1
}

# Crear carpeta certs si no existe
$certsPath = Join-Path $PSScriptRoot "..\certs"
if (-not (Test-Path $certsPath)) {
    New-Item -ItemType Directory -Path $certsPath | Out-Null
    Write-Host "✅ Carpeta 'certs' creada" -ForegroundColor Green
}

Write-Host ""
Write-Host "📁 Generando certificados en: $certsPath" -ForegroundColor Cyan
Write-Host ""

# Cambiar a la carpeta certs
Set-Location $certsPath

# Limpiar CUIT (quitar guiones)
$CUITLimpio = $CUIT -replace '-', ''

Write-Host "CUIT: $CUITLimpio" -ForegroundColor Yellow
Write-Host "Razón Social: $RazonSocial" -ForegroundColor Yellow
Write-Host ""

# Generar clave privada
Write-Host "🔑 Generando clave privada..." -ForegroundColor Cyan
openssl genrsa -out afip-key.key 2048 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Clave privada generada: afip-key.key" -ForegroundColor Green
} else {
    Write-Host "❌ Error generando clave privada" -ForegroundColor Red
    exit 1
}

# Generar CSR
Write-Host "📝 Generando CSR..." -ForegroundColor Cyan
$subject = "/C=AR/O=$RazonSocial/CN=$CUITLimpio/serialNumber=CUIT $CUITLimpio"
openssl req -new -key afip-key.key -subj $subject -out afip.csr 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ CSR generado: afip.csr" -ForegroundColor Green
} else {
    Write-Host "❌ Error generando CSR" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  ✅ Certificados generados correctamente" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Archivos generados:" -ForegroundColor Cyan
Write-Host "   • afip-key.key  (Clave privada - ¡NUNCA compartir!)" -ForegroundColor Yellow
Write-Host "   • afip.csr      (Solicitud de certificado)" -ForegroundColor Yellow
Write-Host ""
Write-Host "🌐 Próximos pasos:" -ForegroundColor Cyan
Write-Host "   1. Ingresar a AFIP con Clave Fiscal" -ForegroundColor White
Write-Host "   2. Ir a 'Administrador de Relaciones de Clave Fiscal'" -ForegroundColor White
Write-Host "   3. Crear certificado de HOMOLOGACIÓN para servicio 'wsfe'" -ForegroundColor White
Write-Host "   4. Subir el archivo 'afip.csr'" -ForegroundColor White
Write-Host "   5. Descargar el certificado generado como 'afip-cert.crt'" -ForegroundColor White
Write-Host "   6. Guardar 'afip-cert.crt' en esta carpeta (certs/)" -ForegroundColor White
Write-Host ""
Write-Host "📖 Ver guía completa en: guia_certificados_afip.md" -ForegroundColor Cyan
Write-Host ""
