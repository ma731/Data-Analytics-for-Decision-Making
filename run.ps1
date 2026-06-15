# Air India War Room — one-command launcher (Windows PowerShell)
# Starts the FastAPI backend and the Vite frontend, then waits for the backend to
# be UP and WARM before opening the browser. Auto-falls-back to a free port if the
# default is taken, and points the Vite proxy at whatever port the backend got.
#
#   ./run.ps1            # backend on 8000 (or next free), frontend on 5173
#   ./run.ps1 -Port 8011 # force a specific backend port

param([int]$Port = 8000)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

function Test-PortFree([int]$p) {
  -not (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue)
}

# Pick a free backend port: try the requested one, then a few fallbacks.
if (-not (Test-PortFree $Port)) {
  Write-Host "Port $Port is busy — searching for a free port..." -ForegroundColor Yellow
  $picked = $false
  foreach ($p in @(8011, 8012, 8013, 8021, 8031)) {
    if (Test-PortFree $p) { $Port = $p; $picked = $true; break }
  }
  if (-not $picked) { Write-Host "No free backend port found. Free one and retry." -ForegroundColor Red; exit 1 }
}
$api = "http://127.0.0.1:$Port"

Write-Host "Air India War Room — starting full stack..." -ForegroundColor Magenta
Write-Host "-> Backend  (FastAPI)  $api" -ForegroundColor Cyan
Start-Process -FilePath "python" -ArgumentList "-m","uvicorn","app:app","--host","127.0.0.1","--port","$Port" -WorkingDirectory "$root\backend"

# Start-Process "npm" doesn't resolve on Windows — go through cmd, and pass the
# proxy target so the frontend talks to whatever port the backend actually got.
Write-Host "-> Frontend (Vite)     http://localhost:5173  (proxy -> $api)" -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/c","set VITE_API_TARGET=$api&& npm run dev" -WorkingDirectory "$root\frontend"

# Poll /api/health until the backend is alive, IS OURS, and the OR caches are warm.
Write-Host "`nWaiting for backend to warm up (findings + OR engine)..." -ForegroundColor Yellow
$ready = $false
foreach ($i in 1..90) {
  try {
    $h = Invoke-RestMethod -Uri "$api/api/health" -TimeoutSec 2
    if ($h.service -ne "air-india-war-room") {
      Write-Host "  port $Port answered but it's not our service — aborting." -ForegroundColor Red
      break
    }
    if ($h.ready) { $ready = $true; break }
    $busy = if ($h.warming) { $h.warming -join ", " } else { "starting" }
    Write-Host ("  warming: {0}" -f $busy) -ForegroundColor DarkGray
  } catch {
    Write-Host "  backend not up yet..." -ForegroundColor DarkGray
  }
  Start-Sleep -Seconds 1
}

if ($ready) {
  Write-Host "Backend warm and ready on port $Port." -ForegroundColor Green
} else {
  Write-Host "Proceeding without confirmed warm-up (timed out or wrong service)." -ForegroundColor Yellow
}

Write-Host "`nOpening http://localhost:5173" -ForegroundColor Green
Start-Process "http://localhost:5173"
