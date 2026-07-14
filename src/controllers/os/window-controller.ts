import { APP_IDS, type AppId } from "../../models/app-registry";
import { translate } from "../../services/i18n";
import type { LocaleReader } from "./types";

const MOBILE_QUERY = "(max-width: 700px), (max-height: 500px) and (pointer: coarse)";
const COARSE_POINTER_QUERY = "(pointer: coarse)";

interface ManagedWindow {
    appId: AppId;
    element: HTMLElement;
    launcher?: HTMLElement;
    open: boolean;
    minimized: boolean;
    zIndex: number;
}

const isAppId = (value: unknown): value is AppId =>
    typeof value === "string" && APP_IDS.includes(value as AppId);

const appIdFor = (element: HTMLElement | null | undefined, kind: "launcher" | "window") => {
    if (!element) return undefined;
    const marker = kind === "launcher" ? element.dataset.appLauncher : element.dataset.appWindow;
    const value = marker || element.dataset.appId;
    return isAppId(value) ? value : undefined;
};

interface WindowManagerDependencies {
    getLocale: LocaleReader;
    onGitHubOpen: () => void;
}

export const mountWindowManager = (
    shell: HTMLElement,
    { getLocale, onGitHubOpen }: WindowManagerDependencies,
) => {
    const launchers = new Map<AppId, HTMLElement>();
    shell.querySelectorAll<HTMLElement>("[data-app-launcher]").forEach((launcher) => {
        const appId = appIdFor(launcher, "launcher");
        if (appId) {
            launchers.set(appId, launcher);
            launcher.removeAttribute("target");
        }
    });

    const windows = new Map<AppId, ManagedWindow>();
    let zIndex = 20;
    shell.querySelectorAll<HTMLElement>("[data-app-window]").forEach((element) => {
        const appId = appIdFor(element, "window");
        if (!appId || windows.has(appId)) return;
        element.hidden = true;
        element.dataset.open = "false";
        element.dataset.minimized = "false";
        windows.set(appId, {
            appId,
            element,
            launcher: launchers.get(appId),
            open: false,
            minimized: false,
            zIndex: 0,
        });
    });

    const mobile = window.matchMedia(MOBILE_QUERY);
    const coarsePointer = window.matchMedia(COARSE_POINTER_QUERY);
    const activeWindow = () =>
        [...windows.values()]
            .filter((item) => item.open && !item.minimized)
            .sort((first, second) => second.zIndex - first.zIndex)[0];

    const sync = () => {
        const active = activeWindow();
        shell.dataset.mobileWindows = String(mobile.matches);
        windows.forEach((item) => {
            const isActive = item === active;
            const hideForMobile = mobile.matches && item.open && !item.minimized && !isActive;
            item.element.hidden = !item.open || item.minimized || hideForMobile;
            item.element.classList.toggle("is-open", item.open);
            item.element.classList.toggle("is-active", isActive);
            item.element.classList.toggle("is-minimized", item.minimized);
            item.element.classList.toggle("is-mobile-background", hideForMobile);
            item.element.dataset.open = String(item.open);
            item.element.dataset.minimized = String(item.minimized);
            item.element.dataset.active = String(isActive);
            item.element.setAttribute(
                "aria-hidden",
                String(!item.open || item.minimized || hideForMobile),
            );
            item.element.inert = !item.open || item.minimized || hideForMobile;

            if (item.launcher) {
                item.launcher.classList.toggle("is-running", item.open);
                item.launcher.classList.toggle("is-active", isActive);
                item.launcher.setAttribute(
                    "aria-expanded",
                    String(item.open && !item.minimized && !hideForMobile),
                );
                item.launcher.dataset.running = String(item.open);
                const appName = translate(getLocale(), `app.${item.appId}`);
                item.launcher.setAttribute(
                    "aria-label",
                    translate(getLocale(), isActive ? "launcher.close" : "launcher.open", {
                        app: appName,
                    }),
                );
            }
        });
    };

    const positioningRect = (item: ManagedWindow) => {
        const parent = item.element.offsetParent;
        return parent instanceof HTMLElement
            ? parent.getBoundingClientRect()
            : shell.getBoundingClientRect();
    };
    const clampPosition = (item: ManagedWindow, left: number, top: number) => {
        const bounds = positioningRect(item);
        const elementRect = item.element.getBoundingClientRect();
        const minimumLeft = 6;
        const minimumTop = 6;
        const maximumLeft = Math.max(minimumLeft, bounds.width - elementRect.width - 6);
        const maximumTop = Math.max(minimumTop, bounds.height - elementRect.height - 6);
        return {
            left: Math.round(Math.min(maximumLeft, Math.max(minimumLeft, left))),
            top: Math.round(Math.min(maximumTop, Math.max(minimumTop, top))),
        };
    };
    const positionWindow = (item: ManagedWindow) => {
        if (mobile.matches) return;
        const bounds = positioningRect(item);
        const rect = item.element.getBoundingClientRect();
        const position = clampPosition(item, rect.left - bounds.left, rect.top - bounds.top);
        item.element.style.left = `${position.left}px`;
        item.element.style.top = `${position.top}px`;
        item.element.style.transform = "none";
        item.element.dataset.windowPositioned = "true";
    };
    const focusWindow = (item: ManagedWindow) => {
        item.open = true;
        item.minimized = false;
        item.zIndex = ++zIndex;
        item.element.style.zIndex = String(item.zIndex);
        sync();
        positionWindow(item);
        if (item.appId === "github") onGitHubOpen();
    };
    const closeWindow = (item: ManagedWindow, returnFocus = true) => {
        item.open = false;
        item.minimized = false;
        sync();
        if (returnFocus) item.launcher?.focus({ preventScroll: true });
    };

    const onLauncher = (event: MouseEvent) => {
        const target = event.target instanceof Element ? event.target : null;
        const launcher = target?.closest<HTMLElement>("[data-app-launcher]");
        const appId = appIdFor(launcher, "launcher");
        if (!launcher || !appId) return;
        const item = windows.get(appId);
        if (!item) return;
        event.preventDefault();
        if (item.open && !item.minimized && activeWindow() === item) {
            closeWindow(item, false);
        } else {
            focusWindow(item);
            window.requestAnimationFrame(() => item.element.focus({ preventScroll: true }));
        }
    };
    const onWindowControl = (event: MouseEvent) => {
        const target = event.target instanceof Element ? event.target : null;
        const windowElement = target?.closest<HTMLElement>("[data-app-window]");
        const appId = appIdFor(windowElement, "window");
        if (!windowElement || !appId) return;
        const item = windows.get(appId);
        if (!item) return;
        if (target?.closest("[data-window-close]")) {
            event.preventDefault();
            closeWindow(item);
            return;
        }
        focusWindow(item);
    };

    interface DragState {
        item: ManagedWindow;
        pointerId: number;
        offsetX: number;
        offsetY: number;
        titlebar: HTMLElement;
    }
    let drag: DragState | null = null;
    const onPointerDown = (event: PointerEvent) => {
        if (mobile.matches || coarsePointer.matches || event.button !== 0) return;
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest("button, a, input, textarea, select, [role='button']")) return;
        const titlebar = target?.closest<HTMLElement>("[data-window-titlebar]");
        const windowElement = titlebar?.closest<HTMLElement>("[data-app-window]");
        const appId = appIdFor(windowElement, "window");
        if (!titlebar || !windowElement || !appId) return;
        const item = windows.get(appId);
        if (!item) return;
        focusWindow(item);
        const rect = windowElement.getBoundingClientRect();
        drag = {
            item,
            pointerId: event.pointerId,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            titlebar,
        };
        titlebar.setPointerCapture(event.pointerId);
        windowElement.classList.add("is-dragging");
        event.preventDefault();
    };
    const onPointerMove = (event: PointerEvent) => {
        if (!drag || drag.pointerId !== event.pointerId) return;
        const bounds = positioningRect(drag.item);
        const position = clampPosition(
            drag.item,
            event.clientX - bounds.left - drag.offsetX,
            event.clientY - bounds.top - drag.offsetY,
        );
        drag.item.element.style.left = `${position.left}px`;
        drag.item.element.style.top = `${position.top}px`;
        drag.item.element.style.transform = "none";
    };
    const endDrag = (event: PointerEvent) => {
        if (!drag || drag.pointerId !== event.pointerId) return;
        drag.item.element.classList.remove("is-dragging");
        if (drag.titlebar.hasPointerCapture(event.pointerId)) {
            drag.titlebar.releasePointerCapture(event.pointerId);
        }
        drag = null;
    };
    const onKeydown = (event: KeyboardEvent) => {
        if (event.key === " " && !event.repeat) {
            const target = event.target instanceof Element ? event.target : null;
            const launcher = target?.closest<HTMLElement>("[data-app-launcher]");
            if (launcher) {
                event.preventDefault();
                launcher.click();
                return;
            }
        }
        if (event.key !== "Escape") return;
        const active = activeWindow();
        if (!active) return;
        event.preventDefault();
        closeWindow(active);
    };
    const onResize = () => {
        sync();
        if (mobile.matches) return;
        windows.forEach((item) => {
            if (!item.open || item.minimized || item.element.dataset.windowPositioned !== "true")
                return;
            const bounds = positioningRect(item);
            const rect = item.element.getBoundingClientRect();
            const position = clampPosition(item, rect.left - bounds.left, rect.top - bounds.top);
            item.element.style.left = `${position.left}px`;
            item.element.style.top = `${position.top}px`;
        });
    };

    shell.addEventListener("click", onLauncher);
    shell.addEventListener("click", onWindowControl);
    shell.addEventListener("pointerdown", onPointerDown);
    shell.addEventListener("pointermove", onPointerMove);
    shell.addEventListener("pointerup", endDrag);
    shell.addEventListener("pointercancel", endDrag);
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("resize", onResize);
    window.addEventListener("illyune:locale-change", sync);
    mobile.addEventListener("change", onResize);
    sync();

    return () => {
        shell.removeEventListener("click", onLauncher);
        shell.removeEventListener("click", onWindowControl);
        shell.removeEventListener("pointerdown", onPointerDown);
        shell.removeEventListener("pointermove", onPointerMove);
        shell.removeEventListener("pointerup", endDrag);
        shell.removeEventListener("pointercancel", endDrag);
        window.removeEventListener("keydown", onKeydown);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("illyune:locale-change", sync);
        mobile.removeEventListener("change", onResize);
    };
};
