import type { Locale } from "../../models/os-types";

export type Cleanup = () => void;
export type LocaleReader = () => Locale;
