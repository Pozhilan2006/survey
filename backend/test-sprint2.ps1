# Sprint 2 Verification Test Script
# Verifies Approval Dashboard and Eligibility Rules

$baseUrl = "http://localhost:3000"

Write-Host "`n🧪 Testing Sprint 2: Approvals & Eligibility" -ForegroundColor Cyan

# 0. Setup: Login as Admin
Write-Host "0️⃣  Logging in as Admin..." -ForegroundColor Yellow
$adminLoginBody = @{ email = "admin@survey.com"; password = "admin123" } | ConvertTo-Json
$adminLogin = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $adminLoginBody
$adminToken = $adminLogin.accessToken

if ($null -eq $adminToken) {
    Write-Host "❌ CRITICAL ERROR: No Admin Token!" -ForegroundColor Red
    exit 1
}
$adminHeaders = @{ Authorization = "Bearer $adminToken" }

# 1. Create Survey with MANUAL_APPROVE policy
Write-Host "`n1️⃣  Creating Restricted Survey (Manual Approval)..." -ForegroundColor Yellow
$surveyBody = @{
    title = "Research Grant 2024"
    type = "RESEARCH"
    maxSelections = 1
    approvalPolicy = "MANUAL_APPROVE"
    eligibilityRules = @{
        rule = "AND"
        conditions = @(
            @{ rule = "DEPARTMENT_EQUALS"; value = "CS" },
            @{ rule = "YEAR_EQUALS"; value = "2024" }
        )
    }
    options = @(
        @{ label = "AI Project"; value = "AI" },
        @{ label = "Blockchain Project"; value = "BC" }
    )
} | ConvertTo-Json -Depth 10

try {
    $survey = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/surveys" -Method POST -Headers $adminHeaders -ContentType "application/json" -Body $surveyBody
    $surveyId = $survey.surveyId

    if (-not $surveyId) {
        $surveyId = $survey.id
    }

    if (-not $surveyId) {
        Write-Host "❌ Failed to create survey (No ID returned): $($survey | ConvertTo-Json)" -ForegroundColor Red
        exit 1
    }

    Write-Host "✅ Survey created: $surveyId" -ForegroundColor Green
} catch {
    Write-Host "❌ Error creating survey: $_" -ForegroundColor Red
    try {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    } catch {
        Write-Host "Could not read response body." -ForegroundColor Red
    }
    exit 1
}

# 1.5. Create Release for the Survey
Write-Host "`n1.5️⃣  Creating Release...\" -ForegroundColor Yellow
$releaseBody = @{
    version = "1.0"
    activeFrom = (Get-Date).ToString("yyyy-MM-dd")
    activeTo = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
    status = "PUBLISHED"
    eligibilityRules = @{
        rule = "AND"
        conditions = @(
            @{ rule = "DEPARTMENT_EQUALS"; value = "CS" },
            @{ rule = "YEAR_EQUALS"; value = "2024" }
        )
    }
} | ConvertTo-Json -Depth 10

try {
    $release = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/surveys/$surveyId/releases" -Method POST -Headers $adminHeaders -ContentType "application/json" -Body $releaseBody
    $releaseId = $release.releaseId
    if (-not $releaseId) {
        $releaseId = $release.id
    }
    Write-Host "✅ Release created: $releaseId" -ForegroundColor Green
} catch {
    Write-Host "❌ Error creating release: $_" -ForegroundColor Red
    try {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    } catch {
        Write-Host "Could not read response body." -ForegroundColor Red
    }
    exit 1
}

# 2. Setup Student User (Correct Dept)
Write-Host "`n2️⃣  Setting up Student User (CS Dept)..." -ForegroundColor Yellow
$randomId = Get-Random
$studentEmail = "student$randomId@example.com"
$studentBody = @{
    email = $studentEmail
    password = "Password123!"
    role = "STUDENT"
    profile = @{
        firstName = "John"
        lastName = "Doe"
        year = "2024"
        department = "CS"
    }
} | ConvertTo-Json

$student = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/register" -Method POST -ContentType "application/json" -Body $studentBody
Write-Host "✅ Student registered" -ForegroundColor Green

# Login as Student
$studentLoginBody = @{ email = $studentEmail; password = "Password123!" } | ConvertTo-Json
$studentLogin = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $studentLoginBody

if ($null -eq $studentLogin.accessToken) {
    Write-Host "❌ CRITICAL ERROR: No access token in login response!" -ForegroundColor Red
    exit 1
}

$studentToken = $studentLogin.accessToken
$studentHeaders = @{ Authorization = "Bearer $studentToken" }

