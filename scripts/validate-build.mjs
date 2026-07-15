import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
const html = await readFile(join(dist, "index.html"), "utf8");

const requiredFragments = [
    '<html lang="ru"',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    '<meta name="description" content="Личная страница Illyune',
    '<meta property="og:title" content="Illyune OS">',
    "<title>Illyune OS</title>",
    'rel="canonical" href="https://illyu.net/"',
    'id="hero-title"',
    ">Illyune</span>",
    "data-pool-wallpaper",
    "data-pool-canvas",
    "data-pool-fallback",
    "data-os-shell",
    "data-boot-overlay",
    "data-boot-progress",
    'role="progressbar"',
    'class="system-bar"',
    "data-local-date",
    "data-local-clock",
    'class="launcher"',
    "data-email-form",
    "Illyune OS Version 1.0",
];

for (const fragment of requiredFragments) {
    assert.ok(html.includes(fragment), `Missing required markup: ${fragment}`);
}

const countAttribute = (attribute) =>
    (html.match(new RegExp(`\\b${attribute}(?:\\s|>)`, "gu")) ?? []).length;

assert.equal((html.match(/<h1\b/gu) ?? []).length, 1, "Page must contain exactly one h1");
assert.equal(countAttribute("data-app-window"), 6, "Desktop must contain exactly six app windows");
assert.equal(
    countAttribute("data-app-launcher"),
    6,
    "Launcher must contain exactly six app entries",
);
assert.equal((html.match(/role="dialog"/gu) ?? []).length, 6, "Every app window must be a dialog");

const appIds = ["telegram", "github", "discord", "x", "email", "settings"];
const contactHrefs = {
    telegram: "https://t.me/MoonFoxy",
    github: "https://github.com/MoonFoxy",
    discord: "https://discord.com/users/289418396867624960",
    x: "https://twitter.com/_MoonFoxy",
    email: "mailto:contact@illyu.net",
    settings: "#window-settings",
};

const windowTags = [...html.matchAll(/<(?:article|section)\b[^>]*\bdata-app-window\b[^>]*>/gu)].map(
    ([tag]) => tag,
);
const anchorTags = [...html.matchAll(/<a\b[^>]*>/gu)].map(([tag]) => tag);
const launcherTags = anchorTags.filter((tag) => /\bdata-app-launcher\b/u.test(tag));

for (const appId of appIds) {
    const appWindow = windowTags.find((tag) => tag.includes(`data-app-id="${appId}"`));
    assert.ok(appWindow, `Missing ${appId} app window`);
    assert.ok(appWindow.includes('role="dialog"'), `${appId} window must use role=dialog`);
    assert.ok(
        appWindow.includes(`aria-labelledby="window-title-${appId}"`),
        `${appId} window must reference its visible title`,
    );

    const launcher = launcherTags.find((tag) => tag.includes(`data-app-id="${appId}"`));
    assert.ok(launcher, `Missing ${appId} launcher`);
    assert.ok(
        launcher.includes(`href="${contactHrefs[appId]}"`),
        `${appId} launcher is missing its no-JavaScript same-tab fallback`,
    );
    assert.ok(launcher.includes("aria-label="), `${appId} launcher needs an accessible name`);
    assert.ok(
        launcher.includes(`aria-controls="window-${appId}"`),
        `${appId} launcher must point to its window`,
    );
    assert.ok(!launcher.includes('target="_blank"'), `${appId} must stay in the current tab`);
}

assert.equal(
    countAttribute("data-settings-tab"),
    2,
    "Settings must expose General and Themes tabs",
);
assert.equal(countAttribute("data-settings-panel"), 2, "Settings must contain two tab panels");
assert.equal(countAttribute("data-locale-option"), 2, "Settings must expose Russian and English");
assert.equal(countAttribute("data-cursor-option"), 2, "Settings must expose two cursor modes");
assert.equal(countAttribute("data-theme-option"), 3, "Settings must expose Auto, Day and Night");
assert.ok(
    html.includes("data-github-repo-template"),
    "GitHub window is missing its repository template",
);
assert.ok(html.includes("data-github-state"), "GitHub window is missing an honest loading state");

const avatarTag = html.match(/<img\b[^>]*alt="[^"]+[^>]*>/u)?.[0];
assert.ok(avatarTag, "Missing avatar image or localized alt text");
const srcset = avatarTag.match(/srcset="([^"]+)"/u)?.[1];
assert.ok(srcset, "Avatar is missing a responsive srcset");
const avatarUrls = srcset.split(",").map((candidate) => candidate.trim().split(/\s+/u)[0]);
await Promise.all(
    avatarUrls.map((url) => {
        assert.ok(url.startsWith("/_astro/"), `Unexpected avatar URL: ${url}`);
        return access(join(dist, url.slice(1)));
    }),
);

