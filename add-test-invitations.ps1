#!/snap/bin/pwsh
# Add test invitations to SharePoint

Write-Host "Adding Test Invitations to SharePoint" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Connect to SharePoint
Connect-PnPOnline `
    -Url "https://saberrenewables.sharepoint.com/sites/SaberEPCPartners" `
    -ClientId "bbbfe394-7cff-4ac9-9e01-33cbf116b930" `
    -Tenant "saberrenewables.onmicrosoft.com" `
    -CertificatePath "$HOME/.certs/SaberEPCAutomation.pfx" `
    -CertificatePassword (ConvertTo-SecureString -String "P@ssw0rd123!" -AsPlainText -Force)

Write-Host "Connected to SharePoint" -ForegroundColor Green

# Test invitation codes
$testCodes = @(
    @{
        Title = "TEST2024"
        Code = "TEST2024"
        CompanyName = "Test Company Ltd"
        ContactEmail = "rob@marstack.ai"
        ContactName = "Rob Test"
        ExpiryDate = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
        Used = $false
    },
    @{
        Title = "DEMO2024"
        Code = "DEMO2024"
        CompanyName = "Demo Partners Inc"
        ContactEmail = "demo@saberrenewables.com"
        ContactName = "Demo User"
        ExpiryDate = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
        Used = $false
    },
    @{
        Title = "ABCD1234"
        Code = "ABCD1234"
        CompanyName = "ABC Corporation"
        ContactEmail = "test@saberrenewables.com"
        ContactName = "Test User"
        ExpiryDate = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
        Used = $false
    }
)

Write-Host ""
Write-Host "Adding invitation codes..." -ForegroundColor Yellow

foreach ($code in $testCodes) {
    try {
        # Check if code already exists
        $query = "<View><Query><Where><Eq><FieldRef Name='Code'/><Value Type='Text'>$($code.Code)</Value></Eq></Where></Query></View>"
        $existing = Get-PnPListItem -List "EPC Invitations" -Query $query -ErrorAction SilentlyContinue
        
        if ($existing) {
            Write-Host "  Code $($code.Code) already exists - skipping" -ForegroundColor Yellow
        } else {
            # Add the new invitation
            Add-PnPListItem -List "EPC Invitations" -Values $code
            Write-Host "  ✅ Added: $($code.Code) for $($code.CompanyName)" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ❌ Error adding $($code.Code): $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Listing all invitations:" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

$allItems = Get-PnPListItem -List "EPC Invitations"
if ($allItems) {
    foreach ($item in $allItems) {
        $fields = $item.FieldValues
        Write-Host ""
        Write-Host "Code: $($fields.Code)" -ForegroundColor White
        Write-Host "  Company: $($fields.CompanyName)"
        Write-Host "  Contact: $($fields.ContactName) <$($fields.ContactEmail)>"
        Write-Host "  Used: $($fields.Used)"
        if ($fields.Status) {
            Write-Host "  Status: $($fields.Status)"
        }
    }
} else {
    Write-Host "No invitations found" -ForegroundColor Yellow
}

Disconnect-PnPOnline

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
Write-Host ""
Write-Host "NOTE: If you need to add the Status column manually:" -ForegroundColor Yellow
Write-Host "1. Go to https://saberrenewables.sharepoint.com/sites/SaberEPCPartners" -ForegroundColor Gray
Write-Host "2. Open 'EPC Invitations' list" -ForegroundColor Gray
Write-Host "3. Click Settings gear → List settings" -ForegroundColor Gray
Write-Host "4. Click 'Create column'" -ForegroundColor Gray
Write-Host "5. Name: Status, Type: Choice" -ForegroundColor Gray
Write-Host "6. Choices: Active, Used, Expired, Cancelled" -ForegroundColor Gray
Write-Host "7. Default: Active" -ForegroundColor Gray