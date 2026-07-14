import { applyLocale, isSupportedLocale } from "../../services/i18n";
import {
    isCursorMode,
    isThemeMode,
    loadPreferences,
    saveCursorPreference,
    saveThemePreference,
} from "../../models/preferences";
import type {
    CursorChangeDetail,
    CursorMode,
    Locale,
    ThemeChangeDetail,
    ThemeMode,
} from "../../models/os-types";
import type { LocaleReader } from "./types";

const optionValue = (element: HTMLElement, dataName: string) => {
    const value = element.dataset[dataName];
    if (value) return value;
    const fallbackDataName = {
        localeOption: "locale",
        cursorOption: "cursor",
        themeOption: "theme",
    }[dataName];
    return fallbackDataName ? (element.dataset[fallbackDataName] ?? "") : "";
};

const syncOptions = (
    root: ParentNode,
    selector: string,
    dataName: string,
    selectedValue: string,
) => {
    root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        const selected = optionValue(element, dataName) === selectedValue;
        element.classList.toggle("is-selected", selected);
        element.setAttribute("aria-pressed", String(selected));
    });
};

const applyCursor = (shell: HTMLElement, cursor: CursorMode, persist = true) => {
    document.documentElement.dataset.cursor = cursor;
    document.documentElement.dataset.cursorMode = cursor;
    syncOptions(shell, "[data-cursor-option]", "cursorOption", cursor);
    if (persist) saveCursorPreference(cursor);
    window.dispatchEvent(
        new CustomEvent<CursorChangeDetail>("illyune:cursor-change", { detail: { cursor } }),
    );
};

const applyTheme = (shell: HTMLElement, mode: ThemeMode, persist = true) => {
    document.documentElement.dataset.themeMode = mode;
    document.documentElement.dataset.theme = mode;
    syncOptions(shell, "[data-theme-option]", "themeOption", mode);
    if (persist) saveThemePreference(mode);
    window.dispatchEvent(
        new CustomEvent<ThemeChangeDetail>("illyune:theme-change", { detail: { mode } }),
    );
};

interface SettingsDependencies {
    getLocale: LocaleReader;
    setLocale: (locale: Locale) => void;
}

export const mountSettings = (
    shell: HTMLElement,
    { getLocale, setLocale }: SettingsDependencies,
) => {
    const preferences = loadPreferences();
    applyCursor(shell, preferences.cursor, false);
    applyTheme(shell, preferences.theme, false);

    const activateTab = (tabName: string) => {
        shell.querySelectorAll<HTMLElement>("[data-settings-tab]").forEach((tab) => {
            const selected = (tab.dataset.settingsTab || tab.dataset.tab) === tabName;
            tab.classList.toggle("is-selected", selected);
            tab.setAttribute("aria-selected", String(selected));
            tab.setAttribute("tabindex", selected ? "0" : "-1");
        });
        shell.querySelectorAll<HTMLElement>("[data-settings-panel]").forEach((panel) => {
            const selected = (panel.dataset.settingsPanel || panel.dataset.panel) === tabName;
            panel.hidden = !selected;
            panel.classList.toggle("is-selected", selected);
        });
    };

    const onClick = (event: Event) => {
        const target = event.target instanceof Element ? event.target : null;
        const tab = target?.closest<HTMLElement>("[data-settings-tab]");
        const tabName = tab ? tab.dataset.settingsTab || tab.dataset.tab : undefined;
        if (tabName) {
            event.preventDefault();
            activateTab(tabName);
            return;
        }

        const localeOption = target?.closest<HTMLElement>("[data-locale-option]");
        if (localeOption) {
            const value = optionValue(localeOption, "localeOption");
            if (isSupportedLocale(value)) {
                setLocale(value);
                applyLocale(value);
                syncOptions(shell, "[data-locale-option]", "localeOption", value);
            }
            return;
        }

        const cursorOption = target?.closest<HTMLElement>("[data-cursor-option]");
        if (cursorOption) {
            const value = optionValue(cursorOption, "cursorOption");
            if (isCursorMode(value)) applyCursor(shell, value);
            return;
        }

        const themeOption = target?.closest<HTMLElement>("[data-theme-option]");
        if (themeOption) {
            const value = optionValue(themeOption, "themeOption");
            if (isThemeMode(value)) applyTheme(shell, value);
        }
    };

    const onKeydown = (event: KeyboardEvent) => {
        const target = event.target instanceof Element ? event.target : null;
        const activeTab = target?.closest<HTMLElement>("[data-settings-tab]");
        if (!activeTab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            return;
        }

        const tabs = [...shell.querySelectorAll<HTMLElement>("[data-settings-tab]")];
        const currentIndex = tabs.indexOf(activeTab);
        if (currentIndex < 0 || tabs.length === 0) return;

        event.preventDefault();
        const nextIndex =
            event.key === "Home"
                ? 0
                : event.key === "End"
                  ? tabs.length - 1
                  : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
                    tabs.length;
        const nextTab = tabs[nextIndex];
        const tabName = nextTab.dataset.settingsTab || nextTab.dataset.tab;
        if (!tabName) return;
        activateTab(tabName);
        nextTab.focus();
    };

    shell.addEventListener("click", onClick);
    shell.addEventListener("keydown", onKeydown);
    activateTab(
        shell.querySelector<HTMLElement>('[data-settings-tab][aria-selected="true"]')?.dataset
            .tab ??
            shell.querySelector<HTMLElement>("[data-settings-tab].is-selected")?.dataset
                .settingsTab ??
            "general",
    );
    syncOptions(shell, "[data-locale-option]", "localeOption", getLocale());

    return () => {
        shell.removeEventListener("click", onClick);
        shell.removeEventListener("keydown", onKeydown);
    };
};
