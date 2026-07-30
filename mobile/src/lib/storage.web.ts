import AsyncStorage from "@react-native-async-storage/async-storage";

// expo-secure-store has no web implementation, so the web build uses
// AsyncStorage (localStorage) instead.
export async function getStoredItem(key: string): Promise<string | null> {
  return AsyncStorage.getItem(key);
}

export async function setStoredItem(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
}

export async function removeStoredItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
