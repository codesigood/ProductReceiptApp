import React, { createContext, useContext, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom"; // Added a comment to force re-evaluation

type User = {
  id: number;
  email: string;
  role: "admin" | "sales_person";
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    const storedToken = window.sessionStorage.getItem("token");
    console.log("AuthContext: Initializing token from sessionStorage:", storedToken);
    return storedToken;
  });
  const navigate = useNavigate();

  const login = async (email: string, password: string) => {
    try {

      // ✅ Ensure preload has injected window.api
      if (!window.api?.user?.login) {
        console.error("❌ window.api.user.login is not available. Check preload.ts or BrowserWindow preload path.");
        throw new Error("IPC bridge not loaded. Please restart the app.");
      }

      const result = await window.api.user.login(email, password);
      console.log("Raw Login result from IPC:", result);

      if (!result) {
        console.log("No response from login API, result is falsy:", result);
        throw new Error("Login failed: No response from server.");
      }

      if (result.success && result.user && result.token) {
        const loggedInUser: User = { ...result.user };
        setUser(loggedInUser);
        setToken(result.token);

        window.sessionStorage.setItem("token", result.token);
        console.log("AuthContext: Token set after successful login:", result.token);

        if (loggedInUser.role === "admin") {
          navigate("/admin/dashboard");
        } else {
          navigate("/sales/receipt");
        }
      } else {
        console.log("Login failed, result.success is false. Message:", result.message);
        throw new Error(result.message || "Login failed: Please check your credentials.");
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = () => {
    if (token && window.api?.user?.logout) {
      window.api.user.logout(token);
    }
    setUser(null);
    console.log("AuthContext: Logging out, clearing token.");
    setToken(null);
    window.sessionStorage.removeItem("token");
    navigate("/login");
  };

  const isAuthenticated = !!token;
  console.log("AuthContext: isAuthenticated:", isAuthenticated, "Token:", token);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
