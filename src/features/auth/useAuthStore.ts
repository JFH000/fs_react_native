import { create } from "zustand";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../../shared/lib/firebase";

interface AuthState {
  user: User | null;
  isLoading: boolean;
}

export const useAuthStore = create<AuthState>(() => ({
  user: null,
  isLoading: true,
}));

onAuthStateChanged(auth, (user) => {
  useAuthStore.setState({ user, isLoading: false });
});
