import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const authHeader = req.headers.get('Authorization')

    if (!supabaseUrl || !serviceRoleKey || !anonKey || !authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing required environment or auth context' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (user.user_metadata?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const body = await req.json()
    const action = body?.action

    if (action === 'list') {
      const { data, error } = await adminClient.auth.admin.listUsers()
      if (error) throw error

      const users = (data.users || []).map((authUser) => ({
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        role: authUser.user_metadata?.role === 'admin' ? 'admin' : 'staff',
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
      }))

      return new Response(
        JSON.stringify({ users }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'create') {
      const email = String(body?.email || '').trim().toLowerCase()
      const password = String(body?.password || '')
      const name = String(body?.name || '').trim()
      const role = body?.role === 'admin' ? 'admin' : 'staff'

      if (!email || !password || !name) {
        return new Response(
          JSON.stringify({ error: 'Name, email, and password are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role,
        },
      })

      if (error) throw error

      return new Response(
        JSON.stringify({ user: data.user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'updateRole') {
      const userId = String(body?.userId || '')
      const role = body?.role === 'admin' ? 'admin' : 'staff'

      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: existingUserData, error: existingUserError } = await adminClient.auth.admin.getUserById(userId)
      if (existingUserError || !existingUserData.user) throw existingUserError || new Error('User not found')

      const existingMetadata = existingUserData.user.user_metadata || {}
      const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingMetadata,
          role,
        },
      })

      if (error) throw error

      return new Response(
        JSON.stringify({ user: data.user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Unsupported action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('manage-users error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
