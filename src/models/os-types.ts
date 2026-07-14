export type Locale = "ru" | "en";

export type ThemeMode = "auto" | "day" | "night";

export type CursorMode = "classic" | "dark";

export interface LocaleChangeDetail {
    locale: Locale;
}

export interface ThemeChangeDetail {
    mode: ThemeMode;
}

export interface CursorChangeDetail {
    cursor: CursorMode;
}
