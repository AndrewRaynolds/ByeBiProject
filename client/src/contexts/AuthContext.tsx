import { useAuth as useAuthFromHook, AuthProvider, type AuthUser } from "@/hooks/use-auth";

export { AuthProvider };
export type { AuthUser };

export function useAuth() {
  const auth = useAuthFromHook();
  return {
    ...auth,
    login: (_userData: AuthUser) => {
    },
    logout: () => auth.logoutMutation.mutate(),
  };
}
