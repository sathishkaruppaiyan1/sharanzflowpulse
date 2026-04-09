
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const {
      order_number,
      customer_phone,
      customer_name,
      tracking_number,
      carrier_name,
      tracking_url
    } = await req.json()

    console.log('=== WHATSAPP NOTIFICATION START ===')
    console.log('Order:', order_number, 'Phone:', customer_phone)

    if (!customer_phone || !tracking_number) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: customer_phone, tracking_number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Interakt API configuration from system_settings
    const { data: configData, error: configError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'api_configs')
      .single()

    if (configError || !configData?.value) {
      console.error('Error fetching API configurations:', configError)
      return new Response(
        JSON.stringify({ error: 'API configurations not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiConfigs = configData.value as any
    const interaktConfig = apiConfigs.interakt

    if (!interaktConfig?.enabled) {
      return new Response(
        JSON.stringify({ error: 'Interakt API is not enabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!interaktConfig.api_key || !interaktConfig.base_url) {
      return new Response(
        JSON.stringify({ error: 'Interakt API not properly configured - missing api_key or base_url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format phone number (remove non-digits, add 91 prefix for Indian numbers)
    const formatPhone = (phone: string): string => {
      const digits = phone.replace(/[^\d]/g, '')
      if (digits.length === 10 && /^[6-9]/.test(digits)) return `91${digits}`
      if (digits.length === 12 && digits.startsWith('91')) return digits
      if (digits.length === 13 && digits.startsWith('91')) return digits.substring(0, 12)
      return digits
    }

    const formattedPhone = formatPhone(customer_phone)
    if (!formattedPhone) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean API key (remove Bearer prefix if present)
    const cleanApiKey = interaktConfig.api_key.replace(/^Bearer\s+/i, '')

    // Build Interakt request body
    const requestBody = {
      fullPhoneNumber: formattedPhone,
      callbackData: 'order_tracking_information',
      type: 'Template',
      template: {
        name: 'order_tracking_information',
        languageCode: 'en',
        headerValues: [],
        bodyValues: [
          order_number,           // {{1}} - Order ID
          tracking_number,        // {{2}} - Tracking ID
          carrier_name || 'Courier', // {{3}} - Courier name
          customer_name || 'Customer' // {{4}} - Customer name
        ],
        buttonValues: {}
      }
    }

    console.log('Sending to Interakt:', JSON.stringify(requestBody))

    const response = await fetch(`${interaktConfig.base_url}/v1/public/message/`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${cleanApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    console.log('Interakt response status:', response.status)
    console.log('Interakt response:', responseText)

    if (!response.ok) {
      console.error('Interakt API error:', response.status, responseText)
      return new Response(
        JSON.stringify({ error: 'Interakt API failed', status: response.status, details: responseText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let result
    try {
      result = JSON.parse(responseText)
    } catch {
      // HTTP 200/201 with non-JSON response is still success
      if (response.status === 200 || response.status === 201) {
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return new Response(
        JSON.stringify({ error: 'Invalid response from Interakt' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (result.error || result.success === false || result.result === false) {
      return new Response(
        JSON.stringify({ error: 'Interakt returned error', details: result }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('=== WHATSAPP NOTIFICATION SUCCESS ===')

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== WHATSAPP NOTIFICATION ERROR ===', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
