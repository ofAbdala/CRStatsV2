import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import type { Session } from "@supabase/supabase-js";
import { api, ApiError } from "@/lib/api";
import { getSupabaseClient } from "@/lib/supabaseClient";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setSessionLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setSessionLoaded(true);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const accessToken = session?.access_token ?? null;

  const { data: user, isLoading: userLoading } = useQuery<User | null>({
    queryKey: ["user"],
    enabled: Boolean(accessToken),
    retry: false,
    queryFn: async () => {
      try {
        return await api.auth.getUser();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await getSupabaseClient().auth.signOut().catch(() => undefined);
          return null;
        }
        throw err;
      }
    },
  });

  return {
    user: user ?? undefined,
    isLoading: !sessionLoaded || (Boolean(accessToken) && userLoading),
    isAuthenticated: Boolean(accessToken && user),
  };
}
