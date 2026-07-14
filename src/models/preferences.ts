import type { CursorMode, ThemeMode } from "./os-types";
import { readStorage, writeStorage } from "../services/storage";

const CURSOR_STORAGE_KEY = "illyune.cursor.v1";
const THEME_STORAGE_KEY = "illyune.theme.v1";

export interface Preferences {
    cursor: CursorMode;
    theme: ThemeMode;
}

export const isThemeMode = (value: unknown): value is ThemeMode =>
    value === "auto" || value === "day" || value === "night";

export const isCursorMode = (value: unknown): value is CursorMode =>
    value === "classic" || value === "dark";

export const loadPreferences = (): Preferences => {
    const cursor = readStorage(CURSOR_STORAGE_KEY);
    const theme = readStorage(THEME_STORAGE_KEY);
    return {
        cursor: isCursorMode(cursor) ? cursor : "classic",
        theme: isThemeMode(theme) ? theme : "auto",
    };
};

export const saveCursorPreference = (cursor: CursorMode) => {
    writeStorage(CURSOR_STORAGE_KEY, cursor);
};

export const saveThemePreference = (theme: ThemeMode) => {
    writeStorage(THEME_STORAGE_KEY, theme);
};
