import { getEmbedding } from "@/lib/embeddings";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const CONTRACTOR_MARKUP = 0.25; // 25% markup
const VAT_RATES = {
    RENOVATION: 0.1, // 10% for bathroom renovation
    NEW_BUILD: 0.2, // 20% for new construction
};

interface Task {
    label: string;
    materials: Array<{
        name: string;
        quantity: number;
        unit: string;
        unit_price: number | string;
    }>;
    estimated_duration: string;
    margin_protected_price: number;
    confidence_score: number;
}

export async function POST(request: NextRequest) {
    try {
        const { transcript } = await request.json();

        if (!transcript) {
            return NextResponse.json(
                { error: "Missing transcript in request body" },
                { status: 400 }
            );
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // Extract tasks and materials from transcript
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content:
                        "You are a construction task analyzer. Extract tasks and required materials from the transcript. For each material, estimate the quantity needed based on industry standards.",
                },
                {
                    role: "user",
                    content: transcript,
                },
            ],
            functions: [
                {
                    name: "analyze_construction_request",
                    parameters: {
                        type: "object",
                        properties: {
                            tasks: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        label: { type: "string" },
                                        materials: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    name: { type: "string" },
                                                    quantity: {
                                                        type: "number",
                                                    },
                                                    unit: { type: "string" },
                                                },
                                            },
                                        },
                                        estimated_hours: { type: "number" },
                                    },
                                },
                            },
                            is_renovation: { type: "boolean" },
                        },
                    },
                },
            ],
            function_call: { name: "analyze_construction_request" },
        });

        const analysisResult = JSON.parse(
            completion.choices[0].message.function_call?.arguments || "{}"
        );
        const supabase = await createClient();

        // Process each task
        const tasks: Task[] = await Promise.all(
            analysisResult.tasks.map(async (task: any) => {
                // Search for materials in database
                const materialPromises = task.materials.map(
                    async (material: any) => {
                        const embedding = await getEmbedding(material.name);
                        const { data: matches } = await supabase.rpc(
                            "search_materials_semantic",
                            {
                                query_embedding: embedding,
                                match_threshold: 0.78,
                                match_count: 3,
                            }
                        );

                        // Get best match or use fallback pricing
                        const bestMatch = matches?.[0];
                        const price = bestMatch.price ?? "NA";

                        return {
                            name: material.name,
                            quantity: material.quantity,
                            unit: material.unit,
                            unit_price: price,
                        };
                    }
                );

                const materials = await Promise.all(materialPromises);

                // Calculate total material cost
                const materialCost = materials.reduce(
                    (sum, mat) => sum + mat.unit_price * mat.quantity,
                    0
                );

                // Add contractor markup
                const markedUpCost = materialCost * (1 + CONTRACTOR_MARKUP);

                // Add VAT
                const vatRate = analysisResult.is_renovation
                    ? VAT_RATES.RENOVATION
                    : VAT_RATES.NEW_BUILD;
                const finalCost = markedUpCost * (1 + vatRate);

                // Calculate confidence score based on material matches and task clarity
                const confidenceScore = calculateConfidenceScore(
                    materials,
                    task.label
                );

                return {
                    label: task.label,
                    materials,
                    estimated_duration: formatDuration(task.estimated_hours),
                    margin_protected_price: Math.round(finalCost),
                    confidence_score: confidenceScore,
                };
            })
        );

        return NextResponse.json({
            tasks,
        });
    } catch (error) {
        console.error("Error generating proposal:", error);
        return NextResponse.json(
            { error: "Failed to generate proposal" },
            { status: 500 }
        );
    }
}

function calculateConfidenceScore(materials: any[], taskLabel: string): number {
    // Calculate confidence based on:
    // 1. Percentage of materials found in database
    // 2. Clarity of task description
    // 3. Price confidence

    const materialsFound = materials.filter((m) => m.unit_price > 0).length;
    const materialConfidence = materialsFound / materials.length;

    // Task clarity score based on specific keywords and phrase patterns
    const taskClarity = taskLabel.split(" ").length >= 3 ? 0.9 : 0.7;

    // Combine scores with weights
    const weightedScore = materialConfidence * 0.7 + taskClarity * 0.3;

    // Return rounded score between 0 and 1
    return Math.round(weightedScore * 100) / 100;
}

function formatDuration(hours: number): string {
    if (hours <= 8) {
        return `${hours} hour${hours === 1 ? "" : "s"}`;
    }
    const days = Math.ceil(hours / 8);
    return `${days} day${days === 1 ? "" : "s"}`;
}
