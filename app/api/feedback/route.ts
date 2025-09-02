import { Feedback } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { task_id, quote_id, user_type, verdict, comment } =
            await request.json();

        if (!quote_id || !user_type || !verdict) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        if (!["contractor", "client"].includes(user_type)) {
            return NextResponse.json(
                { error: "Invalid user_type" },
                { status: 400 }
            );
        }

        if (!["overpriced", "underpriced", "accurate"].includes(verdict)) {
            return NextResponse.json(
                { error: "Invalid verdict" },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        const { data: quoteData, error: quoteError } = await supabase
            .from("quotes")
            .select("*")
            .eq("quote_id", quote_id)
            .single();

        if (quoteError || !quoteData) {
            return NextResponse.json(
                { error: "Quote not found" },
                { status: 404 }
            );
        }

        const { data: feedbackData, error: feedbackError } = await supabase
            .from("feedback")
            .insert({
                task_id,
                quote_id,
                user_type,
                verdict,
                comment,
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (feedbackError) {
            console.error("Error storing feedback:", feedbackError);
            return NextResponse.json(
                { error: "Failed to store feedback" },
                { status: 500 }
            );
        }

        const confidenceImpact = verdict === "accurate" ? 0.1 : -0.05;

        return NextResponse.json({
            message: "Feedback recorded successfully",
            data: feedbackData,
        });
    } catch (error) {
        console.error("Error processing feedback:", error);
        return NextResponse.json(
            { error: "Failed to process feedback" },
            { status: 500 }
        );
    }
}
