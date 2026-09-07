"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiRequest } from "../lib/api";

const AuthContext = createContext(null);

function extractUser(response) {
  const user = response?.user ?? response?.data?.user;

  if (!user || typeof user !== "object" || Array.isArray(user)) {
    throw new Error("The authentication service returned an invalid response.");
  }

  return user;
}

function isUnauthorized(error) {
  return (
    error instanceof ApiError &&
    (error.status === 401 || error.statusCode === 401)
  );
}

export default function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(false);
  const operationRef = useRef(0);

  const refreshUser = useCallback(async () => {
    const operationId = ++operationRef.current;
    setLoading(true);

    try {
      const response = await apiRequest("/auth/me");
      const currentUser = extractUser(response);

      if (mountedRef.current && operationRef.current === operationId) {
        setUser(currentUser);
      }

      return currentUser;
    } catch (error) {
      if (isUnauthorized(error)) {
        if (mountedRef.current && operationRef.current === operationId) {
          setUser(null);
        }

        return null;
      }

      throw error;
    } finally {
      if (mountedRef.current && operationRef.current === operationId) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    refreshUser().catch(() => {
      if (mountedRef.current) {
        setLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
    };
  }, [refreshUser]);

  const login = useCallback(
    async (credentials) => {
      const operationId = ++operationRef.current;
      setLoading(true);

      try {
        const response = await apiRequest("/auth/login", {
          method: "POST",
          body: JSON.stringify(credentials),
        });
        const authenticatedUser = extractUser(response);

        if (mountedRef.current && operationRef.current === operationId) {
          setUser(authenticatedUser);
          router.refresh();
        }

        return authenticatedUser;
      } finally {
        if (mountedRef.current && operationRef.current === operationId) {
          setLoading(false);
        }
      }
    },
    [router],
  );

  const signup = useCallback(
    async (membershipDetails) => {
      const operationId = ++operationRef.current;
      setLoading(true);

      try {
        const response = await apiRequest("/auth/signup", {
          method: "POST",
          body: JSON.stringify(membershipDetails),
        });
        const authenticatedUser = extractUser(response);

        if (mountedRef.current && operationRef.current === operationId) {
          setUser(authenticatedUser);
          router.refresh();
        }

        return authenticatedUser;
      } finally {
        if (mountedRef.current && operationRef.current === operationId) {
          setLoading(false);
        }
      }
    },
    [router],
  );

  const logout = useCallback(async () => {
    const operationId = ++operationRef.current;
    setLoading(true);

    try {
      await apiRequest("/auth/logout", {
        method: "POST",
      });

      if (mountedRef.current && operationRef.current === operationId) {
        setUser(null);
        router.replace("/");
        router.refresh();
      }
    } finally {
      if (mountedRef.current && operationRef.current === operationId) {
        setLoading(false);
      }
    }
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      signup,
      logout,
      refreshUser,
    }),
    [user, loading, login, signup, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
