import { createContext, useContext, useState, type ReactNode } from "react";

export interface AuthUser {
  token: string;
  userId: string;
  displayName: string;
  role: "TrainingCenter" | "Doctor" | "Admin";
}

interface AuthContextType {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

function readStored(): AuthUser | null {
  const raw = localStorage.getItem("user");
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStored);

  const login = (u: AuthUser) => {
    localStorage.setItem("token", u.token);
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
