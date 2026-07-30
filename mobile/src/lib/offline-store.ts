import type { CacheStore } from "@vision/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const mobileCacheStore: CacheStore = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
