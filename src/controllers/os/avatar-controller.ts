const getFrame = (image: HTMLImageElement) => image.closest<HTMLElement>("[data-avatar-frame]");

const setAvatarState = (frame: HTMLElement, state: "loading" | "loaded" | "error") => {
    frame.dataset.avatarState = state;
    const placeholder = frame.querySelector<HTMLElement>("[data-avatar-placeholder]");
    if (placeholder) {
        placeholder.dataset.avatarPlaceholderState = state;
        placeholder.hidden = state === "loaded";
    }
};

const reflectImageState = (image: HTMLImageElement) => {
    const frame = getFrame(image);
    if (!frame) return;

    setAvatarState(frame, image.complete && image.naturalWidth > 0 ? "loaded" : "loading");
};

export const mountAvatarPlaceholders = (root: ParentNode = document) => {
    const images = [...root.querySelectorAll<HTMLImageElement>("img[data-avatar-image]")];
    const cleanups = images.map((image) => {
        const onLoad = () => reflectImageState(image);
        const onError = () => {
            const frame = getFrame(image);
            if (frame) setAvatarState(frame, "error");
        };

        image.addEventListener("load", onLoad);
        image.addEventListener("error", onError);
        reflectImageState(image);

        return () => {
            image.removeEventListener("load", onLoad);
            image.removeEventListener("error", onError);
        };
    });

    const sourceObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (!(mutation.target instanceof HTMLImageElement)) return;
            const frame = getFrame(mutation.target);
            if (!frame) return;

            setAvatarState(frame, "loading");
            reflectImageState(mutation.target);
        });
    });
    images.forEach((image) =>
        sourceObserver.observe(image, { attributes: true, attributeFilter: ["src"] }),
    );

    return () => {
        sourceObserver.disconnect();
        cleanups.forEach((cleanup) => cleanup());
    };
};
