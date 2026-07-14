const root = document.querySelector("[data-temmie-root]");
const trigger = root?.querySelector("[data-temmie-trigger]");
const message = root?.querySelector("[data-temmie-message]");

const readMessages = () => {
    const rawMessages = root?.dataset.messages;
    if (!rawMessages) return [];

    try {
        const parsed = JSON.parse(rawMessages);
        return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
    } catch {
        return [];
    }
};

const messages = readMessages();

if (trigger && message && messages.length > 0) {
    trigger.addEventListener("click", () => {
        message.textContent = messages[Math.floor(Math.random() * messages.length)];
    });
}
