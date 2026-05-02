import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, clearTokens, getRefreshToken, setTokens } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const t = localStorage.getItem("access_token");
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api("/api/auth/me");
      setUser(me);
    } catch {
      const rt = getRefreshToken();
      if (rt) {
        try {
          const data = await api("/api/auth/refresh", {
            method: "POST",
            body: JSON.stringify({ refresh_token: rt }),
          });
          setTokens(data.access_token, data.refresh_token);
          const me = await api("/api/auth/me");
          setUser(me);
        } catch {
          clearTokens();
          setUser(null);
        }
      } else {
        clearTokens();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = async (email, password) => {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setTokens(data.access_token, data.refresh_token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshUser: loadMe,
      setUserFromTokens: (data) => {
        setTokens(data.access_token, data.refresh_token);
        setUser(data.user);
      },
    }),
    [user, loading, loadMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
