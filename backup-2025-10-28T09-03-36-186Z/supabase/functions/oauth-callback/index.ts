import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface OAuthPlatformConfig {
  tokenUrl: string;
  profileUrl: string;
  getUsernameFromProfile: (profile: any) => string;
}

const platformConfigs: Record<string, OAuthPlatformConfig> = {
  facebook: {
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    profileUrl: 'https://graph.facebook.com/me?fields=id,name',
    getUsernameFromProfile: (profile) => profile.name || profile.id
  },
  twitter: {
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    profileUrl: 'https://api.twitter.com/2/users/me',
    getUsernameFromProfile: (profile) => profile.data?.username || profile.data?.id
  },
  linkedin: {
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    profileUrl: 'https://api.linkedin.com/v2/me',
    getUsernameFromProfile: (profile) => `${profile.localizedFirstName} ${profile.localizedLastName}`
  },
  instagram: {
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    profileUrl: 'https://graph.facebook.com/me?fields=id,username',
    getUsernameFromProfile: (profile) => profile.username || profile.id
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const platform = url.searchParams.get('platform');
    const error = url.searchParams.get('error');

    if (error) {
      return Response.redirect(`${Deno.env.get('FRONTEND_URL')}/dashboard?oauth_error=${error}`);
    }

    if (!code || !platform || !state) {
      throw new Error('Missing required parameters');
    }

    const stateData = JSON.parse(atob(state));
    const { brandId, userId } = stateData;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { data: oauthSettings } = await supabase
      .from('oauth_settings')
      .select('*')
      .eq('platform', platform)
      .eq('is_active', true)
      .single();

    if (!oauthSettings) {
      throw new Error(`OAuth not configured for platform: ${platform}`);
    }

    const config = platformConfigs[platform];
    if (!config) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const tokenParams = new URLSearchParams({
      client_id: oauthSettings.client_id,
      client_secret: oauthSettings.client_secret,
      code: code,
      redirect_uri: oauthSettings.redirect_uri,
      grant_type: 'authorization_code'
    });

    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenParams.toString()
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in;

    const profileResponse = await fetch(config.profileUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch profile');
    }

    const profileData = await profileResponse.json();
    const username = config.getUsernameFromProfile(profileData);

    const { data: account, error: accountError } = await supabase
      .from('social_media_accounts')
      .insert({
        brand_id: brandId,
        platform: platform,
        platform_user_id: profileData.id || profileData.data?.id,
        platform_username: username,
        is_active: true
      })
      .select()
      .single();

    if (accountError) {
      throw accountError;
    }

    const expiresAt = expiresIn 
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    await supabase
      .from('social_media_credentials')
      .insert({
        account_id: account.id,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt,
        scope: tokenData.scope,
        raw_data: profileData
      });

    return Response.redirect(
      `${Deno.env.get('FRONTEND_URL')}/dashboard?oauth_success=true&platform=${platform}`
    );

  } catch (error) {
    console.error('OAuth callback error:', error);
    return Response.redirect(
      `${Deno.env.get('FRONTEND_URL')}/dashboard?oauth_error=${encodeURIComponent(error.message)}`
    );
  }
});