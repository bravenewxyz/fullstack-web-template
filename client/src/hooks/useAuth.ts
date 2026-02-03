import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/store";
import { useEffect } from "react";
import { useLocation } from "wouter";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } =
    options ?? {};
  const [, setLocation] = useLocation();
  const store = useAuthStore();
  const utils = trpc.useUtils();

  // Fetch user from server when session exists
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !!store.session,
  });

  // Sync tRPC data to Zustand store
  useEffect(() => {
    if (meQuery.data !== undefined) {
      store.setUser(meQuery.data);
    }
    if (meQuery.error) {
      store.setError(meQuery.error);
    }
    store.setLoading(!!store.session && meQuery.isLoading);
  }, [meQuery.data, meQuery.error, meQuery.isLoading, store.session]);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (store.loading) return;
    if (store.session) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    setLocation(redirectPath);
  }, [redirectOnUnauthenticated, redirectPath, store.loading, store.session, setLocation]);

  const logout = async () => {
    await store.signOut();
    utils.auth.me.setData(undefined, null);
    await utils.auth.me.invalidate();
  };

  return {
    user: store.user,
    supabaseUser: store.supabaseUser,
    session: store.session,
    loading: store.loading,
    error: store.error,
    isAuthenticated: store.isAuthenticated,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
