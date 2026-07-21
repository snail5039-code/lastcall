import * as SecureStore from "expo-secure-store";

export const ADMIN_TOKEN_KEY = "lastcall.adminToken.v1";

export const getAdminToken = () => SecureStore.getItemAsync(ADMIN_TOKEN_KEY);

export const clearAdminToken = () => SecureStore.deleteItemAsync(ADMIN_TOKEN_KEY);
