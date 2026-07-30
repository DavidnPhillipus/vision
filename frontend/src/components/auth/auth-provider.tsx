"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api, setApiToken, setApiUserId, type AuthUser } from "@/lib/api";

const TOKEN_KEY = "vision_token";
const USER_KEY = "vision_user";

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (body: {
    full_name: string;
    email: string;
    password: string;
    farm_name?: string;
    region?: string;
  }) => Promise<void>;
  logout: () => void;
};

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    const savedUser = typeof window !== "undefined" ? localStorage.getItem(USER_KEY) : null;
    if (!saved) {
      setApiToken(null);
      setApiUserId(null);
      setLoading(false);
      return;
    }
    setToken(saved);
    setApiToken(saved);
    if (savedUser) {
      try {
        const cached = JSON.parse(savedUser) as AuthUser;
        setUser(cached);
        setApiUserId(cached.id);
      } catch {
        /* ignore bad cache */
      }
    }
    api
      .me(saved)
      .then((u) => {
        setUser(u);
        setApiUserId(u.id);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      })
      .catch(() => {
        // Keep the session if we have a cached profile — farmer may be offline.
        if (!savedUser) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setApiToken(null);
          setApiUserId(null);
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password });
    localStorage.setItem(TOKEN_KEY, res.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setApiToken(res.access_token);
    setApiUserId(res.user.id);
    setToken(res.access_token);
    setUser(res.user);
  }, []);

  const register = React.useCallback(
    async (body: {
      full_name: string;
      email: string;
      password: string;
      farm_name?: string;
      region?: string;
    }) => {
      const res = await api.register(body);
      localStorage.setItem(TOKEN_KEY, res.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      setApiToken(res.access_token);
      setApiUserId(res.user.id);
      setToken(res.access_token);
      setUser(res.user);
    },
    [],
  );

  const logout = React.useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setApiToken(null);
    setApiUserId(null);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = React.useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand-100 text-veld-700">
        <p className="text-base font-medium">Opening Vision…</p>
      </div>
    );
  }
  if (!user) return null;
  return <>{children}</>;
}
