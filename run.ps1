# Air India War Room — one-command launcher (Windows PowerShell)
# Starts the FastAPI backend (:8000) and the Vite frontend (:5173), then waits
# for the backend to be UP and WARM before opening the browser — so the first
# click in the demo never lands on a cold, still-computing server.

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "Air India War Room — starting full stack..." -ForegroundColor Magenta

# Backend
Write-Host "-> Backend  (FastAPI)  http://127.0.0.1:8000" -ForegroundColor Cyan
Start-Process -FilePath "python" -ArgumentList "app.py" -WorkingDirectory "$root\backend"

# Frontend
Write-Host "-> Frontend (Vite)     http://localhost:5173" -ForegroundColor Cyan
Start-Process -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory "$root\frontend"

# Poll /api/health until the backend is alive AND the OR caches are warm.
# (Warm-up runs in a background thread; "ready":true means all heavy endpoints
#  are precomputed.) Falls through after ~90s so a slow box still opens.
Write-Host "`nWaiting for backend to warm up (findings + OR engine)..." -ForegroundColor Yellow
$ready = $false
foreach ($i in 1..90) {
    try {
        $h = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/health" -TimeoutSec 2
        if ($h.ready) { $ready = $true; break }
        $busy = if ($h.warming) { $h.warming -join ", " } else { "starting" }
        Write-Host ("  warming: {0}" -f $busy) -ForegroundColor DarkGray
    } catch {
        Write-Host "  backend not up yet..." -ForegroundColor DarkGray
    }
    Start-Sleep -Seconds 1
}

if ($ready) {
    Write-Host "Backend warm and ready." -ForegroundColor Green
} else {
    Write-Host "Proceeding without confirmed warm-up (timed out)." -ForegroundColor Yellow
}

Write-Host "`nOpening http://localhost:5173" -ForegroundColor Green
Start-Process "http://localhost:5173"
