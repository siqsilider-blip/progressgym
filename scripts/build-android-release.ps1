param(
    [switch]$SkipWebBuild
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $projectRoot 'android'
$propertiesPath = Join-Path $androidRoot 'keystore.properties'
$generatedConfigPath = Join-Path $androidRoot 'app\src\main\assets\capacitor.config.json'
$productionUrl = 'https://progressgym-sigma.vercel.app'

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][string[]]$CommandArgs
    )

    & $Command @CommandArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Falló: $Command $($CommandArgs -join ' ')"
    }
}

$devServerVariables = @(
    $env:CAPACITOR_DEV_SERVER,
    $env:CAPACITOR_SERVER_URL
) | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) }
if ($devServerVariables.Count -gt 0) {
    throw 'Una release no puede heredar CAPACITOR_DEV_SERVER ni CAPACITOR_SERVER_URL. Cerrá esa terminal o eliminá ambas variables antes de continuar.'
}

$environmentSigningValues = @(
    $env:PROGREZZIA_UPLOAD_STORE_FILE,
    $env:PROGREZZIA_UPLOAD_STORE_PASSWORD,
    $env:PROGREZZIA_UPLOAD_KEY_ALIAS,
    $env:PROGREZZIA_UPLOAD_KEY_PASSWORD
)
$configuredEnvironmentValues = @($environmentSigningValues | Where-Object {
    -not [string]::IsNullOrWhiteSpace([string]$_)
})
$hasCompleteEnvironmentSigning = $configuredEnvironmentValues.Count -eq 4
$hasPartialEnvironmentSigning = $configuredEnvironmentValues.Count -gt 0 -and -not $hasCompleteEnvironmentSigning

if ($hasPartialEnvironmentSigning) {
    throw 'Las variables PROGREZZIA_UPLOAD_* están incompletas. Definí las cuatro o no definas ninguna.'
}

if (-not $hasCompleteEnvironmentSigning -and -not (Test-Path -LiteralPath $propertiesPath -PathType Leaf)) {
    throw 'Falta configurar la firma Android. Copiá android/keystore.properties.example como android/keystore.properties y completalo.'
}

if (-not $env:JAVA_HOME) {
    $defaultJdk = 'C:\Program Files\Microsoft\jdk-21.0.13.21-hotspot'
    if (Test-Path -LiteralPath $defaultJdk -PathType Container) {
        $env:JAVA_HOME = $defaultJdk
    }
}

Push-Location $projectRoot
try {
    Invoke-Checked -Command 'npm.cmd' -CommandArgs @('run', 'typecheck')
    if (-not $SkipWebBuild) {
        Invoke-Checked -Command 'npm.cmd' -CommandArgs @('run', 'build')
    }
    Invoke-Checked -Command 'npx.cmd' -CommandArgs @('cap', 'sync', 'android')

    if (-not (Test-Path -LiteralPath $generatedConfigPath -PathType Leaf)) {
        throw "Capacitor no generó su configuración Android: $generatedConfigPath"
    }
    $generatedConfig = Get-Content -LiteralPath $generatedConfigPath -Raw | ConvertFrom-Json
    if ($generatedConfig.server.url -ne $productionUrl -or $generatedConfig.server.cleartext -eq $true) {
        throw "Release rechazada: Capacitor no apunta exclusivamente a $productionUrl por HTTPS."
    }
}
finally {
    Pop-Location
}

Push-Location $androidRoot
try {
    Invoke-Checked -Command '.\gradlew.bat' -CommandArgs @(
        'testDebugUnitTest',
        'lintDebug',
        'bundleRelease',
        '--no-daemon',
        '--console=plain'
    )
}
finally {
    Pop-Location
}

$bundlePath = Join-Path $androidRoot 'app\build\outputs\bundle\release\app-release.aab'
if (-not (Test-Path -LiteralPath $bundlePath -PathType Leaf)) {
    throw "Gradle terminó sin generar el AAB esperado: $bundlePath"
}

$jarsigner = if ($env:JAVA_HOME) {
    Join-Path $env:JAVA_HOME 'bin\jarsigner.exe'
} else {
    (Get-Command 'jarsigner.exe' -ErrorAction Stop).Source
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($bundlePath)
try {
    $signatureEntry = $archive.Entries | Where-Object {
        $_.FullName -match '^META-INF/[^/]+\.(RSA|DSA|EC)$'
    } | Select-Object -First 1
}
finally {
    $archive.Dispose()
}
if (-not $signatureEntry) {
    throw 'El AAB se generó sin un bloque de firma.'
}

& $jarsigner -verify $bundlePath | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw 'El AAB se generó, pero no superó la verificación de firma.'
}

$bundle = Get-Item -LiteralPath $bundlePath
$bundleStream = [System.IO.File]::OpenRead($bundlePath)
try {
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        $hash = [Convert]::ToHexString($sha256.ComputeHash($bundleStream))
    }
    finally {
        $sha256.Dispose()
    }
}
finally {
    $bundleStream.Dispose()
}

Write-Host ''
Write-Host 'AAB release firmado y verificado:' -ForegroundColor Green
Write-Host $bundle.FullName
Write-Host "Tamaño: $($bundle.Length) bytes"
Write-Host "SHA-256: $hash"
