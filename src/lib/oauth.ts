import { supabase } from "@/integrations/supabase/client";

interface OAuthAuthorizationDetails {
  client?: { name?: string; redirect_uri?: string } | null;
  redirect_url?: string;
  redirect_to?: string;
  scopes?: string[];
}

interface OAuthApi {
  getAuthorizationDetails: (authorizationId: string) => Promise<{
    data: OAuthAuthorizationDetails | null;
    error: { message: string } | null;
  }>;
  approveAuthorization: (authorizationId: string) => Promise<{
    data: OAuthAuthorizationDetails | null;
    error: { message: string } | null;
  }>;
  denyAuthorization: (authorizationId: string) => Promise<{
    data: OAuthAuthorizationDetails | null;
    error: { message: string } | null;
  }>;
}

export const oauthApi: OAuthApi = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
