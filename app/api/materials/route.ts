import { semanticSearch } from "@/lib/semantic-search";
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

    try {
        const data = await semanticSearch({ query });

        return NextResponse.json({
            data,
        });
    } catch (error) {
        console.error("Error fetching materials:", error);
        return NextResponse.json(
            { error: "Failed to fetch materials" },
            { status: 500 }
        );
    }
}
