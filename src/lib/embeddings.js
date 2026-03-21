import { pipeline } from "@huggingface/transformers";

let embedder = null;

/**
 * Get or initialize the embedding pipeline.
 * Uses all-MiniLM-L6-v2 (384-dim vectors).
 * The model (~80MB) is downloaded once and cached by the browser.
 */
async function getEmbedder() {
	if (!embedder) {
		embedder = await pipeline(
			"feature-extraction",
			"Xenova/all-MiniLM-L6-v2",
			{ dtype: "q8" }
		);
	}
	return embedder;
}

/**
 * Generate a 384-dimensional embedding for a text string
 * using all-MiniLM-L6-v2 — runs locally in the browser, completely free.
 */
export async function generateEmbedding(text) {
	const pipe = await getEmbedder();
	const output = await pipe(text, { pooling: "mean", normalize: true });
	// output.data is a Float32Array, convert to regular array
	return Array.from(output.data);
}

/**
 * Compute cosine similarity between two vectors (0 to 1)
 */
export function cosineSimilarity(a, b) {
	if (!a || !b || a.length !== b.length) return 0;
	let dot = 0,
		magA = 0,
		magB = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		magA += a[i] * a[i];
		magB += b[i] * b[i];
	}
	return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
