export const APP_IDS = ["telegram", "github", "discord", "x", "email", "settings"] as const;

export type AppId = (typeof APP_IDS)[number];

export interface AppDefinition {
    id: AppId;
    href: string;
    label: string;
    labelKey: string;
}

export const CONTACT_EMAIL = "contact@illyu.net";
export const GITHUB_USERNAME = "MoonFoxy";

export const apps: readonly AppDefinition[] = [
    {
        id: "telegram",
        href: "https://t.me/MoonFoxy",
        label: "Telegram",
        labelKey: "app.telegram",
    },
    {
        id: "github",
        href: `https://github.com/${GITHUB_USERNAME}`,
        label: "GitHub",
        labelKey: "app.github",
    },
    {
        id: "discord",
        href: "https://discord.com/users/289418396867624960",
        label: "Discord",
        labelKey: "app.discord",
    },
    {
        id: "x",
        href: "https://twitter.com/_MoonFoxy",
        label: "X",
        labelKey: "app.x",
    },
    {
        id: "email",
        href: `mailto:${CONTACT_EMAIL}`,
        label: "Email",
        labelKey: "app.email",
    },
    {
        id: "settings",
        href: "#window-settings",
        label: "Настройки",
        labelKey: "app.settings",
    },
] as const;

export const appById = (appId: AppId) => apps.find((app) => app.id === appId);
