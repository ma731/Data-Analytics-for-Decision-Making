# Air India War Room — one-command launcher (Windows PowerShell)
# Starts the FastAPI backend (:8000) and the Vite frontend (:5173).

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "Air India War Room — starting full stack..." -ForegroundColor Magenta

# Backend
Write-Host "→ Backend  (FastAPI)  http://127.0.0.1:8000" -ForegroundColor Cyan
Start-Process -FilePath "python" -ArgumentList "app.py" -WorkingDirectory "$root\backend"

Start-Sleep -Seconds 3

# Frontend
Write-Host "→ Frontend (Vite)     http://localhost:5173" -ForegroundColor Cyan
Start-Process -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory "$root\frontend"

Start-Sleep -Seconds 4
Write-Host "`nOpen http://localhost:5173 in your browser." -ForegroundColor Green
Start-Process "http://localhost:5173"