const builtAssetUrls = [
    ...new Set(
        [...html.matchAll(/(?:src|href)="(\/_astro\/[^"]+\.(?:js|css))"/gu)].map(
            (match) => match[1],
        ),
    ),
];
const builtAssets = await Promise.all(
    builtAssetUrls.map(async (url) => ({
        url,
        source: await readFile(join(dist, url.slice(1)), "utf8"),
    })),
);
const javascript = builtAssets
    .filter(({ url }) => url.endsWith(".js"))
    .map(({ source }) => source)
    .join("\n");
const css = builtAssets
    .filter(({ url }) => url.endsWith(".css"))
    .map(({ source }) => source)
    .join("\n");
const indexArtifacts = `${html}\n${javascript}\n${css}`;

const scriptTags = [...html.matchAll(/<script\b[^>]*>/gu)].map(([tag]) => tag);
assert.ok(scriptTags.length >= 2, "Pool renderer and OS manager scripts were not emitted");
for (const script of scriptTags) {
    const source = script.match(/\bsrc="([^"]+)"/u)?.[1];
    assert.ok(
        source?.startsWith("/_astro/"),
        "All startup scripts must be same-origin build assets",
    );
}

assert.ok(javascript.includes("illyune:time-state"), "Time-state event contract is missing");
assert.ok(javascript.includes("illyune:pool-ready"), "Pool-ready event contract is missing");
assert.ok(javascript.includes("illyune:locale-change"), "Locale event contract is missing");
assert.ok(
    javascript.includes("https://api.github.com/users/") && javascript.includes("MoonFoxy"),
    "Lazy GitHub profile request is missing",
);
assert.ok(javascript.includes("illyune.github.v1"), "GitHub cache key is missing");
assert.ok(javascript.includes("illyune.locale.v1"), "Locale persistence key is missing");
assert.ok(javascript.includes("illyune.cursor.v1"), "Cursor persistence key is missing");
assert.ok(javascript.includes("illyune.theme.v1"), "Theme persistence key is missing");
assert.ok(
    !javascript.includes("innerHTML"),
    "External API data must not be inserted with innerHTML",
);

