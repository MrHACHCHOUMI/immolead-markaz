"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/lib/types/database";
import { prefetchNav } from "@/lib/queries";

const USER_KEY = "crm-user";

type AuthState = {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  logout: async () => {},
});

function readCachedUser(): User | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = readCachedUser();
    if (cached) {
      setUser(cached);
      setLoading(false);
    }

    const supabase = createClient();
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        sessionStorage.removeItem(USER_KEY);
        setUser(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (data) {
        sessionStorage.setItem(USER_KEY, JSON.stringify(data));
        setUser(data as User);
        prefetchNav("/dashboard");
        prefetchNav("/projets");
        prefetchNav("/leads");
        prefetchNav("/visites");
        prefetchNav("/ventes");
        prefetchNav("/depenses");
        prefetchNav("/equipe");
        prefetchNav("/rapports");
      }
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      logout: async () => {
        sessionStorage.removeItem(USER_KEY);
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.href = "/login";
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
