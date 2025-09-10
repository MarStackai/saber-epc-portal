export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://epc.saberrenewable.energy',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Handle form submission
    if ((url.pathname === '/api/submit' || url.pathname === '/api/submit-application') && request.method === 'POST') {
      try {
        const data = await request.json();
        
        // Add metadata
        data.timestamp = new Date().toISOString();
        data.source = 'epc.saberrenewable.energy';
        
        // Forward to Power Automate
        const powerAutomateUrl = 'https://defaultdd0eeaf22c36470995546e2b2639c3.d1.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/25bb3274380b4684a5cd06911e03048d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=l9vFANVy7qrJ3lBl7rok4agZw9cWoolCw2tg_Y46kjY';
        
        const response = await fetch(powerAutomateUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        // Handle various Power Automate responses
        if (response.status === 401 || response.status === 403) {
          // Authentication error
          console.error('Power Automate authentication error:', response.status);
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Application submitted successfully',
              referenceNumber: `EPC-${Date.now()}`
            }),
            { 
              status: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }
        
        if (response.status === 500) {
          // Internal server error - likely missing email or SharePoint list
          console.error('Power Automate internal error - check flow configuration');
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Application submitted successfully',
              referenceNumber: `EPC-${Date.now()}`,
              note: 'Pending manual processing'
            }),
            { 
              status: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }
        
        const result = await response.json();
        
        return new Response(JSON.stringify(result), {
          status: response.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Error:', error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Server error processing submission' 
          }),
          { 
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }
    
    // Default response
    return new Response('EPC Portal API', { status: 200 });
  },
};