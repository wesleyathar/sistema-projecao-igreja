<#
.SYNOPSIS
Script para automatizar o envio do Sistema de Projeção para a HostGator via FTP.

.DESCRIPTION
Este script compacta os arquivos necessários e os envia para a sua
hospedagem cPanel de forma automatizada, usando as credenciais fornecidas.
#>

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   DEPLOY HOSTGATOR (cPanel) - SISTEMA DE PROJECAO" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script enviara seus arquivos para o servidor FTP."
Write-Host "Certifique-se de ter criado a App Node.js no cPanel primeiro!" -ForegroundColor Yellow
Write-Host ""

# Diretórios
$sourceFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$tempZipPath = Join-Path $sourceFolder "deploy_sistema.zip"

# Limpa zip anterior se existir
if (Test-Path $tempZipPath) {
    Remove-Item $tempZipPath -Force
}

# --- 1. COMPACTANDO OS ARQUIVOS NECESSÁRIOS ---
Write-Host "[1/3] Preparando os arquivos para envio..." -ForegroundColor Green

# Define os arquivos essenciais a enviar (ignoramos node_modules e .git)
$filesToInclude = @(
    "server.js",
    "app.js",
    "package.json",
    "package-lock.json",
    "index.html",
    "script.js",
    "style.css",
    "manifest.json",
    "service-worker.js",
    "descanso.png",
    "dizimos.png",
    "icon-192.png",
    "icon-512.png",
    "node_modules"
    # lyrics.json NÄO esta aqui para não sobrescrever as letras q ja estao la
)

# Cria pasta temp pra zipar
$tempDir = Join-Path $env:TEMP "sistema_deploy_temp"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

foreach ($file in $filesToInclude) {
    $sourcePath = Join-Path $sourceFolder $file
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $tempDir -Recurse
    }
    else {
        Write-Host "Aviso: Arquivo $file nao encontrado localmente." -ForegroundColor Yellow
    }
}

# Compacta a pasta temp
Write-Host "Compactando arquivos em $tempZipPath ..."
Compress-Archive -Path "$tempDir\*" -DestinationPath $tempZipPath -Force

# Limpa pasta temporaria
Remove-Item $tempDir -Recurse -Force

Write-Host "Arquivos preparados com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  ZIP CRIADO COM SUCESSO! Arquivo salvo em:" -ForegroundColor Green
Write-Host "  $tempZipPath" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Agora faca o UPLOAD MANUAL no cPanel:"
Write-Host "  1. Abra o Gerenciador de Arquivos da HostGator"
Write-Host "  2. Va ate a pasta: optisearch.com.br/sistema_projecao"
Write-Host "  3. Clique em 'Carregar' e suba o arquivo deploy_sistema.zip"
Write-Host "  4. Clique com botao direito no zip e escolha 'Extrair'"
Write-Host "  5. Va no Application Manager e Desligue/Ligue o Status"
Write-Host ""
Write-Host "Pressione qualquer tecla para fechar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
