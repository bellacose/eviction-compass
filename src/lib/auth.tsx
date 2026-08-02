import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import {
  linkAttorneyUser,
  isActivePrincipal,
  needsActivation,
  type AttorneyPrincipal,
} from "@/lib/attorney";

type AppRole = "super_admin" | "admin" | "client" | "attorney";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  client_id: string | null;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  attorney: AttorneyPrincipal | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isClient: boolean;
  isAttorney: boolean;
  attorneyNeedsActivation: boolean;
  refreshAttorney: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  roles: [],
  attorney: null,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  isClient: false,
  isAttorney: false,
  attorneyNeedsActivation: false,
  refreshAttorney: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [attorney, setAttorney] = useState<AttorneyPrincipal | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    const [profileRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    if (profileRes.data) setProfile(profileRes.data as Profile);
    const nextRoles = (rolesRes.data || []).map((r: any) => r.role as AppRole);
    setRoles(nextRoles);

    if (nextRoles.includes("attorney")) {
      // Sign-in only links the invited record; activation is a separate, explicit step.
      setAttorney(await linkAttorneyUser(userId));
    } else {
      setAttorney(null);
    }
  };

  const refreshAttorney = async () => {
    if (!user) return;
    setAttorney(await linkAttorneyUser(user.id));
  };

  useEffect(() => {
    let isMounted = true;

    // Listener for ONGOING auth changes (does NOT control loading)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Use setTimeout to avoid deadlocks
          setTimeout(() => {
            if (isMounted) fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setAttorney(null);
        }
      }
    );

    // INITIAL load (controls loading)
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserData(session.user.id);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setAttorney(null);
  };

  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const isSuperAdmin = roles.includes("super_admin");
  const isClient = roles.includes("client");
  const isAttorney = roles.includes("attorney") && isActivePrincipal(attorney);
  const attorneyNeedsActivation = roles.includes("attorney") && needsActivation(attorney);

  return (
    <AuthContext.Provider
      value={{
        user, session, profile, roles, attorney, loading,
        isAdmin, isSuperAdmin, isClient, isAttorney,
        attorneyNeedsActivation, refreshAttorney, signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
