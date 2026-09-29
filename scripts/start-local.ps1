$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
. "$PSScriptRoot/use-local-node.ps1"
pnpm dev
exit $LASTEXITCODE
