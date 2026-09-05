import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const COMMODITY_API_KEY = Deno.env.get('COMMODITY_API_KEY');
const COMMODITY_BASE = 'https://api.commoditypriceapi.com/v2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface QuotaResult {
  calls_used: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl!, serviceKey!);

  const url = new URL(req.url);
  const path = url.pathname.replace('/functions/v1/commodity-price-proxy', '');

  // Increment quota
  const { data: quotaData, error: quotaError } = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/increment_quota`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey!,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    }
  ).then(r => r.json());

  if (quotaError) {
    console.error('Quota increment failed:', quotaError);
  }

  const callsUsed = (quotaData as any)?.calls_used ?? 0;

  if (callsUsed >= 2000) {
    return new Response(JSON.stringify({ error: 'Quota exceeded', callsUsed }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const targetUrl = `${COMMODITY_BASE}${path}?${url.searchParams.toString()}&apiKey=${COMMODITY_API_KEY}`;

  const response = await fetch(targetUrl, {
    method: req.method,
    headers: { 'Accept': 'application/json' },
  });

  const data = await response.json();

  return new Response(JSON.stringify({ ...data, quota: { used: callsUsed + 1, limit: 2000 } }), {
    status: response.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

serve((req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  // This won't be reached due to the first serve() call, but needed for type checking
  return new Response('Method not allowed', { status: 405 });
});