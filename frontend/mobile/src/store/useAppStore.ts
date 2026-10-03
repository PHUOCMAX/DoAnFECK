import { create } from "zustand";

import type { LanguageCode } from "../translations";

import {
  getSavedLanguage,
  saveLanguage,
  getCurrentUser,
  saveCurrentUser,
  saveAuthToken,
  getAuthToken,
  removeCurrentUser,
  type LocalUser,
} from "../services/localStorage";

interface AppState {
  language: LanguageCode;
  initialized: boolean;

  user: LocalUser | null;
  token: string | null;
  isLoggedIn: boolean;

  setLanguage: (language: LanguageCode) => void;

  loadLanguage: () => Promise<void>;

  login: (
    user: LocalUser,
    token: string
  ) => Promise<void>;

  logout: () => Promise<void>;
}

export const useAppStore = create<AppState>(
  (set) => ({
    language: "vi",
    initialized: false,

    user: null,
    token: null,
    isLoggedIn: false,

    setLanguage: (language) => {
      set({ language });

      void saveLanguage(language).catch((error) => {
        console.warn("Failed to save language preference:", error);
      });
    },

    loadLanguage: async () => {
      try {
        const [savedLanguage, savedUser, savedToken] =
          await Promise.all([
            getSavedLanguage(),
            getCurrentUser(),
            getAuthToken(),
          ]);

        set({
          language: savedLanguage,
          user: savedUser,
          token: savedToken,
          isLoggedIn: !!savedUser && !!savedToken,
        });
      } catch (error) {
        console.warn("Failed to restore local app state:", error);
        set({
          language: "vi",
          user: null,
          token: null,
          isLoggedIn: false,
        });
      } finally {
        set({ initialized: true });
      }
    },

    login: async (user, token) => {
      try {
        await Promise.all([
          saveCurrentUser(user),
          saveAuthToken(token),
        ]);
      } catch (error) {
        await removeCurrentUser();
        throw error;
      }

      set({
        user,
        token,
        isLoggedIn: true,
      });
    },

    logout: async () => {
      try {
        await removeCurrentUser();
      } finally {
        set({
          user: null,
          token: null,
          isLoggedIn: false,
        });
      }
    },
  })
);
