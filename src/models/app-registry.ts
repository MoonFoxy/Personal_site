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

export const PROFILE_AVATAR_IDS = ["home", "telegram", "github", "discord", "x"] as const;

export type ProfileAvatarId = (typeof PROFILE_AVATAR_IDS)[number];

/**
 * Paste a direct HTTPS image URL for the corresponding profile avatar.
 * For GitHub, leave the value as `null` to load the public avatar from the
 * GitHub API when its window opens. For the other profiles, `null` uses the
 * bundled avatar.
 *
 * If a URL uses a new external host, add that host to `img-src` in
 * `public/_headers` before deployment so the site's CSP permits it to load.
 */
export const profileAvatarConfig: Readonly<Record<ProfileAvatarId, string | null>> = {
    home: "https://cdn.libravatar.org/avatar/e87b4751a4a94ceffeb9ff31cc008b73?d=404&s=1024",
    telegram: "https://t.me/i/userpic/320/MoonFoxy.jpg",
    github: "https://github.com/MoonFoxy.png?size=512",
    discord:
        "https://cdn.discordapp.com/avatars/289418396867624960/31816b9c2ebaca88a1a772be77d45aaa.png?size=512",
    x: "https://pbs.twimg.com/profile_images/1431348806524755976/axnNU4Ap.jpg",
};

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
