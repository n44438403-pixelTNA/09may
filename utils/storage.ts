import localforage from 'localforage';

localforage.config({
  name: 'nst_storage'
});

export const storage = {
  getItem: async <T = any>(key: string): Promise<T | null> => {
    try {
      return await localforage.getItem<T>(key);
    } catch (err) {
      console.error(`Error reading ${key} from localforage:`, err);
      return null;
    }
  },

  setItem: async (key: string, value: any): Promise<void> => {
    try {
      await localforage.setItem(key, value);
    } catch (err) {
      console.error(`Error writing ${key} to localforage:`, err);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      await localforage.removeItem(key);
    } catch (err) {
      console.error(`Error removing ${key} from localforage:`, err);
    }
  },

  clear: async (): Promise<void> => {
    try {
      await localforage.clear();
      console.log('IndexedDB cleared successfully via localforage.');
    } catch (err) {
      console.error('Error clearing localforage:', err);
    }
  }
};
