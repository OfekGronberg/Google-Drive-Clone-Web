import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

function parseJwt(token) {
  try {
    const b = token.split(".")[1] || "";
    return JSON.parse(atob(b.replace(/-/g, "+").replace(/_/g, "/")));
  } catch (e) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [userId, setUserId] = useState(() => localStorage.getItem("userId") || null);

  const API = process.env.REACT_APP_API_BASE || "http://localhost:3000";

  const applyTheme = (theme) => {
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark", "theme-bball", "dark-mode");
    root.classList.add(theme === "dark" ? "theme-dark" : theme === "bball" ? "theme-bball" : "theme-light");
    if (theme === "dark") root.classList.add("dark-mode");
    try { localStorage.setItem("theme", theme); } catch (e) {}
  };

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      if (!userId) {
        const payload = parseJwt(token);
        if (payload && payload.userId) setUserId(String(payload.userId));
      }
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      setUserId(null);
    }
  }, [token]);

  const login = (newToken, explicitUserId) => {
    setToken(newToken);
    if (explicitUserId) setUserId(String(explicitUserId));
    else {
      const payload = parseJwt(newToken);
      if (payload && payload.userId) setUserId(String(payload.userId));
    }
    // After setting token/userId, fetch user's preferences and apply theme
    (async () => {
      try {
        const id = explicitUserId || (parseJwt(newToken) && parseJwt(newToken).userId);
        if (!id) return;
        const res = await fetch(`${API}/api/users/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.theme) applyTheme(data.theme);
      } catch (e) {
        // ignore
      }
    })();
  };

  const logout = () => {
    setToken(null);
    setUserId(null);
    // reset theme to default on logout
    applyTheme("light");
  };

  return (
    <AuthContext.Provider value={{ token, userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
