// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
    site: "https://illyu.net",
    build: {
        format: "directory",
    },
    vite: {
        server: {
            watch: {
                // Files written through the shared workspace do not always emit
                // native change events on the F: drive.
                usePolling: true,
                interval: 250,
            },
        },
    },
});
