# PowerShell script to run backend and database connection tests
Write-Host "🚀 Starting Backend and Database Connection Tests..." -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Node.js not found"
    }
} catch {
    Write-Host "❌ Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    try {
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed"
        }
        Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error: Failed to install dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "✅ Dependencies already installed" -ForegroundColor Green
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Warning: .env file not found" -ForegroundColor Yellow
    Write-Host "   The test will use default MongoDB URI from the code" -ForegroundColor Yellow
    Write-Host ""
}

# Run the connection test
Write-Host "🔍 Running connection tests..." -ForegroundColor Blue
Write-Host ""

try {
    node test-connection.js
    $testExitCode = $LASTEXITCODE
    
    Write-Host ""
    if ($testExitCode -eq 0) {
        Write-Host "🎉 All tests completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Some tests failed. Check the output above for details." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error running tests: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Tests completed. Press Enter to exit..."
Read-Host
