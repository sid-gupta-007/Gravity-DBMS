import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// This replaces the missing __dirname functionality
const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			// Now the @ alias will work perfectly
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
});
