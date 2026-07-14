import { getTimeState, type PoolPhase, type TimeState } from "../models/time-state";
import type { ThemeMode } from "../models/os-types";

interface ThemeChangeDetail {
    mode?: ThemeMode;
}

const themeColors: Record<PoolPhase, string> = {
    morning: "#315f68",
    day: "#287f91",
    evening: "#173f4a",
    night: "#071e2c",
};

const normaliseThemeMode = (value: unknown): ThemeMode =>
    value === "day" || value === "night" ? value : "auto";

const publishTimeState = () => {
    const themeMode = normaliseThemeMode(document.documentElement.dataset.themeMode);
    const state = getTimeState(new Date(), themeMode);
    const root = document.documentElement;
    root.dataset.poolPhase = state.phase;
    root.dataset.poolDayProgress = state.dayProgress.toFixed(6);
    root.dataset.poolDaylight = state.daylight.toFixed(4);
    root.dataset.poolSunAzimuth = state.sunAzimuth.toFixed(6);
    root.dataset.poolSunElevation = state.sunElevation.toFixed(6);
    root.dataset.poolSunIntensity = state.sunIntensity.toFixed(4);
    root.style.setProperty("--daylight", state.daylight.toFixed(4));
    root.style.setProperty("--day-progress", state.dayProgress.toFixed(6));
    root.style.setProperty("--sun-azimuth", state.sunAzimuth.toFixed(6));
    root.style.setProperty("--sun-elevation", state.sunElevation.toFixed(6));
    root.style.setProperty("--sun-intensity", state.sunIntensity.toFixed(4));
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    themeColor?.setAttribute(
        "content",
        themeColors[themeMode === "auto" ? state.phase : themeMode],
    );
    window.dispatchEvent(new CustomEvent<TimeState>("illyune:time-state", { detail: state }));
};

export const mountTimeController = () => {
    publishTimeState();
    const interval = window.setInterval(publishTimeState, 30_000);
    const onThemeChange = (event: Event) => {
        const detail = (event as CustomEvent<ThemeChangeDetail | ThemeMode>).detail;
        document.documentElement.dataset.themeMode = normaliseThemeMode(
            typeof detail === "string" ? detail : detail?.mode,
        );
        publishTimeState();
    };
    const onVisibilityChange = () => {
        if (!document.hidden) publishTimeState();
    };
    const observer = new MutationObserver(publishTimeState);
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme-mode"],
    });
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", publishTimeState);
    window.addEventListener("illyune:theme-change", onThemeChange);
    window.addEventListener("illyune:locale-change", publishTimeState);
    window.addEventListener("illyune:request-time-state", publishTimeState);
    return () => {
        window.clearInterval(interval);
        observer.disconnect();
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("pageshow", publishTimeState);
        window.removeEventListener("illyune:theme-change", onThemeChange);
        window.removeEventListener("illyune:locale-change", publishTimeState);
        window.removeEventListener("illyune:request-time-state", publishTimeState);
    };
};
