import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

// =============================================================================
// Auth Store
// =============================================================================

// User type from server (matches drizzle schema)
export interface AppUser {
  id: number;
  supabaseId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}

interface AuthState {
  // Supabase auth state
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  
  // App user state (from server, persisted)
  user: AppUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: unknown;

  // Actions
  setUser: (user: AppUser | null) => void;
  setError: (error: unknown) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
  _init: () => () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        session: null,
        supabaseUser: null,
        user: null,
        isAuthenticated: false,
        loading: true,
        error: null,

        setUser: (user) => {
          set({
            user,
            isAuthenticated: !!get().session && !!user,
          });
        },

        setError: (error) => set({ error }),

        setLoading: (loading) => set({ loading }),

        signOut: async () => {
          await supabase.auth.signOut();
          set({
            user: null,
            isAuthenticated: false,
            error: null,
          });
        },

        _init: () => {
          // If Supabase is not configured, skip auth initialization
          if (!isSupabaseConfigured) {
            set({ loading: false });
            return () => {};
          }
          
          // Get initial session
          supabase.auth.getSession().then(({ data: { session } }) => {
            set({
              session,
              supabaseUser: session?.user ?? null,
              loading: !session, // Keep loading if we have session (waiting for user fetch)
              isAuthenticated: !!session && !!get().user,
            });
          });

          // Listen for auth changes
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((_event, session) => {
            const hadSession = !!get().session;
            const hasSession = !!session;
            
            set({
              session,
              supabaseUser: session?.user ?? null,
              // Clear user if logged out
              ...(hadSession && !hasSession ? { user: null, isAuthenticated: false } : {}),
            });
          });

          return () => subscription.unsubscribe();
        },
      }),
      {
        name: "auth-storage",
        partialize: (state) => ({
          user: state.user,
        }),
      }
    ),
    { name: "auth-store" }
  )
);

// =============================================================================
// Theme Store
// =============================================================================

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  switchable: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  _initTheme: (defaultTheme: Theme, switchable: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  devtools(
    persist(
      (set, get) => ({
        theme: "light",
        switchable: false,

        setTheme: (theme) => {
          set({ theme });
          applyThemeToDOM(theme);
        },

        toggleTheme: () => {
          const newTheme = get().theme === "light" ? "dark" : "light";
          get().setTheme(newTheme);
        },

        _initTheme: (defaultTheme, switchable) => {
          const stored = get().theme;
          const theme = switchable && stored ? stored : defaultTheme;
          set({ theme, switchable });
          applyThemeToDOM(theme);
        },
      }),
      {
        name: "theme-storage",
        partialize: (state) => ({ theme: state.theme }),
      }
    ),
    { name: "theme-store" }
  )
);

function applyThemeToDOM(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

// =============================================================================
// App Store (general app state)
// =============================================================================

interface AppState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        count: 0,
        increment: () => set((state) => ({ count: state.count + 1 })),
        decrement: () => set((state) => ({ count: state.count - 1 })),
        reset: () => set({ count: 0 }),
      }),
      {
        name: "app-storage",
      }
    ),
    { name: "app-store" }
  )
);
