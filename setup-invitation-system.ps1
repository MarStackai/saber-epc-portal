#!/snap/bin/pwsh
# Setup EPC Partner Invitation System
# This creates the proper flow: Invite → Email → Application → Processing

param(
    [switch]$CreateTestInvitation
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EPC Partner Invitation System Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$SiteUrl = "https://saberrenewables.sharepoint.com/sites/SaberEPCPartners"
$ClientId = "bbbfe394-7cff-4ac9-9e01-33cbf116b930"
$TenantId = "dd0eeaf2-2c36-4709-9554-6e2b2639c3d1"

Write-Host "Connecting to SharePoint..." -ForegroundColor Yellow

try {
    Connect-PnPOnline `
        -Url $SiteUrl `
        -ClientId $ClientId `
        -Tenant "saberrenewables.onmicrosoft.com" `
        -CertificatePath "$HOME/.certs/SaberEPCAutomation.pfx" `
        -CertificatePassword (ConvertTo-SecureString -String "P@ssw0rd123!" -AsPlainText -Force)
    
    Write-Host "✅ Connected to SharePoint" -ForegroundColor Green
    
    # Step 1: Fix the EPC Invitations List
    Write-Host ""
    Write-Host "Step 1: Updating EPC Invitations List..." -ForegroundColor Yellow
    
    $invitationsList = Get-PnPList -Identity "EPC Invitations" -ErrorAction SilentlyContinue
    
    if ($invitationsList) {
        # Add missing Status column if it doesn't exist
        $statusField = Get-PnPField -List "EPC Invitations" -Identity "Status" -ErrorAction SilentlyContinue
        if (-not $statusField) {
            # Create the Status field as a choice column
            $statusXml = @"
<Field Type='Choice' DisplayName='Status' Name='Status' StaticName='Status' Required='FALSE'>
    <CHOICES>
        <CHOICE>Active</CHOICE>
        <CHOICE>Used</CHOICE>
        <CHOICE>Expired</CHOICE>
        <CHOICE>Cancelled</CHOICE>
    </CHOICES>
    <Default>Active</Default>
</Field>
"@
            Add-PnPFieldFromXml -List "EPC Invitations" -FieldXml $statusXml
            Write-Host "  ✅ Added Status column" -ForegroundColor Green
        }
        
        # Ensure all required columns exist
        $requiredColumns = @{
            "Code" = "Text"
            "CompanyName" = "Text"
            "ContactEmail" = "Text"
            "ContactName" = "Text"
            "ExpiryDate" = "DateTime"
            "Used" = "Boolean"
            "UsedBy" = "Text"
            "UsedDate" = "DateTime"
            "InvitationSent" = "Boolean"
            "InvitationSentDate" = "DateTime"
        }
        
        foreach ($col in $requiredColumns.GetEnumerator()) {
            $field = Get-PnPField -List "EPC Invitations" -Identity $col.Key -ErrorAction SilentlyContinue
            if (-not $field) {
                $params = @{
                    List = "EPC Invitations"
                    DisplayName = $col.Key
                    InternalName = $col.Key
                    Type = $col.Value
                    AddToDefaultView = $true
                }
                Add-PnPField @params
                Write-Host "  ✅ Added $($col.Key) column" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "  ❌ EPC Invitations list not found!" -ForegroundColor Red
    }
    
    # Step 2: Add Test Invitation Codes
    if ($CreateTestInvitation) {
        Write-Host ""
        Write-Host "Step 2: Creating test invitations..." -ForegroundColor Yellow
        
        $testCodes = @(
            @{
                Title = "TEST2024"
                Code = "TEST2024"
                CompanyName = "Test Company Ltd"
                ContactEmail = "rob@marstack.ai"
                ContactName = "Rob Test"
                ExpiryDate = (Get-Date).AddDays(30)
                Used = $false
                InvitationSent = $false
            },
            @{
                Title = "DEMO2024"
                Code = "DEMO2024"
                CompanyName = "Demo Partners Inc"
                ContactEmail = "demo@saberrenewables.com"
                ContactName = "Demo User"
                ExpiryDate = (Get-Date).AddDays(30)
                Used = $false
                InvitationSent = $false
            },
            @{
                Title = "ABCD1234"
                Code = "ABCD1234"
                CompanyName = "ABC Corporation"
                ContactEmail = "test@saberrenewables.com"
                ContactName = "Test User"
                ExpiryDate = (Get-Date).AddDays(30)
                Used = $false
                InvitationSent = $false
            }
        )
        
        foreach ($code in $testCodes) {
            # Check if code already exists
            $existing = Get-PnPListItem -List "EPC Invitations" -Query "<View><Query><Where><Eq><FieldRef Name='Code'/><Value Type='Text'>$($code.Code)</Value></Eq></Where></Query></View>"
            
            if (-not $existing) {
                $itemValues = $code.Clone()
                # Add Status field only if it exists
                $statusField = Get-PnPField -List "EPC Invitations" -Identity "Status" -ErrorAction SilentlyContinue
                if ($statusField) {
                    $itemValues["Status"] = "Active"
                }
                Add-PnPListItem -List "EPC Invitations" -Values $itemValues
                Write-Host "  ✅ Added invitation code: $($code.Code)" -ForegroundColor Green
            } else {
                # Update existing code - only set Status if field exists
                $updateValues = @{Used = $false}
                $statusField = Get-PnPField -List "EPC Invitations" -Identity "Status" -ErrorAction SilentlyContinue
                if ($statusField) {
                    $updateValues["Status"] = "Active"
                }
                Set-PnPListItem -List "EPC Invitations" -Identity $existing.Id -Values $updateValues
                Write-Host "  ✅ Reactivated code: $($code.Code)" -ForegroundColor Green
            }
        }
    }
    
    # Step 3: Display Current Invitations
    Write-Host ""
    Write-Host "Current Invitation Codes:" -ForegroundColor Cyan
    Write-Host "=========================" -ForegroundColor Cyan
    
    $invitations = Get-PnPListItem -List "EPC Invitations"
    if ($invitations) {
        $invitations | ForEach-Object {
            $item = $_.FieldValues
            $status = if ($item.Status) { $item.Status } else { "Unknown" }
            $used = if ($item.Used -eq $true) { "Yes" } else { "No" }
            
            Write-Host ""
            Write-Host "Code: $($item.Code)" -ForegroundColor White
            Write-Host "  Company: $($item.CompanyName)"
            Write-Host "  Contact: $($item.ContactName) ($($item.ContactEmail))"
            Write-Host "  Status: $status | Used: $used"
            
            if ($item.ExpiryDate) {
                Write-Host "  Expires: $($item.ExpiryDate)"
            }
        }
    } else {
        Write-Host "No invitations found" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  INVITATION WORKFLOW" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "The complete flow should be:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Operations team creates invitation in SharePoint" -ForegroundColor White
    Write-Host "   → Add to 'EPC Invitations' list with:" -ForegroundColor Gray
    Write-Host "     • Company name and contact details" -ForegroundColor Gray
    Write-Host "     • Unique invitation code" -ForegroundColor Gray
    Write-Host "     • Expiry date" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Power Automate sends invitation email" -ForegroundColor White
    Write-Host "   → Email contains:" -ForegroundColor Gray
    Write-Host "     • Welcome message" -ForegroundColor Gray
    Write-Host "     • Direct link: https://epc.saberrenewable.energy/epc/apply" -ForegroundColor Gray
    Write-Host "     • Invitation code: [CODE]" -ForegroundColor Gray
    Write-Host "     • Instructions" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Partner clicks link and enters code" -ForegroundColor White
    Write-Host "   → System validates code is Active" -ForegroundColor Gray
    Write-Host "   → Redirects to application form" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Partner submits application" -ForegroundColor White
    Write-Host "   → Creates entry in 'EPC Onboarding' list" -ForegroundColor Gray
    Write-Host "   → Marks invitation code as 'Used'" -ForegroundColor Gray
    Write-Host "   → Sends confirmation emails" -ForegroundColor Gray
    Write-Host ""
    Write-Host "5. Automated processor handles submission" -ForegroundColor White
    Write-Host "   → Runs every 5 minutes" -ForegroundColor Gray
    Write-Host "   → Processes documents" -ForegroundColor Gray
    Write-Host "   → Updates status" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  MANUAL INVITATION PROCESS" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To manually invite a partner:" -ForegroundColor Yellow
    Write-Host "1. Go to SharePoint: $SiteUrl" -ForegroundColor White
    Write-Host "2. Open 'EPC Invitations' list" -ForegroundColor White
    Write-Host "3. Click 'New' and fill in:" -ForegroundColor White
    Write-Host "   - Code: [Generate unique 8-character code]" -ForegroundColor Gray
    Write-Host "   - Status: Active" -ForegroundColor Gray
    Write-Host "   - Company Name: [Partner company]" -ForegroundColor Gray
    Write-Host "   - Contact Name: [Contact person]" -ForegroundColor Gray
    Write-Host "   - Contact Email: [Their email]" -ForegroundColor Gray
    Write-Host "   - Expiry Date: [30 days from now]" -ForegroundColor Gray
    Write-Host "4. Send them this email:" -ForegroundColor White
    Write-Host ""
    Write-Host "   Subject: Invitation to Join Saber EPC Partner Network" -ForegroundColor Cyan
    Write-Host "   " -ForegroundColor Gray
    Write-Host "   Dear [Contact Name]," -ForegroundColor Gray
    Write-Host "   " -ForegroundColor Gray
    Write-Host "   We're pleased to invite [Company Name] to join our EPC Partner Network." -ForegroundColor Gray
    Write-Host "   " -ForegroundColor Gray
    Write-Host "   To begin your application:" -ForegroundColor Gray
    Write-Host "   1. Visit: https://epc.saberrenewable.energy/epc/apply" -ForegroundColor Gray
    Write-Host "   2. Enter your invitation code: [CODE]" -ForegroundColor Gray
    Write-Host "   3. Complete the application form" -ForegroundColor Gray
    Write-Host "   " -ForegroundColor Gray
    Write-Host "   This invitation expires on [Expiry Date]." -ForegroundColor Gray
    Write-Host "   " -ForegroundColor Gray
    Write-Host "   Best regards," -ForegroundColor Gray
    Write-Host "   Saber Renewables Partner Team" -ForegroundColor Gray
    Write-Host ""
    
    Disconnect-PnPOnline
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green