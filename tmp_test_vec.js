import { generateEmbedding } from './src/lib/embeddings.js';

function cosineSimilarity(A, B) {
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < A.length; i++) {
        dotProduct += A[i] * B[i];
        normA += A[i] * A[i];
        normB += B[i] * B[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function test() {
    console.log("Generating embeddings...");
    const q1 = await generateEmbedding("how to beat my friend?");
    const q2 = await generateEmbedding("John Doe");
    const db1 = await generateEmbedding("John Doe. A brilliant student studying computer science and playing basketball. Category: Student");
    
    const sim1 = cosineSimilarity(q1, db1);
    const sim2 = cosineSimilarity(q2, db1);
    console.log(`SIMILARITY_NONSENSE: ${sim1}`);
    console.log(`SIMILARITY_EXACT: ${sim2}`);
}
test();
