import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertCircle } from "lucide-react";

interface AuthorizationDetails {
  client?: { name?: string; redirect_uri?: string } | null;
  redirect_url?: string;
  redirect_to?: string;
  scopes?: string[];
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      setUserEmail(sess.session.user.email ?? null);
      const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = (data as AuthorizationDetails)?.redirect_url ?? (data as AuthorizationDetails)?.redirect_to;
      if (immediate && !(data as AuthorizationDetails)?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data as AuthorizationDetails);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await supabase.auth.oauth.approveAuthorization(authorizationId)
      : await supabase.auth.oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = (data as AuthorizationDetails)?.redirect_url ?? (data as AuthorizationDetails)?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Authorization request failed
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-muted-foreground">Loading authorization request…</div>
      </div>
    );
  }

  const clientName = details.client?.name ?? "an app";
  const redirectUri = details.client?.redirect_uri ?? "unknown";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-6 w-6" />
            <h1 className="text-xl font-bold">Connect {clientName} to Evict OS</h1>
          </div>
          <CardDescription>
            {clientName} will be able to call Evict OS tools while you are signed in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">Signed in as {userEmail ?? "your account"}</p>
            <p className="text-muted-foreground">Redirect URI: {redirectUri}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            This does not bypass Evict OS permissions or backend policies. The data you can access depends on your role.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => decide(true)} disabled={busy} className="flex-1">
              Approve
            </Button>
            <Button variant="outline" onClick={() => decide(false)} disabled={busy} className="flex-1">
              Deny
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
