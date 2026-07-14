import { translate } from "../../services/i18n";
import type { LocaleReader } from "./types";

const delay = (milliseconds: number) =>
    new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

const waitForDom = () =>
    document.readyState === "loading"
        ? new Promise<void>((resolve) =>
              document.addEventListener("DOMContentLoaded", () => resolve(), { once: true }),
          )
        : Promise.resolve();

const waitForFonts = () => {
    const fonts = document.fonts;
    return fonts ? fonts.ready.then(() => undefined).catch(() => undefined) : Promise.resolve();
};

const waitForImage = (image: HTMLImageElement | null) => {
    if (!image) return Promise.resolve();
    if (image.complete) {
        return typeof image.decode === "function"
            ? image.decode().catch(() => undefined)
            : Promise.resolve();
    }

    return new Promise<void>((resolve) => {
        const finish = () => resolve();
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
    });
};

const waitForPool = (shell: HTMLElement) => {
    const pool =
        shell.querySelector<HTMLElement>("[data-pool-wallpaper]") ??
        document.querySelector<HTMLElement>("[data-pool-wallpaper]");
    if (!pool) return Promise.resolve();
    if (
        pool.dataset.poolReady === "true" ||
        pool.classList.contains("is-ready") ||
        pool.classList.contains("is-fallback")
    ) {
        return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
        window.addEventListener("illyune:pool-ready", () => resolve(), { once: true });
    });
};

const setProgress = (progress: HTMLElement, completed: number, total: number) => {
    const fraction = Math.min(1, Math.max(0, completed / Math.max(1, total)));
    const percent = Math.round(fraction * 100);
    progress.style.setProperty("--boot-progress", `${percent}%`);
    progress.dataset.progress = String(percent);
    progress.setAttribute("aria-valuenow", String(percent));
};

export const mountBootSequence = (shell: HTMLElement, getLocale: LocaleReader) => {
    const overlay =
        shell.querySelector<HTMLElement>("[data-boot-overlay]") ??
        document.querySelector<HTMLElement>("[data-boot-overlay]");
    if (!overlay) return () => undefined;

    const progress = overlay.querySelector<HTMLElement>("[data-boot-progress]") ?? overlay;
    const avatar = shell.querySelector<HTMLImageElement>("img[data-boot-avatar]");
    const tasks = [waitForDom(), waitForFonts(), waitForImage(avatar), waitForPool(shell)];
    const startedAt = performance.now();
    let completed = 0;
    let disposed = false;
    setProgress(progress, 0, tasks.length);

    const observedTasks = tasks.map((task) =>
        task
            .catch(() => undefined)
            .then(() => {
                completed += 1;
                if (!disposed) setProgress(progress, completed, tasks.length);
            }),
    );

    void Promise.race([Promise.all(observedTasks), delay(4_000)]).then(async () => {
        if (disposed) return;
        const remainingMinimum = Math.max(0, 800 - (performance.now() - startedAt));
        if (remainingMinimum) await delay(remainingMinimum);
        if (disposed) return;

        setProgress(progress, tasks.length, tasks.length);
        overlay.classList.add("is-leaving");
        overlay.setAttribute("aria-label", translate(getLocale(), "boot.complete"));
        overlay.setAttribute("aria-hidden", "true");
        overlay.inert = true;
        shell.dataset.booted = "true";
        document.documentElement.dataset.booted = "true";
        window.dispatchEvent(new CustomEvent("illyune:boot-complete"));

        const hideDelay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220;
        await delay(hideDelay);
        if (!disposed) overlay.hidden = true;
    });

    return () => {
        disposed = true;
    };
};
