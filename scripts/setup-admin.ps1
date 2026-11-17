# One-time (or password-reset) setup for the administrator account, login ID: admin123.
# The password is typed here, sent once over HTTPS to the bootstrap-admin Edge Function and stored
# only as a hash by Supabase Auth. It is never written to a file or to the frontend.
param(
  [Parameter(Mandatory=$true)][string]$ProjectRef
)
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$token = [Convert]::ToBase64String($bytes) -replace '[^A-Za-z0-9]', ''
npx.cmd supabase secrets set "ADMIN_SETUP_TOKEN=$token" --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) { throw 'Could not set ADMIN_SETUP_TOKEN.' }

$p1 = Read-Host 'Choose the admin password (12+ characters)' -AsSecureString
$p2 = Read-Host 'Repeat the password' -AsSecureString
$a = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p1))
$b = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p2))
if ($a -ne $b) { throw 'Passwords do not match.' }
if ($a.Length -lt 12) { throw 'Use at least 12 characters.' }

$url = "https://$ProjectRef.supabase.co/functions/v1/bootstrap-admin"
$body = @{ setup_token = $token; password = $a } | ConvertTo-Json
try {
  $r = Invoke-RestMethod -Method Post -Uri $url -ContentType 'application/json' -Body $body
  Write-Host "Admin ready. Sign in at /login with ID: $($r.login_id)"
} catch {
  Write-Host "Failed: $($_.ErrorDetails.Message)" -ForegroundColor Red
}
# Rotate the token so it cannot be reused later.
npx.cmd supabase secrets unset ADMIN_SETUP_TOKEN --project-ref $ProjectRef | Out-Null
