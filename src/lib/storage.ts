import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/**
 * Single storage adapter for every persisted store. AsyncStorage maps to
 * localStorage on web and native storage on iOS/Android. Swapping to SQLite
 * later means changing this file only.
 */
export const appStorage = () => createJSONStorage(() => AsyncStorage);
