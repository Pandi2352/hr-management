export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: <T>(key: string, value: T): void => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignored
    }
  },
  remove: (key: string): void => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignored
    }
  },
};
