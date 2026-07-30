import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, AuthResponse, AuthUser, setApiToken, setApiUserId } from "../lib/api";
import { getStoredItem, removeStoredItem, setStoredItem } from "../lib/storage";

const TOKEN_KEY = "vision_token";
const USER_KEY = "vision_user";

type AuthContextValue = {
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
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function saveSession(res: AuthResponse) {
  await setStoredItem(TOKEN_KEY, res.access_token);
  await setStoredItem(USER_KEY, JSON.stringify(res.user));
  setApiToken(res.access_token);
  setApiUserId(res.user.id);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = await getStoredItem(TOKEN_KEY);
        const savedUser = await getStoredItem(USER_KEY);
        if (!saved) {
          setApiToken(null);
          setApiUserId(null);
          return;
        }
        setApiToken(saved);
        setToken(saved);
        if (savedUser) {
          try {
            const cached = JSON.parse(savedUser) as AuthUser;
            setUser(cached);
            setApiUserId(cached.id);
          } catch {
            /* ignore */
          }
        }
        try {
          const me = await api.me(saved);
          setApiUserId(me.id);
          setUser(me);
          await setStoredItem(USER_KEY, JSON.stringify(me));
        } catch {
          // Stay signed in with cached profile when offline.
          if (!savedUser) {
            setApiToken(null);
            setApiUserId(null);
            setToken(null);
            setUser(null);
            await removeStoredItem(TOKEN_KEY);
          }
        }
      } catch {
        setApiToken(null);
        setApiUserId(null);
        await removeStoredItem(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const applyAuth = useCallback(async (res: AuthResponse) => {
    await saveSession(res);
    setToken(res.access_token);
    setUser(res.user);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login({ email, password });
      await applyAuth(res);
    },
    [applyAuth],
  );

  const register = useCallback(
    async (body: {
      full_name: string;
      email: string;
      password: string;
      farm_name?: string;
      region?: string;
    }) => {
      const res = await api.register(body);
      await applyAuth(res);
    },
    [applyAuth],
  );

  const logout = useCallback(async () => {
    await removeStoredItem(TOKEN_KEY);
    await removeStoredItem(USER_KEY);
    setApiToken(null);
    setApiUserId(null);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
