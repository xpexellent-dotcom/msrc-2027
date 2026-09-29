$ErrorActionPreference = 'Stop'
# Dot-source this helper from the project root. It only changes this terminal.
$projectDirectory = Split-Path -Parent $PSScriptRoot
$portableNodeDirectory = Join-Path $projectDirectory '.tools/node'
if (Test-Path -LiteralPath (Join-Path $portableNodeDirectory 'node.exe')) {
    $env:PATH = "$portableNodeDirectory;$env:PATH"
}
# Windows inherited PATH and pnpm's Path must not coexist in Node child processes.
# Normalize only this terminal's key spelling so pnpm can add node_modules/.bin.
$developmentPath = $env:PATH
Remove-Item Env:PATH
Set-Item Env:Path $developmentPath
$nodeVersion = & node --version
if ($nodeVersion -notmatch '^v24\.') {
    throw 'Use Node.js 24 LTS (exact version in .node-version), then reopen your terminal.'
}
$env:NEXT_TELEMETRY_DISABLED = '1'
Write-Output "Using Node $nodeVersion for this terminal."
