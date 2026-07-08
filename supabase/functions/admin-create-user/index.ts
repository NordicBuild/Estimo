import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw new Error('Missing environment variables')
    }

    // 1. Verify Caller is platform admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('is_platform_admin')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.is_platform_admin !== true) {
      return new Response(JSON.stringify({ error: 'Forbidden: Requires platform admin' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Read Body
    const { email, full_name, role, company_id, send_invite } = await req.json()

    if (!email || !role || !company_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, role, or company_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const allowedRoles = ['admin', 'manager', 'user', 'viewer']
    if (!allowedRoles.includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Create Admin Client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    let createdUser
    let tempPassword

    if (send_invite !== false) {
      // Invite user
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name }
      })
      if (inviteError) {
        return new Response(JSON.stringify({ error: 'Failed to invite user', details: inviteError }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      createdUser = inviteData.user
    } else {
      // Create user with temp password
      tempPassword = crypto.randomUUID() + "Aa1!" // ensure some complexity
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name }
      })
      if (createError) {
        return new Response(JSON.stringify({ error: 'Failed to create user', details: createError }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      createdUser = createData.user
    }

    if (!createdUser) {
      return new Response(JSON.stringify({ error: 'User creation failed without error details' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Upsert profile
    const { error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: createdUser.id,
        email: email,
        full_name: full_name || null,
        role: role,
        company_id: company_id,
        is_platform_admin: false
      })

    if (upsertError) {
       // Rollback user creation if profile fails
       await supabaseAdmin.auth.admin.deleteUser(createdUser.id)
       return new Response(JSON.stringify({ error: 'Failed to create user profile', details: upsertError }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(
      JSON.stringify({
        userId: createdUser.id,
        email,
        invited: send_invite !== false,
        tempPassword
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
