import type { Locale, LocaleChangeDetail } from "../models/os-types";
import { readStorage, writeStorage } from "./storage";

export const LOCALE_STORAGE_KEY = "illyune.locale.v1";

const PAGE_COPY = {
    ru: {
        title: "Ｉ ｌ ｌ ｙ ｕ ｎ ｅ  Ｏ Ｓ ™",
        description:
            "Личная страница Illyune в виде ретро-операционной системы с контактами и живым бассейном.",
    },
    en: {
        title: "Ｉ ｌ ｌ ｙ ｕ ｎ ｅ  Ｏ Ｓ ™",
        description:
            "Illyune's personal page: a retro operating system with contacts and a living pool.",
    },
} as const;

const ruMessages = {
    "app.telegram": "Telegram",
    "app.github": "GitHub",
    "app.discord": "Discord",
    "app.x": "X",
    "app.email": "Почта",
    "app.settings": "Настройки",
    "launcher.telegram": "Открыть Telegram",
    "launcher.github": "Открыть GitHub",
    "launcher.discord": "Открыть Discord",
    "launcher.x": "Открыть X",
    "launcher.email": "Открыть почту",
    "launcher.settings": "Открыть настройки",
    "launcher.aria": "Приложения",
    "launcher.open": "Открыть {app}",
    "launcher.minimize": "Свернуть {app}",
    "launcher.close": "Закрыть {app}",
    "window.telegram.title": "TELEGRAM",
    "window.github.title": "GITHUB",
    "window.discord.title": "DISCORD",
    "window.x.title": "X / TWITTER",
    "window.email.title": "ПОЧТА",
    "window.settings.title": "НАСТРОЙКИ",
    "window.telegram.close": "Закрыть Telegram",
    "window.github.close": "Закрыть GitHub",
    "window.discord.close": "Закрыть Discord",
    "window.x.close": "Закрыть X",
    "window.email.close": "Закрыть почту",
    "window.settings.close": "Закрыть настройки",
    "system.aria": "Системная панель",
    "windows.aria": "Открытые приложения",
    "boot.aria": "Загрузка Illyune OS™",
    "boot.progress": "Прогресс загрузки",
    "action.open_original": "Открыть оригинал",
    "profile.telegram.bio": "Личные сообщения и быстрый способ связаться со мной.",
    "profile.discord.bio": "Мой профиль Discord. Добавляйте по имени пользователя moonfoxy.",
    "profile.x.bio": "Профиль Illyune в X под именем @_MoonFoxy.",
    "settings.general": "Общие",
    "settings.themes": "Оформление",
    "settings.language": "Язык",
    "settings.date": "Дата",
    "settings.time": "Время",
    "settings.version": "Illyune OS™, версия {version}",
    "settings.copyright": "Copyright 2026 Illyune",
    "settings.pointer": "Курсор",
    "settings.tabs": "Разделы настроек",
    "theme.auto": "Авто",
    "theme.day": "День",
    "theme.night": "Ночь",
    "settings.cursor.classic": "Классическая",
    "settings.cursor.dark": "Тёмная",
    "settings.lighting": "Освещение",
    "email.to": "Кому",
    "email.subject": "Тема",
    "email.subject.placeholder": "О чём хотите поговорить?",
    "email.message": "Сообщение",
    "email.message.placeholder": "Введите сообщение…",
    "email.hint": "Сообщение откроется в вашем почтовом приложении.",
    "email.compose": "Открыть почтовое приложение",
    "github.loading": "Запрашиваю публичный профиль…",
    "github.loaded": "Публичные данные GitHub обновлены.",
    "github.cached": "Показаны недавно сохранённые публичные данные.",
    "github.fallback": "GitHub сейчас недоступен. Профиль можно открыть напрямую.",
    "github.repositories": "Последние репозитории",
    "github.bio_fallback": "Публичный профиль и последние обновлённые репозитории.",
    "github.idle": "Данные загрузятся при открытии окна.",
    "github.noBio": "Публичное описание не указано.",
    "github.noDescription": "Без описания",
    "github.followers": "подписчиков",
    "github.following": "подписок",
    "github.updated": "Обновлено",
    "boot.complete": "Illyune OS™ загружена",
} as const;

export type TranslationKey = keyof typeof ruMessages;

