export const readStorage = (key: string) => {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
};

export const writeStorage = (key: string, value: string) => {
    try {
        window.localStorage.setItem(key, value);
    } catch {
        // Settings and cached data remain usable for the current page session.
    }
};