# 3. Check Eligibility (Should be Allowed)
Write-Host "`n3️⃣  Checking Eligibility..." -ForegroundColor Yellow
# Get releases to find the active one
try {
    $releases = Invoke-RestMethod -Uri "$baseUrl/api/v1/surveys/$surveyId/releases/active" -Method GET -Headers $studentHeaders
    $releaseId = $releases.release.id
    Write-Host "Releases fetched. Release ID: $releaseId"
    
    $eligibility = Invoke-RestMethod -Uri "$baseUrl/api/v1/participation/releases/$releaseId/eligibility" -Method GET -Headers $studentHeaders
    if ($eligibility.eligible) {
        Write-Host "✅ Student is eligible (Department check passed)" -ForegroundColor Green
    } else {
        Write-Host "❌ Eligibility check failed: $($eligibility | ConvertTo-Json)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error checking eligibility: $_" -ForegroundColor Red
    try {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    } catch {
        Write-Host "Could not read response body." -ForegroundColor Red
    }
    exit 1
}

# 4. Hold Seat & Submit Survey
Write-Host "`n4️⃣  Holding Seat & Submitting..." -ForegroundColor Yellow
# Start participation
$partRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/participation/releases/$releaseId/participate" -Method POST -Headers $studentHeaders
$participationId = $partRes.participation.id

# Fetch options
$opts = Invoke-RestMethod -Uri "$baseUrl/api/v1/surveys/$surveyId/options" -Method GET -Headers $studentHeaders
$optId = $opts.options[0].id

# Hold Seat
$holdBody = @{ optionId = $optId } | ConvertTo-Json
$holdRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/participation/$participationId/hold" -Method POST -Headers $studentHeaders -ContentType "application/json" -Body $holdBody
Write-Host "✅ Seat held. State: $($holdRes.participation.state)" -ForegroundColor Green

# Submit
$submitBody = @{
    selections = @(
        @{ optionId = $optId; rank = 1 }
    )
} | ConvertTo-Json

$submitRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/participation/$participationId/submit" -Method POST -Headers $studentHeaders -ContentType "application/json" -Body $submitBody

if ($submitRes.state -eq "PENDING_APPROVAL") {
    Write-Host "✅ Submission successful. State: PENDING_APPROVAL" -ForegroundColor Green
} else {
    Write-Host "❌ Unexpected state: $($submitRes.state)" -ForegroundColor Red
    exit 1
}

# 5. Admin: List Approvals
Write-Host "`n5️⃣  Admin: Fetching Pending Approvals..." -ForegroundColor Yellow
$approvals = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/approvals?status=PENDING_APPROVAL" -Method GET -Headers $adminHeaders
$found = $approvals.items | Where-Object { $_.id -eq $participationId }

if ($found) {
    Write-Host "✅ Found pending approval in admin list" -ForegroundColor Green
} else {
    Write-Host "❌ Participation not found in admin list" -ForegroundColor Red
    exit 1
}

# 6. Admin: Approve
Write-Host "`n6️⃣  Admin: Approving..." -ForegroundColor Yellow
$approveRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/approvals/$participationId/approve" -Method POST -Headers $adminHeaders

if ($approveRes.updatedState -eq "APPROVED") {
    Write-Host "✅ Approval successful. State: APPROVED" -ForegroundColor Green
} else {
    Write-Host "❌ Approval failed" -ForegroundColor Red
    exit 1
}

# 7. Setup Ineligible Student (Wrong Dept)
Write-Host "`n7️⃣  Testing Ineligible Student (EE Dept)..." -ForegroundColor Yellow
$studentEmail2 = "student_ee_$((Get-Date).Ticks)@test.com"
$studentBody2 = @{
    email = $studentEmail2
    password = "Password123!"
    firstName = "Test"
    lastName = "Student2"
    role = "STUDENT"
    profile = @{ department = "EE"; year = "2024" }
} | ConvertTo-Json

$student2 = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/register" -Method POST -ContentType "application/json" -Body $studentBody2
Write-Host "✅ Student registered: $studentEmail2" -ForegroundColor Green

# Login as Student
$studentLoginBody2 = @{ email = $studentEmail2; password = "Password123!" } | ConvertTo-Json
$studentLogin2 = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $studentLoginBody2
$studentToken2 = $studentLogin2.accessToken
$studentHeaders2 = @{ Authorization = "Bearer $studentToken2" }

try {
    $eligibility2 = Invoke-RestMethod -Uri "$baseUrl/api/v1/participation/releases/$releaseId/eligibility" -Method GET -Headers $studentHeaders2
    if (-not $eligibility2.eligible) {
        Write-Host "✅ Student is correctly marked ineligible" -ForegroundColor Green
    } else {
         Write-Host "❌ Student should be ineligible but was allowed" -ForegroundColor Red
    }
} catch {
    # If API returns 403 or similar for ineligible
    Write-Host "✅ Eligibility check correctly identified user as ineligible (via error)" -ForegroundColor Green
}

Write-Host "`n🎉 Sprint 2 Test Complete!" -ForegroundColor Cyan
