# Calendar Slots Migration - PowerShell Script
# This script runs the calendar slots SQL migration

Write-Host "🚀 Running Calendar Slots Migration..." -ForegroundColor Cyan
Write-Host ""

$sqlFile = "backend\db\migrations\008-calendar-slots-simple.sql"
$dbName = "survey_system"
$dbUser = "root"
$dbPassword = "root"

# Check if SQL file exists
if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ SQL file not found: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 SQL File: $sqlFile" -ForegroundColor Gray
Write-Host "🗄️  Database: $dbName" -ForegroundColor Gray
Write-Host ""

try {
    # Execute SQL file
    Write-Host "Executing migration..." -ForegroundColor Yellow
    
    # Method 1: Using mysql command (if available)
    $mysqlPath = Get-Command mysql -ErrorAction SilentlyContinue
    
    if ($mysqlPath) {
        Write-Host "Using MySQL CLI..." -ForegroundColor Gray
        Get-Content $sqlFile | mysql -u $dbUser -p"$dbPassword" $dbName
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Tables created:" -ForegroundColor Cyan
            Write-Host "  ✓ calendar_slots" -ForegroundColor Green
            Write-Host "  ✓ slot_bookings" -ForegroundColor Green
            Write-Host "  ✓ slot_quota_buckets" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "❌ Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "⚠️  MySQL CLI not found in PATH" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Please run the migration manually:" -ForegroundColor Cyan
        Write-Host "1. Open MySQL Workbench" -ForegroundColor White
        Write-Host "2. Connect to your database" -ForegroundColor White
        Write-Host "3. Open file: $sqlFile" -ForegroundColor White
        Write-Host "4. Execute the SQL script" -ForegroundColor White
        Write-Host ""
        Write-Host "Or install MySQL CLI and run:" -ForegroundColor Cyan
        Write-Host "  mysql -u root -p survey_system < $sqlFile" -ForegroundColor White
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Error during migration:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
