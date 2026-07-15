import { execFileSync } from "node:child_process";

const fail = (message) => {
    console.error(`Version check failed: ${message}`);
    process.exit(1);
};

const git = (args) => execFileSync("git", args, { encoding: "utf8" }).trim();

const parseVersion = (value, label) => {
    const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.exec(value);
    if (!match) fail(`${label} must use MAJOR.MINOR.PATCH, received ${JSON.stringify(value)}.`);
    return match.slice(1).map(Number);
};

const isGreaterVersion = (next, previous) => {
    for (let index = 0; index < previous.length; index += 1) {
        if (next[index] !== previous[index]) return next[index] > previous[index];
    }
    return false;
};

const readVersion = (revision) => {
    let packageJson;
    try {
        const packagePath = revision === ":" ? ":package.json" : `${revision}:package.json`;
        packageJson = JSON.parse(git(["show", packagePath]));
    } catch {
        fail(`Unable to read package.json from ${revision}.`);
    }

    if (typeof packageJson.version !== "string") fail(`${revision}:package.json has no version.`);
    return packageJson.version;
};

try {
    git(["rev-parse", "--verify", "HEAD"]);
} catch {
    process.exit(0);
}

const stagedFiles = git(["diff", "--cached", "--name-only", "--", "package.json"]);
if (!stagedFiles) {
    fail("Stage a higher package.json version before creating a commit.");
}

const previousVersion = readVersion("HEAD");
const nextVersion = readVersion(":");
const previousParts = parseVersion(previousVersion, "Current version");
const nextParts = parseVersion(nextVersion, "Staged version");

if (!isGreaterVersion(nextParts, previousParts)) {
    fail(`Staged version ${nextVersion} must be higher than ${previousVersion}.`);
}

console.log(`Version check passed: ${previousVersion} -> ${nextVersion}`);
