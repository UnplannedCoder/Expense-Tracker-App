import React, { createContext, useState, useEffect } from "react"
import api from "../services/api"

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)

  // `initializing` — true only while the app is restoring a saved session on
  // first load. AppLayout blocks on this so it never flashes "not logged in".
  const [initializing, setInitializing] = useState(true);

  // `loading` — true only during explicit async operations (login, register,
  // updateProfile, changePassword). Used to disable form buttons / show
  // spinners inside forms. AppLayout does NOT block on this.
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState(null);

  // Restore session from localStorage on first mount
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setInitializing(false);
        return;
      }
      try {
        const res = await api.get("/auth/profile");
        if (res.data.success) {
          setUser(res.data.data);
        } else {
          localStorage.removeItem("token");
        }
      } catch (err) {
        console.error("Failed to restore session", err);
        localStorage.removeItem("token");
      } finally {
        setInitializing(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/auth/login", { email, password });
      if (res.data.success) {
        const { token, ...userData } = res.data.data;
        localStorage.setItem("token", token);
        setUser(userData);
        return { success: true };
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        "Login failed. Please check your credentials.";
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, currency) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/auth/register", {
        name,
        email,
        password,
        currency,
      });
      if (res.data.success) {
        const { token, ...userData } = res.data.data;
        localStorage.setItem("token", token);
        setUser(userData);
        return { success: true };
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Registration failed. Try again.";
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.put("/auth/profile", profileData);
      if (res.data.success) {
        const { token, ...userData } = res.data.data;
        if (token) {
          localStorage.setItem("token", token);
        }
        setUser(userData);
        return { success: true };
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || "Profile update failed.";
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.put("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      return { success: res.data.success };
    } catch (err) {
      const errMsg = err.response?.data?.message || "Password update failed.";
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        loading,
        error,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
