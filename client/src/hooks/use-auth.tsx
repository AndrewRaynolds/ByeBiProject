import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
};

type LoginData = { email: string; password: string };
type RegisterData = {
  email: string;
  password: string;
  username?: string;
  fullName?: string;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  loginMutation: UseMutationResult<AuthUser | null, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<AuthUser | null, Error, RegisterData>;
  updateUser: (updates: Partial<AuthUser>) => void;
};

function mapSupabaseUser(supabaseUser: SupabaseUser): AuthUser {
  const meta = supabaseUser.user_metadata || {};
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || "",
    username: meta.username || supabaseUser.email?.split("@")[0] || "user",
    firstName: meta.firstName || meta.first_name,
    lastName: meta.lastName || meta.last_name,
  };
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error: err }) => {
      if (err) setError(new Error(err.message));
      setUser(session?.user ? mapSupabaseUser(session.user) : null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? mapSupabaseUser(session.user) : null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginMutation = useMutation<AuthUser | null, Error, LoginData>({
    mutationFn: async ({ email, password }) => {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) throw new Error(err.message);
      return data.user ? mapSupabaseUser(data.user) : null;
    },
    onSuccess: (userData) => {
      toast({
        title: "Login effettuato",
        description: userData ? `Bentornato, ${userData.username}!` : "Benvenuto!",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Login fallito",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation<AuthUser | null, Error, RegisterData>({
    mutationFn: async ({ email, password, username, fullName }) => {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || email.split("@")[0],
            firstName: fullName?.split(" ")[0] || "",
            lastName: fullName?.split(" ").slice(1).join(" ") || "",
          },
        },
      });
      if (err) throw new Error(err.message);
      return data.user ? mapSupabaseUser(data.user) : null;
    },
    onSuccess: () => {
      toast({
        title: "Registrazione completata",
        description: "Benvenuto! Controlla la tua email per confermare l'account.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Registrazione fallita",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      const { error: err } = await supabase.auth.signOut();
      if (err) throw new Error(err.message);
    },
    onSuccess: () => {
      setUser(null);
      toast({ title: "Disconnesso", description: "Arrivederci!" });
    },
    onError: (err: Error) => {
      toast({
        title: "Errore logout",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateUser = (updates: Partial<AuthUser>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        isAuthenticated: !!user,
        loginMutation,
        logoutMutation,
        registerMutation,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
