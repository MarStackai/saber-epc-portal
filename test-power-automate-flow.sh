#!/bin/bash
# Test the Power Automate flow directly

echo "Testing Power Automate Flow"
echo "==========================="
echo ""

# The new Power Automate URL
PA_URL="https://defaultdd0eeaf22c36470995546e2b2639c3.d1.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/25bb3274380b4684a5cd06911e03048d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=l9vFANVy7qrJ3lBl7rok4agZw9cWoolCw2tg_Y46kjY"

# Test data with one of our invitation codes
TEST_DATA='{
  "invitationCode": "TEST2024",
  "companyName": "Test Solar Solutions",
  "registrationNumber": "REG123456",
  "contactName": "John Test",
  "contactTitle": "CEO",
  "email": "john@testsolar.com",
  "phone": "555-0123",
  "address": "123 Solar St, CA",
  "services": ["Installation", "Maintenance"],
  "yearsExperience": 5,
  "teamSize": 25,
  "coverage": "California",
  "certifications": "NABCEP",
  "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
  "source": "epc.saberrenewable.energy"
}'

echo "Sending test data to Power Automate..."
echo "Using invitation code: TEST2024"
echo ""

# Send the request
response=$(curl -s -w "\n---\nHTTP_STATUS:%{http_code}" -X POST "$PA_URL" \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA")

# Extract body and status
body=$(echo "$response" | sed -n '1,/^---$/p' | head -n -1)
status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)

echo "Response Status: $status"
echo "Response Body:"
echo "$body" | jq . 2>/dev/null || echo "$body"
echo ""

if [ "$status" = "200" ] || [ "$status" = "202" ]; then
    echo "✅ Flow triggered successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Check Power Automate run history to see if it executed"
    echo "2. Check if the Get items action found the invitation code"
    echo "3. Add the remaining actions (Create item, Update item, Response)"
else
    echo "❌ Flow trigger failed or not yet configured"
    echo "Make sure the flow is turned ON in Power Automate"
fi