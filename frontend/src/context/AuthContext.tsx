import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setToken, clearToken, getToken } from "@/src/api/client";

type User = {
  id: string;
  phone: string;
  shop_name: string;
  owner_name: string;
  shop_type: string;
  address?: string;
  license_number?: string;
} | null;

type AuthResult = { is_new_user: boolean };

type AuthState = {
  user: User;
  authed: boolean;
  loading: boolean;
  register: (phone: string, password: string) => Promise<AuthResult>;
  login: (phone: string, password: string) => Promise<AuthResult>;
  setupShop: (data: any) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api("/auth/me");
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        setAuthed(true);
        await refreshUser();
      }
      setLoading(false);
    })();
  }, [refreshUser]);

  const register = async (phone: string, password: string) => {
    const res = await api<{ token: string; is_new_user: boolean; user: User }>(
      "/auth/register",
      { method: "POST", body: { phone, password }, auth: false }
    );
    await setToken(res.token);
    setAuthed(true);
    setUser(res.user);
    return { is_new_user: res.is_new_user };
  };

  const login = async (phone: string, password: string) => {
    const res = await api<{ token: string; is_new_user: boolean; user: User }>(
      "/auth/login",
      { method: "POST", body: { phone, password }, auth: false }
    );
    await setToken(res.token);
    setAuthed(true);
    setUser(res.user);
    return { is_new_user: res.is_new_user };
  };

  const setupShop = async (data: any) => {
    const u = await api("/auth/setup-shop", { method: "POST", body: data });
    setUser(u);
  };

  const logout = async () => {
    await clearToken();
    setUser(null);
    setAuthed(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, authed, loading, register, login, setupShop, refreshUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
