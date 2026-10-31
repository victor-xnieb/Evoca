param(
    [string]$PythonCommand = "python"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$VenvPath = Join-Path $ProjectRoot ".venv"
$VenvPython = Join-Path $VenvPath "Scripts\python.exe"

Push-Location $ProjectRoot
try {
    if (-not (Test-Path $VenvPython)) {
        & $PythonCommand -m venv $VenvPath
    }

    & $VenvPython -m pip install -r requirements.txt

    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Host "Se creó .env. Completa la clave de Django y las dos URL de Neon."
    }

    & $VenvPython manage.py check
    Write-Host "Entorno listo. Actívalo con: .\.venv\Scripts\Activate.ps1"
}
finally {
    Pop-Location
}

