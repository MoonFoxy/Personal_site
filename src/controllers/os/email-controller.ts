import { CONTACT_EMAIL } from "../../models/app-registry";

export const mountEmail = (shell: HTMLElement) => {
    const form = shell.querySelector<HTMLFormElement>("[data-email-form]");
    if (!form) return () => undefined;

    const onSubmit = (event: SubmitEvent) => {
        event.preventDefault();
        const data = new FormData(form);
        const subject = String(data.get("subject") ?? "").trim();
        const message = String(data.get("message") ?? data.get("body") ?? "").trim();
        const params = new URLSearchParams();
        if (subject) params.set("subject", subject);
        if (message) params.set("body", message);
        const query = params.toString();
        window.location.assign(`mailto:${CONTACT_EMAIL}${query ? `?${query}` : ""}`);
    };

    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
};
