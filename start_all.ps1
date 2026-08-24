Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " Starting VexaMeet Hybrid AI Stack: Spring Boot & Python FastAPI" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Start Python FastAPI AI Microservice (Port 5001)
Write-Host "[1/2] Launching Python AI Microservice on port 5001..." -ForegroundColor Yellow
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\ai-service'; python main.py"

# 2. Start Java Spring Boot Backend (Port 8080)
Write-Host "[2/2] Launching Java Spring Boot on port 8080..." -ForegroundColor Green
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "`$env:JAVA_HOME = 'C:\Program Files\Java\jdk-24'; cd '$PSScriptRoot\backend-spring'; .\mvnw.cmd spring-boot:run"

Write-Host "Both services are launching in background windows!" -ForegroundColor Green
Write-Host " -> UI Dashboard: http://localhost:8080" -ForegroundColor Cyan
Write-Host " -> AI Engine:    http://127.0.0.1:5001/docs" -ForegroundColor Cyan
