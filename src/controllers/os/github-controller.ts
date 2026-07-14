import { GITHUB_USERNAME } from "../../models/app-registry";
import {
    cacheGitHubSnapshot,
    fetchGitHubSnapshot,
    readCachedGitHubSnapshot,
    type GitHubRepository,
    type GitHubSnapshot,
} from "../../models/github";
import { translate } from "../../services/i18n";
import type { LocaleReader } from "./types";

type RenderState = "idle" | "loading" | "loaded" | "cached" | "fallback";

const localeTag = (locale: ReturnType<LocaleReader>) => (locale === "ru" ? "ru-RU" : "en-GB");

const setText = (root: ParentNode, selector: string, value: string) => {
    root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        element.textContent = value;
    });
};

const renderRepositories = (
    root: HTMLElement,
    repositories: GitHubRepository[],
    getLocale: LocaleReader,
) => {
    const list = root.querySelector<HTMLElement>("[data-github-repos]");
    const template = root.querySelector<HTMLTemplateElement>("[data-github-repo-template]");
    if (!list || !template) return;
    const locale = getLocale();
    const fragment = document.createDocumentFragment();
    repositories.forEach((repository) => {
        const item = template.content.firstElementChild?.cloneNode(true);
        if (!(item instanceof HTMLElement)) return;
        item.dataset.githubRepository = repository.name;
        const link = item.querySelector<HTMLAnchorElement>("[data-github-repo-link]");
        if (link) {
            link.href = repository.htmlUrl;
            link.removeAttribute("target");
        }
        setText(item, "[data-github-repo-name]", repository.name);
        setText(
            item,
            "[data-github-repo-description]",
            repository.description || translate(locale, "github.noDescription"),
        );
        setText(
            item,
            "[data-github-repo-language]",
            [repository.language, repository.stars > 0 ? `★ ${repository.stars}` : null]
                .filter((value): value is string => Boolean(value))
                .join(" · "),
        );
        const updated = item.querySelector<HTMLTimeElement>("[data-github-repo-updated]");
        const date = new Date(repository.updatedAt);
        if (updated && !Number.isNaN(date.getTime())) {
            updated.dateTime = date.toISOString();
            updated.textContent = `${translate(locale, "github.updated")} ${new Intl.DateTimeFormat(localeTag(locale), { day: "2-digit", month: "short", year: "numeric" }).format(date)}`;
        }
        fragment.append(item);
    });
    list.replaceChildren(fragment);
};

const render = (
    root: HTMLElement,
    snapshot: GitHubSnapshot | null,
    state: RenderState,
    getLocale: LocaleReader,
) => {
    const locale = getLocale();
    root.dataset.githubState = state;
    setText(root, "[data-github-state]", translate(locale, `github.${state}`));
    if (!snapshot) {
        setText(root, "[data-github-name]", GITHUB_USERNAME);
        setText(root, "[data-github-login]", `@${GITHUB_USERNAME}`);
        setText(root, "[data-github-bio]", translate(locale, "github.bio_fallback"));
        root.querySelector<HTMLElement>("[data-github-meta]")?.replaceChildren();
        root.querySelector<HTMLElement>("[data-github-repos]")?.replaceChildren();
        return;
    }
    const { user, repositories } = snapshot;
    setText(root, "[data-github-name]", user.name || user.login);
    setText(root, "[data-github-login]", `@${user.login}`);
    setText(root, "[data-github-bio]", user.bio || translate(locale, "github.noBio"));
    setText(
        root,
        "[data-github-meta]",
        `${user.followers} ${translate(locale, "github.followers")} · ${user.following} ${translate(locale, "github.following")}`,
    );
    root.querySelectorAll<HTMLImageElement>("img[data-github-avatar]").forEach((avatar) => {
        avatar.src = user.avatarUrl;
        avatar.alt = user.name || user.login;
    });
    renderRepositories(root, repositories, getLocale);
};

export const mountGitHub = (shell: HTMLElement, getLocale: LocaleReader) => {
    const root = shell.querySelector<HTMLElement>('[data-app-window][data-app-id="github"]');
    if (!root) return { load: () => undefined, destroy: () => undefined };
    let requested = false;
    let snapshot: GitHubSnapshot | null = null;
    let state: RenderState = "idle";

    const load = () => {
        if (requested) return;
        requested = true;
        const cached = readCachedGitHubSnapshot();
        if (cached) {
            snapshot = cached;
            state = "cached";
            render(root, snapshot, state, getLocale);
            return;
        }
        state = "loading";
        render(root, null, state, getLocale);
        void fetchGitHubSnapshot()
            .then((fresh) => {
                snapshot = fresh;
                state = "loaded";
                cacheGitHubSnapshot(fresh);
                render(root, snapshot, state, getLocale);
            })
            .catch(() => {
                state = "fallback";
                render(root, null, state, getLocale);
            });
    };
    const rerender = () => render(root, snapshot, state, getLocale);
    window.addEventListener("illyune:locale-change", rerender);
    return { load, destroy: () => window.removeEventListener("illyune:locale-change", rerender) };
};
