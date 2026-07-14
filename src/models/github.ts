import { GITHUB_USERNAME } from "./app-registry";
import { readStorage, writeStorage } from "../services/storage";

const CACHE_KEY = "illyune.github.v1";
const CACHE_MAX_AGE = 30 * 60 * 1_000;
const REQUEST_TIMEOUT = 3_000;

export interface GitHubUser {
    login: string;
    name: string | null;
    bio: string | null;
    avatarUrl: string;
    htmlUrl: string;
    followers: number;
    following: number;
    publicRepos: number;
}

export interface GitHubRepository {
    name: string;
    description: string | null;
    language: string | null;
    updatedAt: string;
    stars: number;
    htmlUrl: string;
}

export interface GitHubSnapshot {
    savedAt: number;
    user: GitHubUser;
    repositories: GitHubRepository[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);
const stringValue = (value: unknown) => (typeof value === "string" ? value : null);
const finiteNumber = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : 0;

const trustedHttpsUrl = (value: unknown, hostname: string) => {
    const rawUrl = stringValue(value);
    if (!rawUrl) return null;
    try {
        const url = new URL(rawUrl);
        if (
            url.protocol !== "https:" ||
            url.hostname !== hostname ||
            url.username ||
            url.password ||
            url.port
        ) {
            return null;
        }
        return url.toString();
    } catch {
        return null;
    }
};

const parseUser = (value: unknown, cached = false): GitHubUser | null => {
    if (!isRecord(value)) return null;
    const login = stringValue(value.login);
    const htmlUrl = trustedHttpsUrl(cached ? value.htmlUrl : value.html_url, "github.com");
    const avatarUrl = trustedHttpsUrl(
        cached ? value.avatarUrl : value.avatar_url,
        "avatars.githubusercontent.com",
    );
    if (!login || !htmlUrl || !avatarUrl) return null;
    return {
        login,
        name: value.name === null ? null : stringValue(value.name),
        bio: value.bio === null ? null : stringValue(value.bio),
        avatarUrl,
        htmlUrl,
        followers: finiteNumber(value.followers),
        following: finiteNumber(value.following),
        publicRepos: finiteNumber(cached ? value.publicRepos : value.public_repos),
    };
};

const parseRepository = (value: unknown, cached = false): GitHubRepository | null => {
    if (!isRecord(value)) return null;
    const name = stringValue(value.name);
    const updatedAt = stringValue(cached ? value.updatedAt : value.updated_at);
    const htmlUrl = trustedHttpsUrl(cached ? value.htmlUrl : value.html_url, "github.com");
    if (!name || !updatedAt || !htmlUrl) return null;
    return {
        name,
        description: value.description === null ? null : stringValue(value.description),
        language: value.language === null ? null : stringValue(value.language),
        updatedAt,
        stars: finiteNumber(cached ? value.stars : value.stargazers_count),
        htmlUrl,
    };
};

const parseSnapshot = (value: unknown): GitHubSnapshot | null => {
    if (!isRecord(value) || !Array.isArray(value.repositories)) return null;
    const user = parseUser(value.user, true);
    const repositories = value.repositories
        .map((repository) => parseRepository(repository, true))
        .filter((repository): repository is GitHubRepository => repository !== null)
        .slice(0, 5);
    const savedAt = finiteNumber(value.savedAt);
    return user && savedAt > 0 ? { savedAt, user, repositories } : null;
};

export const readCachedGitHubSnapshot = () => {
    const raw = readStorage(CACHE_KEY);
    if (!raw) return null;
    try {
        const snapshot = parseSnapshot(JSON.parse(raw) as unknown);
        return snapshot && Date.now() - snapshot.savedAt <= CACHE_MAX_AGE ? snapshot : null;
    } catch {
        return null;
    }
};

export const fetchGitHubSnapshot = async (): Promise<GitHubSnapshot> => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
        const headers = { Accept: "application/vnd.github+json" };
        const [profileResponse, repositoriesResponse] = await Promise.all([
            fetch(`https://api.github.com/users/${GITHUB_USERNAME}`, {
                headers,
                signal: controller.signal,
            }),
            fetch(
                `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=5&type=owner`,
                { headers, signal: controller.signal },
            ),
        ]);
        if (!profileResponse.ok || !repositoriesResponse.ok) {
            throw new Error(
                `GitHub API returned ${profileResponse.status}/${repositoriesResponse.status}`,
            );
        }
        const [rawUser, rawRepositories] = (await Promise.all([
            profileResponse.json(),
            repositoriesResponse.json(),
        ])) as [unknown, unknown];
        const user = parseUser(rawUser);
        if (!user || !Array.isArray(rawRepositories)) throw new Error("Unexpected GitHub response");
        const repositories = rawRepositories
            .map((repository) => parseRepository(repository))
            .filter((repository): repository is GitHubRepository => repository !== null)
            .slice(0, 5);
        return { savedAt: Date.now(), user, repositories };
    } finally {
        window.clearTimeout(timeout);
    }
};

export const cacheGitHubSnapshot = (snapshot: GitHubSnapshot) => {
    writeStorage(CACHE_KEY, JSON.stringify(snapshot));
};