const enMessages = {
    "app.telegram": "Telegram",
    "app.github": "GitHub",
    "app.discord": "Discord",
    "app.x": "X",
    "app.email": "Email",
    "app.settings": "Settings",
    "launcher.telegram": "Open Telegram",
    "launcher.github": "Open GitHub",
    "launcher.discord": "Open Discord",
    "launcher.x": "Open X",
    "launcher.email": "Open email",
    "launcher.settings": "Open Settings",
    "launcher.aria": "Applications",
    "launcher.open": "Open {app}",
    "launcher.minimize": "Minimize {app}",
    "launcher.close": "Close {app}",
    "window.telegram.title": "TELEGRAM",
    "window.github.title": "GITHUB",
    "window.discord.title": "DISCORD",
    "window.x.title": "X / TWITTER",
    "window.email.title": "EMAIL",
    "window.settings.title": "SETTINGS",
    "window.telegram.close": "Close Telegram",
    "window.github.close": "Close GitHub",
    "window.discord.close": "Close Discord",
    "window.x.close": "Close X",
    "window.email.close": "Close email",
    "window.settings.close": "Close Settings",
    "system.aria": "System bar",
    "windows.aria": "Open applications",
    "boot.aria": "Loading Illyune OS™",
    "boot.progress": "Loading progress",
    "action.open_original": "Open original",
    "profile.telegram.bio": "Direct messages and the quickest way to reach me.",
    "profile.discord.bio": "My Discord profile. Add me using the username moonfoxy.",
    "profile.x.bio": "Illyune's X profile under the name @_MoonFoxy.",
    "settings.general": "General",
    "settings.themes": "Themes",
    "settings.language": "Language",
    "settings.date": "Date",
    "settings.time": "Time",
    "settings.version": "Illyune OS™ Version {version}",
    "settings.copyright": "Copyright 2026 Illyune",
    "settings.pointer": "Pointer",
    "settings.tabs": "Settings sections",
    "theme.auto": "Auto",
    "theme.day": "Day",
    "theme.night": "Night",
    "settings.cursor.classic": "Classic Arrow",
    "settings.cursor.dark": "Dark Arrow",
    "settings.lighting": "Lighting",
    "email.to": "To",
    "email.subject": "Subject",
    "email.subject.placeholder": "What would you like to talk about?",
    "email.message": "Message",
    "email.message.placeholder": "Type your message…",
    "email.hint": "The message will open in your email app.",
    "email.compose": "Open mail app",
    "github.loading": "Requesting public profile…",
    "github.loaded": "Public GitHub data is up to date.",
    "github.cached": "Showing recently saved public data.",
    "github.fallback": "GitHub is unavailable right now. You can still open the profile directly.",
    "github.repositories": "Latest repositories",
    "github.bio_fallback": "Public profile and recently updated repositories.",
    "github.idle": "Data will load when this window opens.",
    "github.noBio": "No public bio provided.",
    "github.noDescription": "No description",
    "github.followers": "followers",
    "github.following": "following",
    "github.updated": "Updated",
    "boot.complete": "Illyune OS™ loaded",
} as const satisfies Record<TranslationKey, string>;

const messages = { ru: ruMessages, en: enMessages } as const;

const isLocale = (value: unknown): value is Locale => value === "ru" || value === "en";

export const detectLocale = (): Locale => {
    const stored = readStorage(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;

    const browserLocale = navigator.languages?.[0] ?? navigator.language;
    return browserLocale?.toLowerCase().startsWith("ru") ? "ru" : "en";
};

export const translate = (
    locale: Locale,
    key: string,
    replacements?: Readonly<Record<string, string | number>>,
) => {
    let message: string | undefined =
        messages[locale][key as TranslationKey] ?? messages.en[key as TranslationKey];
    if (!message) return key;

    if (replacements) {
        for (const [name, value] of Object.entries(replacements)) {
            message = message.replaceAll(`{${name}}`, String(value));
        }
    }
    return message;
};

const setTranslatedAttribute = (
    root: ParentNode,
    selector: string,
    attribute: string,
    locale: Locale,
) => {
    root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        const key = element.dataset[attribute];
        if (!key) return;
        const value = translate(locale, key);
        if (value === key) return;

        if (attribute === "i18nAria") element.setAttribute("aria-label", value);
        if (attribute === "i18nTitle") element.setAttribute("title", value);
        if (attribute === "i18nPlaceholder" && element instanceof HTMLInputElement) {
            element.placeholder = value;
        }
        if (attribute === "i18nPlaceholder" && element instanceof HTMLTextAreaElement) {
            element.placeholder = value;
        }
    });
};

export const translateDocument = (locale: Locale, root: ParentNode = document) => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;

    root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
        const key = element.dataset.i18n;
        if (!key) return;
        const version = element.dataset.i18nVersion;
        const value = translate(locale, key, version ? { version } : undefined);
        if (value !== key) element.textContent = value;
    });

    setTranslatedAttribute(root, "[data-i18n-aria]", "i18nAria", locale);
    setTranslatedAttribute(root, "[data-i18n-title]", "i18nTitle", locale);
    setTranslatedAttribute(root, "[data-i18n-placeholder]", "i18nPlaceholder", locale);

    const pageCopy = PAGE_COPY[locale];
    document.title = pageCopy.title;
    document
        .querySelector<HTMLMetaElement>('meta[name="description"]')
        ?.setAttribute("content", pageCopy.description);
    document
        .querySelector<HTMLMetaElement>('meta[property="og:title"]')
        ?.setAttribute("content", pageCopy.title);
    document
        .querySelector<HTMLMetaElement>('meta[property="og:description"]')
        ?.setAttribute("content", pageCopy.description);
    document
        .querySelector<HTMLMetaElement>('meta[property="og:locale"]')
        ?.setAttribute("content", locale === "ru" ? "ru_RU" : "en_US");
};

export const applyLocale = (
    locale: Locale,
    options: { persist?: boolean; announce?: boolean } = {},
) => {
    const { persist = true, announce = true } = options;
    translateDocument(locale);
    if (persist) writeStorage(LOCALE_STORAGE_KEY, locale);

    if (announce) {
        window.dispatchEvent(
            new CustomEvent<LocaleChangeDetail>("illyune:locale-change", {
                detail: { locale },
            }),
        );
    }
};

export const isSupportedLocale = isLocale;
