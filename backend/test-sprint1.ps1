# Sprint 1 Verification Test Script
# Verifies Survey Enhancements, Options, and Releases

$baseUrl = "http://localhost:3000"

Write-Host "`n🧪 Testing Sprint 1: Operational Layer Admin Features`n" -ForegroundColor Cyan

# 1. Login as Admin
Write-Host "1️⃣  Logging in as Admin..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@survey.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody
    
    $token = $loginResponse.accessToken
    $headers = @{ Authorization = "Bearer $token" }
    Write-Host "✅ Login successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Create Enhanced Survey
Write-Host "`n2️⃣  Creating Survey with New Fields..." -ForegroundColor Yellow
$surveyBody = @{
    title = "Elective Selection 2024"
    type = "ACADEMIC"
    maxSelections = 2
    priorityMode = $true
    surveyType = "PRIORITY_RANKED"
    approvalPolicy = "AUTO_APPROVE"
    visibilityMode = "TARGETED"
    eligibilityRules = @{
        type = "AND"
        conditions = @(
            @{ field = "year"; operator = "EQUALS"; value = "2024" }
        )
    }
} | ConvertTo-Json

try {
    $survey = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/surveys" `
        -Method POST `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $surveyBody
    
    $surveyId = $survey.surveyId
    Write-Host "✅ Survey created: $surveyId" -ForegroundColor Green
} catch {
    Write-Host "❌ Survey creation failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "   Detail: $($reader.ReadToEnd())" -ForegroundColor Red
    }
    exit 1
}

# 3. Add Options with Capacity
Write-Host "`n3️⃣  Adding Options with Capacity..." -ForegroundColor Yellow
$options = @(
    @{ title = "Cloud Computing"; capacity = 60 },
    @{ title = "Data Science"; capacity = 40 }
)

foreach ($opt in $options) {
    try {
        $body = $opt | ConvertTo-Json
        $res = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/surveys/$surveyId/options" `
            -Method POST `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $body
        
        Write-Host "✅ Option added: $($opt.title) (Cap: $($opt.capacity))" -ForegroundColor Green
        
        # Store Data Science option ID for quota test
        if ($opt.title -eq "Data Science") {
            $dsOptionId = $res.option.id
        }
    } catch {
        Write-Host "❌ Option creation failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 4. Set Quota Buckets
Write-Host "`n4️⃣  Setting Quota Buckets for 'Data Science'..." -ForegroundColor Yellow
$quotaBody = @{
    buckets = @(
        @{ bucket_name = "BOYS"; quota = 20 },
        @{ bucket_name = "GIRLS"; quota = 20 }
    )
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/options/$dsOptionId/quotas" `
        -Method POST `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $quotaBody
    
    Write-Host "✅ Quota buckets set successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Quota setting failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Create Release with Schedule
Write-Host "`n5️⃣  Creating Scheduled Release..." -ForegroundColor Yellow
$releaseBody = @{
    version = 2
    openTime = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ssZ")
    closeTime = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ssZ")
    autoClose = $true
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/surveys/$surveyId/releases" `
        -Method POST `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $releaseBody
    
    Write-Host "✅ Release scheduled successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Release creation failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Verify Survey Data
Write-Host "`n6️⃣  Verifying Survey Data..." -ForegroundColor Yellow
try {
    $fetchedSurvey = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/surveys/$surveyId" `
        -Method GET `
        -Headers $headers
    
    if ($fetchedSurvey.survey.max_selections -eq 2 -and 
        $fetchedSurvey.survey.survey_type -eq "PRIORITY_RANKED") {
        Write-Host "✅ Survey fields verified: MaxSelections=2, Type=PRIORITY_RANKED" -ForegroundColor Green
    } else {
        Write-Host "❌ Verified failed: Fields do not match" -ForegroundColor Red
        Write-Host "   Got: $($fetchedSurvey | ConvertTo-Json -Depth 2)"
    }
} catch {
    Write-Host "❌ Verification failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Sprint 1 Test Complete!" -ForegroundColor Cyan
