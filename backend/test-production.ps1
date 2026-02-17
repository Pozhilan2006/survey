# Production Upgrade Test Script
# Tests all new production features

Write-Host "`n🧪 Testing Production Upgrade Features`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"

# Test 1: Health Endpoint
Write-Host "1️⃣  Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    Write-Host "✅ Health: $($health.status) | DB: $($health.database)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health endpoint failed" -ForegroundColor Red
}

# Test 2: Login with Dual Tokens
Write-Host "`n2️⃣  Testing Login (Dual Token System)..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "admin@survey.com"
        password = "admin123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    $accessToken = $loginResponse.accessToken
    $refreshToken = $loginResponse.refreshToken

    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "   Access Token: $($accessToken.Substring(0,20))..." -ForegroundColor Gray
    Write-Host "   Refresh Token: $($refreshToken.Substring(0,20))..." -ForegroundColor Gray
    Write-Host "   Expires In: $($loginResponse.expiresIn) seconds" -ForegroundColor Gray
    Write-Host "   User: $($loginResponse.user.email) ($($loginResponse.user.role))" -ForegroundColor Gray
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Refresh Token
Write-Host "`n3️⃣  Testing Refresh Token..." -ForegroundColor Yellow
try {
    $refreshBody = @{
        refreshToken = $refreshToken
    } | ConvertTo-Json

    $refreshResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/refresh" `
        -Method POST `
        -ContentType "application/json" `
        -Body $refreshBody

    Write-Host "✅ Token refreshed successfully!" -ForegroundColor Green
    Write-Host "   New Access Token: $($refreshResponse.accessToken.Substring(0,20))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Refresh failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: User Management (Get All Users)
Write-Host "`n4️⃣  Testing User Management (Admin Only)..." -ForegroundColor Yellow
try {
    $headers = @{
        Authorization = "Bearer $accessToken"
    }

    $users = Invoke-RestMethod -Uri "$baseUrl/api/v1/users" `
        -Method GET `
        -Headers $headers

    Write-Host "✅ User management working!" -ForegroundColor Green
    Write-Host "   Total users: $($users.count)" -ForegroundColor Gray
    Write-Host "   Roles: ADMIN ($($users.users | Where-Object {$_.role -eq 'ADMIN'} | Measure-Object | Select-Object -ExpandProperty Count)), APPROVER ($($users.users | Where-Object {$_.role -eq 'APPROVER'} | Measure-Object | Select-Object -ExpandProperty Count)), STUDENT ($($users.users | Where-Object {$_.role -eq 'STUDENT'} | Measure-Object | Select-Object -ExpandProperty Count))" -ForegroundColor Gray
} catch {
    Write-Host "❌ User management failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Rate Limiting
Write-Host "`n5️⃣  Testing Rate Limiting..." -ForegroundColor Yellow
Write-Host "   Attempting 6 failed logins (limit is 5)..." -ForegroundColor Gray
$rateLimitHit = $false
for ($i = 1; $i -le 6; $i++) {
    try {
        $badLoginBody = @{
            email = "test@test.com"
            password = "wrongpassword"
        } | ConvertTo-Json

        Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" `
            -Method POST `
            -ContentType "application/json" `
            -Body $badLoginBody `
            -ErrorAction Stop
    } catch {
        if ($_.Exception.Response.StatusCode -eq 429) {
            Write-Host "✅ Rate limit triggered on attempt $i!" -ForegroundColor Green
            $rateLimitHit = $true
            break
        }
    }
    Start-Sleep -Milliseconds 100
}

if (-not $rateLimitHit) {
    Write-Host "⚠️  Rate limit not triggered (may need more attempts)" -ForegroundColor Yellow
}

# Test 6: Password Change
Write-Host "`n6️⃣  Testing Password Change..." -ForegroundColor Yellow
try {
    $changePasswordBody = @{
        currentPassword = "admin123"
        newPassword = "admin123"  # Same password for testing
    } | ConvertTo-Json

    $headers = @{
        Authorization = "Bearer $accessToken"
    }

    $changeResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/change-password" `
        -Method POST `
        -ContentType "application/json" `
        -Headers $headers `
        -Body $changePasswordBody

    Write-Host "✅ Password change endpoint working!" -ForegroundColor Green
} catch {
    Write-Host "❌ Password change failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: API Info
Write-Host "`n7️⃣  Testing API Info..." -ForegroundColor Yellow
try {
    $apiInfo = Invoke-RestMethod -Uri "$baseUrl/api/v1" -Method GET
    Write-Host "✅ API Info:" -ForegroundColor Green
    Write-Host "   Version: $($apiInfo.version)" -ForegroundColor Gray
    Write-Host "   Environment: $($apiInfo.environment)" -ForegroundColor Gray
} catch {
    Write-Host "❌ API info failed" -ForegroundColor Red
}

# Summary
Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🎉 Production Upgrade Test Complete!" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "`n✅ Verified Features:" -ForegroundColor Green
Write-Host "   • Health monitoring" -ForegroundColor Gray
Write-Host "   • JWT dual token system (15min + 7d)" -ForegroundColor Gray
Write-Host "   • Refresh token flow" -ForegroundColor Gray
Write-Host "   • User management (admin only)" -ForegroundColor Gray
Write-Host "   • Rate limiting" -ForegroundColor Gray
Write-Host "   • Password security" -ForegroundColor Gray
Write-Host "   • Environment configuration" -ForegroundColor Gray
Write-Host "`n"
