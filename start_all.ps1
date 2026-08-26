Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " Starting VexaMeet Full-Stack: Spring Boot, Python AI & Vite UI" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. Start Python FastAPI AI Microservice (Port 5001)
Write-Host "[1/3] Launching Python AI Microservice on port 5001..." -ForegroundColor Yellow
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\ai-service'; python main.py"

# 2. Start Java Spring Boot Backend (Port 8080)
Write-Host "[2/3] Launching Java Spring Boot on port 8080..." -ForegroundColor Green
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "`$env:JAVA_HOME = 'C:\Program Files\Java\jdk-24'; cd '$PSScriptRoot\backend-spring'; .\mvnw.cmd spring-boot:run"

# 3. Start React / Vite Frontend (Port 5173)
Write-Host "[3/3] Launching React / Vite UI on port 5173..." -ForegroundColor Magenta
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "🎉 All services are launching in background windows!" -ForegroundColor Green
Write-Host " -> Frontend UI:   http://localhost:5173" -ForegroundColor Cyan
Write-Host " -> Backend API:   http://localhost:8080" -ForegroundColor Cyan
Write-Host " -> AI Engine:     http://127.0.0.1:5001/docs" -ForegroundColor Cyan
