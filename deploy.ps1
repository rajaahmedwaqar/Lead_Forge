param(
  [Parameter(Mandatory=$true)][string]$ProjectRef,
  [Parameter(Mandatory=$true)][string]$ApifyToken,
  [string]$AnthropicKey = '',
  [string]$N8nWebhookUrl = ''
)
npx.cmd supabase login
npx.cmd supabase link --project-ref $ProjectRef
npx.cmd supabase secrets set "APIFY_TOKEN=$ApifyToken" --project-ref $ProjectRef
if ($AnthropicKey) { npx.cmd supabase secrets set "ANTHROPIC_API_KEY=$AnthropicKey" --project-ref $ProjectRef }
if ($N8nWebhookUrl) { npx.cmd supabase secrets set "N8N_WEBHOOK_URL=$N8nWebhookUrl" --project-ref $ProjectRef }
# Every function authenticates its caller itself (config.toml), hence --no-verify-jwt.
foreach ($fn in 'search-leads','generate-outreach','send-outreach','admin-diagnostics','bootstrap-admin') {
  npx.cmd supabase functions deploy $fn --project-ref $ProjectRef --no-verify-jwt
}
npx.cmd supabase functions list --project-ref $ProjectRef
Write-Host "`nNext: run scripts\setup-admin.ps1 to create the admin account (login ID: admin123)."
