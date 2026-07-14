import type { LocaleReader } from "./types";

const localeTag = (locale: ReturnType<LocaleReader>) => (locale === "ru" ? "ru-RU" : "en-GB");

export const mountClock = (shell: HTMLElement, getLocale: LocaleReader) => {
    const render = () => {
        const now = new Date();
        const locale = getLocale();
        const tag = localeTag(locale);
        const time = new Intl.DateTimeFormat(tag, {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).format(now);
        const date = new Intl.DateTimeFormat(tag, {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
        })
            .format(now)
            .replace(/\.$/u, "")
            .toLocaleUpperCase(tag);

        shell.querySelectorAll<HTMLElement>("[data-local-clock]").forEach((element) => {
            const value = element.querySelector<HTMLElement>("[data-local-clock-value]") ?? element;
            value.textContent = time;
            if (element instanceof HTMLTimeElement) element.dateTime = now.toISOString();
        });
        shell.querySelectorAll<HTMLElement>("[data-local-date]").forEach((element) => {
            element.textContent = date;
            if (element instanceof HTMLTimeElement) element.dateTime = now.toISOString();
        });
    };

    let timer = 0;
    const schedule = () => {
        render();
        const now = new Date();
        timer = window.setTimeout(
            schedule,
            60_020 - now.getSeconds() * 1_000 - now.getMilliseconds(),
        );
    };

    schedule();
    window.addEventListener("illyune:locale-change", render);

    return () => {
        window.clearTimeout(timer);
        window.removeEventListener("illyune:locale-change", render);
    };
};
