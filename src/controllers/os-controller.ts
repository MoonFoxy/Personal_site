import type { Locale, LocaleChangeDetail } from "../models/os-types";
import { applyLocale, detectLocale, isSupportedLocale } from "../services/i18n";
import { mountAvatarPlaceholders } from "./os/avatar-controller";
import { mountBootSequence } from "./os/boot-controller";
import { mountClock } from "./os/clock-controller";
import { mountEmail } from "./os/email-controller";
import { mountGitHub } from "./os/github-controller";
import { mountSettings } from "./os/settings-controller";
import { mountWindowManager } from "./os/window-controller";
import { mountParallax } from "./parallax-controller";

/**
 * Client composition root for Pool OS.
 * Each feature owns its listeners and returns a cleanup function, so Astro page swaps stay safe.
 */
export const mountPoolOs = () => {
    const shell = document.querySelector<HTMLElement>("[data-os-shell]");
    if (!shell || shell.dataset.osMounted === "true") return () => undefined;
    shell.dataset.osMounted = "true";

    let locale: Locale = detectLocale();
    const getLocale = () => locale;
    const setLocale = (nextLocale: Locale) => {
        locale = nextLocale;
    };
    applyLocale(locale, { persist: true, announce: false });

    const onLocaleChange = (event: Event) => {
        const detail = (event as CustomEvent<Partial<LocaleChangeDetail>>).detail;
        if (isSupportedLocale(detail?.locale)) setLocale(detail.locale);
    };
    window.addEventListener("illyune:locale-change", onLocaleChange);

    const github = mountGitHub(shell, getLocale);
    const cleanups = [
        () => window.removeEventListener("illyune:locale-change", onLocaleChange),
        mountAvatarPlaceholders(),
        mountClock(shell, getLocale),
        mountParallax(),
        mountSettings(shell, { getLocale, setLocale }),
        mountEmail(shell),
        mountWindowManager(shell, { getLocale, onGitHubOpen: github.load }),
        mountBootSequence(shell, getLocale),
        github.destroy,
    ];

    return () => {
        cleanups.forEach((cleanup) => cleanup());
        delete shell.dataset.osMounted;
    };
};
