import assert from "node:assert/strict";

import { getTimeState } from "../src/models/time-state.ts";

const at = (hour, minute = 0) => new Date(2026, 6, 14, hour, minute, 0, 0);

const expectedPhases = [
    [0, "night"],
    [6, "morning"],
    [8, "morning"],
    [12, "day"],
    [18, "evening"],
    [21, "night"],
];

for (const [hour, phase] of expectedPhases) {
    const state = getTimeState(at(hour));
    assert.equal(state.phase, phase, `${hour}:00 must use the ${phase} phase`);
    assert.equal(state.minutes, hour * 60, `${hour}:00 must preserve local minutes`);
    assert.ok(
        state.dayProgress >= 0 && state.dayProgress < 1,
        `${hour}:00 day progress must be normalized`,
    );
}

const midnight = getTimeState(at(0));
const sunrise = getTimeState(at(6));
const morning = getTimeState(at(8));
const noon = getTimeState(at(12));
const sunset = getTimeState(at(18));
const night = getTimeState(at(21));

assert.equal(midnight.sunIntensity, 0, "Direct solar glint must be absent at midnight");
assert.equal(night.sunIntensity, 0, "Direct solar glint must be absent at 21:00");
assert.ok(sunrise.sunIntensity > 0, "A horizon glint must be present at 06:00");
assert.ok(sunrise.sunAzimuth < -1.5, "06:00 glint must originate at the left edge");
assert.ok(morning.sunAzimuth < 0, "08:00 glint must remain left of center");
assert.ok(Math.abs(noon.sunAzimuth) < 1e-10, "12:00 glint must be centered");
assert.ok(noon.sunElevation > morning.sunElevation, "The sun must be higher at noon");
assert.ok(sunset.sunAzimuth > 1.5, "18:00 glint must reach the right edge");
assert.ok(sunset.sunIntensity > 0, "A horizon glint must be present at 18:00");

const forcedDayAtNight = getTimeState(at(0), "day");
assert.equal(forcedDayAtNight.phase, "night", "Day override must not falsify the shown time phase");
assert.equal(forcedDayAtNight.daylight, 1, "Day override must force daylight");
assert.equal(forcedDayAtNight.sunIntensity, 1, "Day override must force a solar highlight");

const forcedNightAtNoon = getTimeState(at(12), "night");
assert.equal(
    forcedNightAtNoon.phase,
    "day",
    "Night override must not falsify the shown time phase",
);
assert.equal(forcedNightAtNoon.daylight, 0, "Night override must remove daylight");
assert.equal(forcedNightAtNoon.sunIntensity, 0, "Night override must remove direct glint");

console.log(
    "Validated solar phases and glint positions at 00:00, 06:00, 08:00, 12:00, 18:00 and 21:00.",
);
