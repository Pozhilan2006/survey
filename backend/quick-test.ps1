# Quick Test Script
# Tests API endpoints quickly

Write-Host "🚀 Quick API Test Suite" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000/api/v1"

# Test 1: Health Check
Write-Host "Test 1: Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "✅ Health check passed" -ForegroundColor Green
    Write-Host "   Status: $($health.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
}

# Test 2: Login (Student)
Write-Host "`nTest 2: Student Login..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "student@test.com"
        password = "student123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $studentToken = $loginResponse.token
    Write-Host "✅ Student login successful" -ForegroundColor Green
    Write-Host "   User: $($loginResponse.user.name)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Student login failed: $_" -ForegroundColor Red
    exit 1
}

# Test 3: Student Dashboard
Write-Host "`nTest 3: Student Dashboard..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $studentToken"
    }
    $dashboard = Invoke-RestMethod -Uri "$baseUrl/participation/dashboard" -Method Get -Headers $headers
    Write-Host "✅ Dashboard loaded" -ForegroundColor Green
    Write-Host "   Surveys found: $($dashboard.data.Count)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Dashboard failed: $_" -ForegroundColor Red
}

# Test 4: My Commitments
Write-Host "`nTest 4: My Commitments..." -ForegroundColor Yellow
try {
    $commitments = Invoke-RestMethod -Uri "$baseUrl/participation/my-commitments" -Method Get -Headers $headers
    Write-Host "✅ My Commitments loaded" -ForegroundColor Green
    Write-Host "   Total: $($commitments.data.stats.total)" -ForegroundColor Gray
    Write-Host "   Approved: $($commitments.data.stats.approved)" -ForegroundColor Gray
    Write-Host "   Pending: $($commitments.data.stats.pending)" -ForegroundColor Gray
    Write-Host "   Rejected: $($commitments.data.stats.rejected)" -ForegroundColor Gray
} catch {
    Write-Host "❌ My Commitments failed: $_" -ForegroundColor Red
}

# Test 5: Admin Login
Write-Host "`nTest 5: Admin Login..." -ForegroundColor Yellow
try {
    $adminLoginBody = @{
        email = "admin@test.com"
        password = "admin123"
    } | ConvertTo-Json

    $adminLoginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $adminLoginBody -ContentType "application/json"
    $adminToken = $adminLoginResponse.token
    Write-Host "✅ Admin login successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Admin login failed: $_" -ForegroundColor Red
}

# Test 6: Admin Surveys
Write-Host "`nTest 6: Admin Surveys..." -ForegroundColor Yellow
try {
    $adminHeaders = @{
        "Authorization" = "Bearer $adminToken"
    }
    $surveys = Invoke-RestMethod -Uri "$baseUrl/admin/surveys" -Method Get -Headers $adminHeaders
    Write-Host "✅ Admin surveys loaded" -ForegroundColor Green
    Write-Host "   Total surveys: $($surveys.data.Count)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Admin surveys failed: $_" -ForegroundColor Red
}

# Summary
Write-Host "`n" + "="*50 -ForegroundColor Cyan
Write-Host "✅ Quick tests completed!" -ForegroundColor Green
Write-Host "="*50 -ForegroundColor Cyan
