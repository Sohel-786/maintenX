param(
  [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$publishRoot = Join-Path $root "Publish"
$stamp = "publish-{0}" -f (Get-Date -Format "dd-MM-yyyy_HH-mm")
$outDir = Join-Path $publishRoot $stamp

# If you publish multiple times in the same minute, avoid collisions.
if (Test-Path $outDir) {
  $stamp = "publish-{0}" -f (Get-Date -Format "dd-MM-yyyy_HH-mm-ss")
  $outDir = Join-Path $publishRoot $stamp
}

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
Write-Host "Publishing to: $outDir"

$backendProj = Join-Path $root "backend\net_backend.csproj"
$frontendDir = Join-Path $root "frontend"
$frontendOut = Join-Path $frontendDir "out"

# 1) Publish backend
dotnet publish $backendProj -c $Configuration -o $outDir

# 2) Build frontend static export
Write-Host "Building frontend (static export)..."
pushd $frontendDir
try {
  npm install --no-audit --no-fund
  npm run build
} finally {
  popd
}

if (-not (Test-Path $frontendOut)) {
  throw "Frontend export folder not found: $frontendOut"
}

# 3) Sync frontend into LOCAL backend/wwwroot for consistency
$localWwwroot = Join-Path $root "backend\wwwroot"
if (-not (Test-Path $localWwwroot)) { New-Item -ItemType Directory -Path $localWwwroot | Out-Null }

Write-Host "Syncing frontend to backend/wwwroot..."
Remove-Item -Force -Recurse -ErrorAction SilentlyContinue (Join-Path $localWwwroot "_next")
Remove-Item -Force -Recurse -ErrorAction SilentlyContinue (Join-Path $localWwwroot "assets")
Remove-Item -Force -Recurse -ErrorAction SilentlyContinue (Join-Path $localWwwroot "avatar")
Remove-Item -Force -Recurse -ErrorAction SilentlyContinue (Join-Path $localWwwroot "404.html")
Get-ChildItem -Path $localWwwroot -Filter "*.html" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $localWwwroot -Filter "*.txt" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

Copy-Item -Path (Join-Path $frontendOut "*") -Destination $localWwwroot -Recurse -Force

# 4) Copy frontend into final publish output wwwroot
$publishWwwroot = Join-Path $outDir "wwwroot"
New-Item -ItemType Directory -Force -Path $publishWwwroot | Out-Null

Write-Host "Copying frontend export to publish folder..."
Remove-Item -Force -Recurse -ErrorAction SilentlyContinue (Join-Path $publishWwwroot "_next")
Remove-Item -Force -Recurse -ErrorAction SilentlyContinue (Join-Path $publishWwwroot "assets")
Remove-Item -Force -Recurse -ErrorAction SilentlyContinue (Join-Path $publishWwwroot "avatar")
Remove-Item -Force -Recurse -ErrorAction SilentlyContinue (Join-Path $publishWwwroot "404.html")
Get-ChildItem -Path $publishWwwroot -Filter "*.html" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $publishWwwroot -Filter "*.txt" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

Copy-Item -Path (Join-Path $frontendOut "*") -Destination $publishWwwroot -Recurse -Force

# Ensure the storage directory exists in the publish output (images uploaded at runtime go here)
$publishStorage = Join-Path $publishWwwroot "storage"
if (-not (Test-Path $publishStorage)) {
  New-Item -ItemType Directory -Force -Path $publishStorage | Out-Null
  Write-Host "Created wwwroot/storage directory in publish output."
}

Write-Host "Done. Published to: $outDir"

