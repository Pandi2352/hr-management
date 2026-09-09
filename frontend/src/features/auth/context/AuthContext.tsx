import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { AuthUser, LoginPayload } from "../api/auth.api";
import { authApi } from "../api/auth.api";
import { storage } from "../../../utils/storage";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  setSession: (user: AuthUser, accessToken: string) => void;
  updateUser: (partialUser: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session from localStorage on app boot
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("peopleos_user");
      const token = localStorage.getItem("peopleos_access_token");

      if (storedUser && token) {
        const parsed = JSON.parse(storedUser);
        // Synchronize or clear user_avatar strictly based on active user
        if (parsed.avatarUrl) {
          localStorage.setItem("user_avatar", parsed.avatarUrl);
        } else {
          localStorage.removeItem("user_avatar");
        }
        setUser(parsed);
      } else {
        localStorage.removeItem("user_avatar");
      }
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Listen for multi-component user profile updates
  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      if (e.detail) {
        setUser((prev) => {
          if (!prev) return prev;
          const next = { ...prev, ...e.detail };
          localStorage.setItem("peopleos_user", JSON.stringify(next));
          if (next.avatarUrl) {
            localStorage.setItem("user_avatar", next.avatarUrl);
          } else {
            localStorage.removeItem("user_avatar");
          }
          return next;
        });
      }
    };
    window.addEventListener("user_profile_updated", handleProfileUpdate);
    return () => window.removeEventListener("user_profile_updated", handleProfileUpdate);
  }, []);

  const login = async (payload: LoginPayload): Promise<AuthUser> => {
    const data = await authApi.login(payload);
    localStorage.setItem("peopleos_access_token", data.accessToken);
    localStorage.setItem("peopleos_user", JSON.stringify(data.user));

    if (data.user.avatarUrl) {
      localStorage.setItem("user_avatar", data.user.avatarUrl);
    } else {
      localStorage.removeItem("user_avatar");
    }

    if (payload.rememberMe) {
      storage.set("peopleos_remembered_email", payload.email.trim());
      storage.set("peopleos_remember_me", true);
    } else {
      storage.remove("peopleos_remembered_email");
      storage.set("peopleos_remember_me", false);
    }

    setUser(data.user);
    window.dispatchEvent(
      new CustomEvent("user_profile_updated", {
        detail: { avatarUrl: data.user.avatarUrl || null, name: data.user.name },
      })
    );
    return data.user;
  };

  const setSession = (nextUser: AuthUser, accessToken: string) => {
    localStorage.setItem("peopleos_access_token", accessToken);
    localStorage.setItem("peopleos_user", JSON.stringify(nextUser));
    if (nextUser.avatarUrl) {
      localStorage.setItem("user_avatar", nextUser.avatarUrl);
    } else {
      localStorage.removeItem("user_avatar");
    }
    setUser(nextUser);
    window.dispatchEvent(
      new CustomEvent("user_profile_updated", {
        detail: { avatarUrl: nextUser.avatarUrl || null, name: nextUser.name },
      })
    );
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignored
    } finally {
      localStorage.removeItem("peopleos_access_token");
      localStorage.removeItem("peopleos_user");
      localStorage.removeItem("user_avatar");
      setUser(null);
      window.dispatchEvent(
        new CustomEvent("user_profile_updated", {
          detail: { avatarUrl: null, name: null },
        })
      );
    }
  };

  const updateUser = (partialUser: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...partialUser };
      localStorage.setItem("peopleos_user", JSON.stringify(updated));
      if (updated.avatarUrl) {
        localStorage.setItem("user_avatar", updated.avatarUrl);
      } else {
        localStorage.removeItem("user_avatar");
      }
      window.dispatchEvent(
        new CustomEvent("user_profile_updated", { detail: updated })
      );
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        setSession,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
