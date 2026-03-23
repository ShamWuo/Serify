# Google OAuth Setup Guide

This guide will help you configure Google OAuth for your Serify application.

## Prerequisites

1. A Supabase project (already set up)
2. A Google Cloud Console project

## Step 1: Configure Google OAuth in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Choose **Web application** as the application type
6. Add authorized redirect URIs (IMPORTANT - add ALL of these):
   - **Required**: `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback`
     - Replace `YOUR_SUPABASE_PROJECT_REF` with your actual Supabase project reference (found in your Supabase URL)
   - For development: `http://localhost:3000/auth/callback`
   - For production: `https://yourdomain.com/auth/callback`
   
   **Note**: You MUST include Supabase's callback URL. Google redirects to Supabase first, then Supabase redirects to your app's `/auth/callback` page with hash fragments containing the session.
   
7. Copy the **Client ID** and **Client Secret**

## Step 2: Configure Google OAuth in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Navigate to **Authentication** > **Providers**
3. Find **Google** in the list and click to configure
4. Enable the Google provider
5. Enter your **Client ID** and **Client Secret** from Google Cloud Console
6. Save the configuration

## Step 3: Configure Redirect URLs in Supabase

1. In Supabase Dashboard, go to **Authentication** > **URL Configuration**
2. Add your site URL:
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`
3. Add redirect URLs:
   - `http://localhost:3000/auth/callback` (development)
   - `https://yourdomain.com/auth/callback` (production)
   
   **Note**: The app now uses Supabase's built-in OAuth handling with hash fragments, so the redirect goes directly to `/auth/callback` instead of the API route.

## Step 4: Environment Variables

Make sure you have these environment variables in your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # or your production URL
```

## Step 5: Test the OAuth Flow

1. Start your development server: `npm run dev`
2. Navigate to `/auth`
3. Click "Continue with Google"
4. You should be redirected to Google's sign-in page
5. After signing in, you'll be redirected back to your app

## Troubleshooting

### Error: "redirect_uri_mismatch"
- **Most common issue**: Make sure you've added `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback` to Google Cloud Console
- Verify the redirect URI in Google Cloud Console matches exactly (no trailing slashes, correct protocol)
- Check that you've added both the Supabase callback URL AND your app's callback URL

### Error: "Missing authorization code"
- This usually means the redirect URL configuration is incorrect
- See `TROUBLESHOOTING_OAUTH.md` for detailed debugging steps
- Most likely cause: Missing Supabase callback URL in Google Cloud Console

### Error: "Invalid client"
- Verify that your Google Client ID and Client Secret are correct in Supabase
- Make sure the OAuth consent screen is configured in Google Cloud Console

### Session not persisting
- Check that cookies are enabled in your browser
- Verify that your site URL is correctly set in Supabase

## Using Supabase MCP Server

If you have the Supabase MCP server configured, you can use it to verify and set up your database:

1. **List your projects** to find your project ID
2. **Check database tables** to verify the `profiles` table exists
3. **Apply migrations** to ensure OAuth users get profiles automatically

See `scripts/setup-oauth-with-mcp.md` for detailed MCP server usage instructions.

### Quick MCP Verification

```typescript
// 1. List your Supabase projects
mcp_Supabase_list_projects()

// 2. Get your project details (replace with your project ID)
mcp_Supabase_get_project({ id: "your-project-id" })

// 3. List tables to verify profiles table exists
mcp_Supabase_list_tables({ 
  project_id: "your-project-id",
  schemas: ["public"] 
})

// 4. Apply migration to ensure OAuth support (see scripts/verify-supabase-setup.ts)
mcp_Supabase_apply_migration({
  project_id: "your-project-id",
  name: "setup_oauth_profiles",
  query: "..." // Use updateProfilesForOAuth from verify-supabase-setup.ts
})
```

## Notes

- The OAuth flow uses PKCE (Proof Key for Code Exchange) for security
- Sessions are managed by Supabase and stored client-side
- User profiles are automatically created when a user signs in with Google for the first time (if you have a database trigger set up)
- Use the Supabase MCP server tools to verify and configure your database programmatically