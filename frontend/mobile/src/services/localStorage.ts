import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AuthUser } from "../../../../shared/types/auth";

import type { LanguageCode } from "../translations";

/* =========================
   LANGUAGE
========================= */

const LANGUAGE_KEY = "app_language";

export async function saveLanguage(
  language: LanguageCode
) {
  await AsyncStorage.setItem(
    LANGUAGE_KEY,
    language
  );
}

export async function getSavedLanguage(): Promise<LanguageCode> {
  const language =
    await AsyncStorage.getItem(LANGUAGE_KEY);

  if (
    language === "vi" ||
    language === "en" ||
    language === "zh"
  ) {
    return language;
  }

  return "vi";
}

/* =========================
   AUTH
========================= */

const USER_KEY = "current_user";
const TOKEN_KEY = "auth_token";

export type LocalUser = AuthUser;

export async function saveCurrentUser(
  user: LocalUser
) {
  await AsyncStorage.setItem(
    USER_KEY,
    JSON.stringify(user)
  );
}

export async function getCurrentUser(): Promise<LocalUser | null> {
  const data =
    await AsyncStorage.getItem(USER_KEY);

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function saveAuthToken(
  token: string
) {
  await AsyncStorage.setItem(
    TOKEN_KEY,
    token
  );
}

export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function removeCurrentUser() {
  await AsyncStorage.multiRemove([
    USER_KEY,
    TOKEN_KEY,
  ]);
}
