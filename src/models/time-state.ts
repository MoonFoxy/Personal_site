import type { ThemeMode } from "./os-types";

export type PoolPhase = "morning" | "day" | "evening" | "night";

export interface TimeState {
    phase: PoolPhase;
    dayProgress: number;
    daylight: number;
    sunAzimuth: number;
    sunElevation: number;
    sunIntensity: number;
    minutes: number;
    timeZone: string;
}

const MINUTES_IN_DAY = 24 * 60;
const HALF_PI = Math.PI * 0.5;
const clamp = (value: number, minimum = 0, maximum = 1) =>
    Math.min(maximum, Math.max(minimum, value));
const smoothstep = (edge0: number, edge1: number, value: number) => {
    const progress = clamp((value - edge0) / (edge1 - edge0));
    return progress * progress * (3 - 2 * progress);
};

const phaseForMinutes = (minutes: number): PoolPhase => {
    if (minutes >= 5 * 60 && minutes < 9 * 60) return "morning";
    if (minutes >= 9 * 60 && minutes < 17 * 60) return "day";
    if (minutes >= 17 * 60 && minutes < 21 * 60) return "evening";
    return "night";
};

/** Pure lighting model shared by the renderer, tests and time controller. */
export const getTimeState = (date = new Date(), mode: ThemeMode = "auto"): TimeState => {
    const minutes = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
    const hours = minutes / 60;
    const pathProgress = clamp((hours - 6) / 12);
    const solarHeight =
        hours >= 5.5 && hours <= 18.5
            ? Math.max(0, Math.sin(clamp((hours - 5.5) / 13) * Math.PI))
            : 0;
    const lighting =
        mode === "day"
            ? { daylight: 1, sunAzimuth: 0, sunElevation: HALF_PI, sunIntensity: 1 }
            : mode === "night"
              ? { daylight: 0, sunAzimuth: 0, sunElevation: 0, sunIntensity: 0 }
              : {
                    daylight: clamp(
                        smoothstep(4.75, 7.25, hours) * (1 - smoothstep(17.25, 20.25, hours)),
                    ),
                    sunAzimuth: (pathProgress - 0.5) * Math.PI,
                    sunElevation: solarHeight * HALF_PI,
                    sunIntensity: solarHeight > 0 ? Math.pow(solarHeight, 0.72) : 0,
                };
    return {
        phase: phaseForMinutes(minutes),
        dayProgress: minutes / MINUTES_IN_DAY,
        ...lighting,
        minutes,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "local",
    };
};
