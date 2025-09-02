import { getConfidenceTier, getEmbedding } from "./embeddings";
import { createClient } from "./supabase/server";

export async function semanticSearch({
    query,
    limit = 5,
}: {
    query: string;
    limit?: number;
}) {
    const supabase = await createClient();
    const embedding = await getEmbedding(query);

    const { data: documents } = await supabase.rpc(
        "search_materials_semantic",
        {
            query_embedding: embedding,
            match_threshold: 0.78,
            match_count: limit,
        }
    );

    const data = documents?.map(({ embedding, ...rest }: any) => {
        const confidence_tier = getConfidenceTier(rest.similarity_score);
        return { ...rest, confidence_tier };
    });

    return data;
}
