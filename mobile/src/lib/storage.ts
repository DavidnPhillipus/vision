import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

// Native builds keep the JWT in the OS keychain, but some dev clients ship
// without the native module, so fall back to AsyncStorage instead of crashing.
let secureAvailable: boolean | null = null;

async function canUseSecureStore(): Promise<boolean> {
  if (secureAvailable !== null) return secureAvailable;
  try {
    secureAvailable = await SecureStore.isAvailableAsync();
  } catch {
    secureAvailable = false;
  }
  return secureAvailable;
}

export async function getStoredItem(key: string): Promise<string | null> {
  if (await canUseSecureStore()) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      secureAvailable = false;
    }
  }
  return AsyncStorage.getItem(key);
}

export async function setStoredItem(key: string, value: string): Promise<void> {
  if (await canUseSecureStore()) {
    try {
      await SecureStore.setItemAsync(key, value);
      return;
    } catch {
      secureAvailable = false;
    }
  }
  await AsyncStorage.setItem(key, value);
}

export async function removeStoredItem(key: string): Promise<void> {
  if (await canUseSecureStore()) {
    try {
      await SecureStore.deleteItemAsync(key);
      return;
    } catch {
      secureAvailable = false;
    }
  }
  await AsyncStorage.removeItem(key);
}