assert.doesNotMatch(indexArtifacts, /<iframe\b/iu, "iframes are forbidden");
assert.doesNotMatch(indexArtifacts, /target=["']_blank["']/iu, "New-tab links are forbidden");
assert.doesNotMatch(indexArtifacts, /backdrop-filter/iu, "Liquid-glass blur must not return");
for (const pattern of [
    /\bdata-(?:global|screen|fullscreen)-dither\b/iu,
    /class=["'][^"']*(?:global|screen|fullscreen)[-_]dither/iu,
    /\.(?:global|screen|fullscreen)[-_]dither\b/iu,
]) {
    assert.doesNotMatch(
        indexArtifacts,
        pattern,
        "A global fullscreen dither overlay must not return",
    );
}

const javascriptGzipBytes = builtAssets
    .filter(({ url }) => url.endsWith(".js"))
    .reduce((total, { source }) => total + gzipSync(source).byteLength, 0);
const cssGzipBytes = builtAssets
    .filter(({ url }) => url.endsWith(".css"))
    .reduce((total, { source }) => total + gzipSync(source).byteLength, 0);
assert.ok(javascriptGzipBytes <= 100 * 1024, "Initial JavaScript exceeds 100 KB gzip");
assert.ok(cssGzipBytes <= 50 * 1024, "Initial CSS exceeds 50 KB gzip");

const [notFound, headers, robots, sitemap, fontLicense, thirdPartyAssets, fontFiles] =
    await Promise.all([
        readFile(join(dist, "404.html"), "utf8"),
        readFile(join(dist, "_headers"), "utf8"),
        readFile(join(dist, "robots.txt"), "utf8"),
        readFile(join(dist, "sitemap.xml"), "utf8"),
        readFile(join(dist, "licenses", "PIXEL-SCRIPT-LICENSE.txt"), "utf8"),
        readFile(join(dist, "licenses", "THIRD-PARTY-ASSETS.md"), "utf8"),
        readdir(join(dist, "fonts")),
        access(join(dist, "fonts", "magdalena.ttf")),
        access(join(dist, "fonts", "magdalena-bold.ttf")),
        access(join(dist, "fonts", "neoplantabg.woff")),
    ]);

assert.ok(notFound.includes("<title>tEMMIE!!</title>"), "Custom Temmie 404 page was not preserved");
assert.equal((notFound.match(/<h1\b/gu) ?? []).length, 1, "404 page must contain exactly one h1");
assert.doesNotMatch(
    notFound,
    /https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)/iu,
    "404 page must not require font origins excluded by the CSP",
);
assert.doesNotMatch(notFound, /console\.error/iu, "404 page must not emit a fake console error");
for (const script of [...notFound.matchAll(/<script\b[^>]*>/gu)].map(([tag]) => tag)) {
    const source = script.match(/\bsrc="([^"]+)"/u)?.[1];
    assert.ok(
        source?.startsWith("/") && !source.startsWith("//"),
        "404 scripts must be same-origin assets",
    );
}
assert.ok(headers.includes("/_astro/*"), "Hashed Astro assets are missing an immutable cache rule");
assert.ok(headers.includes("X-Content-Type-Options: nosniff"), "Security headers are missing");
assert.match(
    headers,
    /\/\*\s+[^]*?Content-Security-Policy:/u,
    "The CSP must apply to every static route, including 404.html",
);
const csp = headers.match(/Content-Security-Policy:\s*([^\r\n]+)/u)?.[1];
assert.ok(csp, "The landing page is missing a CSP");
const cspDirectives = new Map(
    csp
        .split(";")
        .map((directive) => directive.trim().split(/\s+/u))
        .filter(([name]) => Boolean(name))
        .map(([name, ...sources]) => [name, new Set(sources)]),
);
const requireCspSources = (name, sources) => {
    const actual = cspDirectives.get(name);
    assert.ok(actual, `CSP is missing the ${name} directive`);
    for (const source of sources) {
        assert.ok(actual.has(source), `CSP ${name} is missing ${source}`);
    }
};
requireCspSources("default-src", ["'self'"]);
requireCspSources("connect-src", ["'self'", "https://api.github.com"]);
requireCspSources("frame-src", ["'none'"]);
requireCspSources("img-src", ["'self'", "data:", "https://avatars.githubusercontent.com"]);
assert.ok(robots.includes("Sitemap: https://illyu.net/sitemap.xml"), "robots.txt sitemap is wrong");
assert.ok(fontLicense.includes("Pixel Script"), "Pixel Script licence is missing");
assert.deepEqual(
    fontFiles.sort(),
    ["magdalena-bold.ttf", "magdalena.ttf", "neoplantabg.woff", "pixel-script.otf"],
    "The production font directory must contain only active fonts",
);
assert.ok(thirdPartyAssets.includes("Magdalena"), "Magdalena attribution is missing");
assert.ok(
    thirdPartyAssets.includes("Kreative Software Relay Fonts Free Use License"),
    "Magdalena licence is missing",
);
assert.ok(thirdPartyAssets.includes("NeoplantaBG"), "NeoplantaBG attribution is missing");
assert.ok(
    thirdPartyAssets.includes("free for personal use only"),
    "NeoplantaBG personal-use condition is missing",
);
assert.ok(sitemap.includes("<loc>https://illyu.net/</loc>"), "sitemap canonical URL is wrong");
assert.ok(fontLicense.includes("CC BY-SA 3.0"), "Pixel Script attribution is incomplete");
assert.ok(
    thirdPartyAssets.includes("Yusuke Kamiyamane") &&
        thirdPartyAssets.includes("Creative Commons Attribution 3.0"),
    "Fugue Icons attribution is incomplete",
);
assert.ok(thirdPartyAssets.includes("Jeelh Retro Cursors"), "Jeelh cursor attribution is missing");

const cursorFiles = [
    ["light", "Normal Select Light.cur"],
    ["light", "Select Light.cur"],
    ["light", "Text Select Light.cur"],
    ["light", "Move Light.cur"],
    ["dark", "Normal Select.cur"],
    ["dark", "Select.cur"],
    ["dark", "Text Select.cur"],
    ["dark", "Move.cur"],
];
await Promise.all(
    cursorFiles.map(async ([theme, file]) => {
        const cursor = await readFile(join(dist, "cursors", "jeelh", theme, file));
        assert.deepEqual(
            [...cursor.subarray(0, 4)],
            [0, 0, 2, 0],
            `Cursor asset is invalid: ${file}`,
        );
    }),
);

const osIconFiles = [
    "paper-plane.png",
    "git.png",
    "balloons.png",
    "balloon-twitter.png",
    "mail.png",
    "gear.png",
    "calendar.png",
    "clock.png",
    "user-silhouette-question.png",
];
await Promise.all(
    osIconFiles.map(async (file) => {
        const icon = await readFile(join(dist, "os-icons", "fugue", file));
        assert.equal(
            icon.subarray(0, 8).toString("hex"),
            "89504e470d0a1a0a",
            `Fugue icon is invalid: ${file}`,
        );
    }),
);

await Promise.all([
    access(join(dist, "favicon.svg")),
    access(join(dist, "fonts", "pixel-script.otf")),
    access(join(dist, "licenses", "KREATIVE-SOFTWARE-RELAY-FONTS-FREE-USE-LICENSE.txt")),
    access(join(dist, "robots.txt")),
    access(join(dist, "sitemap.xml")),
    access(join(dist, "_headers")),
]);

console.log(
    `Validated Pool OS: ${appIds.length} windows, ${launcherTags.length} launchers, ${cursorFiles.length} native cursor states, ${osIconFiles.length} Fugue icons, CSP/deploy files, ${(javascriptGzipBytes / 1024).toFixed(1)} KB JS gzip and ${(cssGzipBytes / 1024).toFixed(1)} KB CSS gzip.`,
);
