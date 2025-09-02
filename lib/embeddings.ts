import OpenAI from "openai";

export async function getEmbedding(input: string) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: input,
    });

    return embedding.data[0].embedding;
}

const CONFIDENCE_THRESHOLDS = {
    HIGH: 0.75,
    MEDIUM: 0.6,
    LOW: 0.4,
};

export function getConfidenceTier(similarityScore: number) {
    if (similarityScore >= CONFIDENCE_THRESHOLDS.HIGH) {
        return "HIGH";
    } else if (similarityScore >= CONFIDENCE_THRESHOLDS.MEDIUM) {
        return "MEDIUM";
    } else {
        return "LOW";
    }
}
