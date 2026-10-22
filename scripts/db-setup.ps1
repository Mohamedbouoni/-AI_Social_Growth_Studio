# =============================================================================
# Apply supabase/migrations to your Supabase database (no CLI login needed)
# =============================================================================
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\db-setup.ps1
# Paste the connection string from Supabase -> Connect -> "Session pooler"
# (URI, with your database password filled in). Input is hidden and is never
# written to disk.
# =============================================================================

$secure = Read-Host -AsSecureString "Paste the Session pooler connection string (postgresql://...)"
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $dbUrl = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if (-not $dbUrl.StartsWith("postgres")) {
    Write-Host "That does not look like a postgresql:// connection string." -ForegroundColor Red
    exit 1
}
if ($dbUrl.Contains("[YOUR-PASSWORD]")) {
    Write-Host "Replace [YOUR-PASSWORD] with your database password first." -ForegroundColor Red
    exit 1
}

Write-Host "Applying migrations 001-004..." -ForegroundColor Cyan
npx --yes supabase@latest db push --db-url $dbUrl --include-all --yes
if ($LASTEXITCODE -eq 0) {
    Write-Host "Done. Tables created." -ForegroundColor Green
} else {
    Write-Host "db push failed (exit $LASTEXITCODE). Copy the error above." -ForegroundColor Red
}
