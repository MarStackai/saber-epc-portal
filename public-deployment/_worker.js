export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Debug log
    console.log('Worker received request for:', url.pathname);
    
    // Handle both old and new API paths
    if (url.pathname === '/api/submit-application' || url.pathname === '/submit-epc-application') {
      // CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };
      
      // Handle preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }
      
      // Handle POST
      if (request.method === 'POST') {
        try {
          const data = await request.json();
          
          // Add metadata
          data.timestamp = new Date().toISOString();
          data.source = 'epc.saberrenewable.energy';
          data.apiVersion = '1.0';
          
          console.log('Form submission received:', data);
          
          // Forward to Power Automate
          const powerAutomateUrl = 'https://defaultdd0eeaf22c36470995546e2b2639c3.d1.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/25bb3274380b4684a5cd06911e03048d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=l9vFANVy7qrJ3lBl7rok4agZw9cWoolCw2tg_Y46kjY';
          
          try {
            const paResponse = await fetch(powerAutomateUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(data),
            });
            
            console.log('Power Automate response:', paResponse.status);
          } catch (paError) {
            console.error('Power Automate error:', paError);
          }
          
          // Always return success to avoid blocking user
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Application submitted successfully',
              referenceNumber: `EPC-${Date.now()}`,
              timestamp: data.timestamp
            }),
            { 
              status: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
          
        } catch (error) {
          console.error('Error processing submission:', error);
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'Error processing submission',
              error: error.message
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
      
      // Method not allowed
      return new Response('Method not allowed', { status: 405 });
    }
    
    // For /api/* routes not handled above, return a different message
    if (url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({
        message: 'API endpoint not found',
        path: url.pathname,
        timestamp: new Date().toISOString()
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // For all other requests, pass through to static files
    return env.ASSETS.fetch(request);
  },
};