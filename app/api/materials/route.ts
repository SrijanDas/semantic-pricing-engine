import { getConfidenceTier, getEmbedding } from "@/lib/embeddings";
import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");

    if (!query) {
        return NextResponse.json(
            { error: "Missing query parameter" },
            { status: 400 }
        );
    }

    const supabase = await createClient();

    const embedding = await getEmbedding(query);

    const { data: documents } = await supabase.rpc(
        "search_materials_semantic",
        {
            query_embedding: embedding,
            match_threshold: 0.78,
            match_count: 10,
        }
    );

    const data = documents?.map(({ embedding, ...rest }: any) => {
        const confidence_tier = getConfidenceTier(rest.similarity_score);
        return { ...rest, confidence_tier };
    });

    return NextResponse.json({
        data,
    });
}
