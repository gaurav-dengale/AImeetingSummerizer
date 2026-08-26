# ====================================================================
# Test Script: Cross-Meeting DAG Conflict Solver & Cryptographic ADR
# ====================================================================

$BaseUrl = "http://localhost:8080"
$AiUrl = "http://127.0.0.1:5001"

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host " 🚀 Testing & Demonstrating VexaMeet Patent-Grade Features" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

# --------------------------------------------------------------------
# 1. Health Checks
# --------------------------------------------------------------------
Write-Host ">>> [1/5] Checking Backend Services..." -ForegroundColor Yellow
try {
    $backendRes = Invoke-RestMethod -Uri "$BaseUrl/api/settings" -Method Get -TimeoutSec 3 -ErrorAction Stop
    Write-Host " ✅ Spring Boot Backend (Port 8080): ONLINE" -ForegroundColor Green
} catch {
    Write-Host " ❌ Spring Boot Backend (Port 8080): OFFLINE (Ensure .\start_all.ps1 is running)" -ForegroundColor Red
}

# --------------------------------------------------------------------
# 2. Seed Realistic Test Data (2 Meetings with Clashing Tasks + ADR Decisions)
# --------------------------------------------------------------------
Write-Host ""
Write-Host ">>> [2/5] Injecting Realistic Multi-Meeting Scenario Data..." -ForegroundColor Yellow
try {
    $seedRes = Invoke-RestMethod -Uri "$BaseUrl/api/demo/seed" -Method Post -ErrorAction Stop
    Write-Host " ✅ $($seedRes.message)" -ForegroundColor Green
} catch {
    Write-Host " ⚠️ Could not auto-seed data: $_" -ForegroundColor DarkGray
}

Write-Host ""

# --------------------------------------------------------------------
# 3. Test Feature 1: Cross-Meeting Temporal Constraint Graph (Conflicts)
# --------------------------------------------------------------------
Write-Host ">>> [3/5] Testing Feature 1: Cross-Meeting Temporal Constraint Graph..." -ForegroundColor Yellow
try {
    $conflicts = Invoke-RestMethod -Uri "$BaseUrl/api/conflicts" -Method Get -ErrorAction Stop

    Write-Host " 📊 GET /api/conflicts - Status: 200 OK" -ForegroundColor Green
    if ($conflicts.Count -eq 0) {
        Write-Host "    ℹ️ Zero collisions currently in DB." -ForegroundColor Gray
    } else {
        Write-Host "    🚨 Found $($conflicts.Count) active deadline collision(s):" -ForegroundColor Magenta
        foreach ($c in $conflicts) {
            Write-Host "    --------------------------------------------------------" -ForegroundColor DarkGray
            Write-Host "    • Conflict ID: $($c.conflictId)" -ForegroundColor White
            Write-Host "      Assignee: $($c.assignee) | Severity: $($c.severity.ToUpper()) | Collision Score: $($c.conflictScore)/100" -ForegroundColor Yellow
            Write-Host "      Reason: $($c.reason)" -ForegroundColor Gray
            if ($c.suggestedRebalance) {
                Write-Host "      ⚡ AI Autonomous Rebalance: Move Task #$($c.suggestedRebalance.target_task_id)" -ForegroundColor Cyan
                Write-Host "         Date: $($c.suggestedRebalance.current_due_date) ➔ $($c.suggestedRebalance.recommended_due_date)" -ForegroundColor Cyan
                Write-Host "         Rationale: $($c.suggestedRebalance.rationale)" -ForegroundColor DarkCyan
            }
        }
    }
} catch {
    Write-Host " ❌ Failed testing /api/conflicts: $_" -ForegroundColor Red
}

Write-Host ""

# --------------------------------------------------------------------
# 4. Test Feature 2: Cryptographically Verifiable Decision Ledger (ADR)
# --------------------------------------------------------------------
Write-Host ">>> [4/5] Testing Feature 2: Cryptographic Decision Ledger..." -ForegroundColor Yellow
try {
    $decisions = Invoke-RestMethod -Uri "$BaseUrl/api/decisions" -Method Get -ErrorAction Stop
    Write-Host " 📊 GET /api/decisions - Status: 200 OK" -ForegroundColor Green

    if ($decisions.Count -eq 0) {
        Write-Host "    ℹ️ No decisions recorded yet in DB." -ForegroundColor Gray
    } else {
        Write-Host "    📜 Retrieved $($decisions.Count) Architectural / Corporate Decision(s):" -ForegroundColor Magenta
        foreach ($d in $decisions) {
            Write-Host "    --------------------------------------------------------" -ForegroundColor DarkGray
            Write-Host "    • Decision [#$($d.id)]: $($d.decision)" -ForegroundColor White
            Write-Host "      Category: $($d.category) | Consensus: $($d.consensusScore)% | Status: $($d.status)" -ForegroundColor Gray
            Write-Host "      Rationale: $($d.rationale)" -ForegroundColor DarkGray
            Write-Host "      🔒 SHA-256 Provenance Hash: $($d.provenanceHash)" -ForegroundColor DarkGreen
        }

        # Test Cryptographic Verification Endpoint
        $sampleDecision = $decisions[0]
        if ($sampleDecision.provenanceHash) {
            Write-Host "`n    🧪 Testing Real-Time Cryptographic Verification on Hash..." -ForegroundColor Yellow
            $verifyBody = @{
                hash = $sampleDecision.provenanceHash
            } | ConvertTo-Json

            $verifyRes = Invoke-RestMethod -Uri "$BaseUrl/api/decisions/verify" -Method Post -Body $verifyBody -ContentType "application/json"

            if ($verifyRes.verified -eq $true) {
                Write-Host "    ✅ Audit Proof Verification: PASSED (Tamper Score: 0.00% | Hash Matched)" -ForegroundColor Green
            } else {
                Write-Host "    ⚠️ Audit Proof Verification: FAILED or MISMATCH" -ForegroundColor Red
            }
        }
    }
} catch {
    Write-Host " ❌ Failed testing /api/decisions: $_" -ForegroundColor Red
}

Write-Host ""

# --------------------------------------------------------------------
# 5. Interactive Testing in Browser UI
# --------------------------------------------------------------------
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host " ✨ Ready for UI Interactive Testing!" -ForegroundColor Green
Write-Host "  1. Open your UI Dashboard: http://localhost:5173 (or http://localhost:8080)" -ForegroundColor White
Write-Host "  2. Go to 'Cross-Meeting Temporal Constraint Graph' card:" -ForegroundColor White
Write-Host "     -> See Alice Chen's double-booked collision alert" -ForegroundColor Gray
Write-Host "     -> Click 'Apply Rebalance' to automatically reschedule" -ForegroundColor Gray
Write-Host "  3. Go to 'Cryptographic Decision Ledger (ADR)' card:" -ForegroundColor White
Write-Host "     -> Filter by 'Architecture' or 'Security'" -ForegroundColor Gray
Write-Host "     -> Click 'Verify Audit Proof' to test cryptographic tamper resistance" -ForegroundColor Gray
Write-Host "     -> Click 'Export ADR' to copy the formatted markdown record" -ForegroundColor Gray
Write-Host "====================================================================" -ForegroundColor Cyan
