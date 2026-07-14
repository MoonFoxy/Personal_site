const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

interface ParallaxState {
    x: number;
    y: number;
}

const clamp = (value: number) => Math.min(1, Math.max(-1, value));

export const mountParallax = () => {
    const stage = document.querySelector<HTMLElement>(".pool-site");
    if (!stage) return () => undefined;

    const finePointer = window.matchMedia(FINE_POINTER_QUERY);
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
    let frame = 0;
    let target: ParallaxState = { x: 0, y: 0 };

    const enabled = () => finePointer.matches && !reducedMotion.matches;
    const apply = () => {
        frame = 0;
        const poolX = target.x * 2.5;
        const poolY = target.y * 2;
        stage.style.setProperty("--pool-parallax-x", `${poolX.toFixed(2)}px`);
        stage.style.setProperty("--pool-parallax-y", `${poolY.toFixed(2)}px`);
        stage.style.setProperty("--wordmark-parallax-x", `${(-poolX * 0.34).toFixed(2)}px`);
        stage.style.setProperty("--wordmark-parallax-y", `${(-poolY * 0.34).toFixed(2)}px`);
    };
    const schedule = () => {
        if (!frame) frame = window.requestAnimationFrame(apply);
    };
    const reset = () => {
        target = { x: 0, y: 0 };
        schedule();
    };
    const onPointerMove = (event: PointerEvent) => {
        if (!enabled()) return;
        const bounds = stage.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        target = {
            x: clamp(((event.clientX - bounds.left) / bounds.width) * 2 - 1),
            y: clamp(((event.clientY - bounds.top) / bounds.height) * 2 - 1),
        };
        schedule();
    };
    const onEnvironmentChange = () => {
        if (!enabled()) reset();
    };

    stage.addEventListener("pointermove", onPointerMove, { passive: true });
    stage.addEventListener("pointerleave", reset, { passive: true });
    finePointer.addEventListener("change", onEnvironmentChange);
    reducedMotion.addEventListener("change", onEnvironmentChange);
    reset();

    return () => {
        stage.removeEventListener("pointermove", onPointerMove);
        stage.removeEventListener("pointerleave", reset);
        finePointer.removeEventListener("change", onEnvironmentChange);
        reducedMotion.removeEventListener("change", onEnvironmentChange);
        if (frame) window.cancelAnimationFrame(frame);
        stage.style.removeProperty("--pool-parallax-x");
        stage.style.removeProperty("--pool-parallax-y");
        stage.style.removeProperty("--wordmark-parallax-x");
        stage.style.removeProperty("--wordmark-parallax-y");
    };
};
