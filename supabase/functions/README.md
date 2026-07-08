# Supabase Edge Functions

This folder contains Deno/TS Edge functions for the admin portal.

## Deployment

Deploy the functions using the Supabase CLI:

```bash
supabase functions deploy admin-create-user
supabase functions deploy admin-delete-user
```

## Secrets

You must set the `SUPABASE_SERVICE_ROLE_KEY` secret for these functions to work. This key bypasses RLS and is used to create and delete users via the Supabase Admin API.

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```
