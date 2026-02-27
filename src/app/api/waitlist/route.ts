import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email || !email.includes("@")) {
            return NextResponse.json(
                { error: "Please enter a valid email address." },
                { status: 400 }
            );
        }

        try {
            await prisma.waitlist.create({
                data: { email },
            });
        } catch (e: any) {
            // Handle unique constraint (P2002)
            if (e.code === 'P2002') {
                return NextResponse.json(
                    { message: "You are already subscribed to the waitlist!" },
                    { status: 200 }
                );
            }
            throw e;
        }

        return NextResponse.json(
            { message: "Thank you! We've added you to our waitlist." },
            { status: 201 }
        );
    } catch (error) {
        console.error("Waitlist error:", error);
        return NextResponse.json(
            { error: "Something went wrong. Please try again later." },
            { status: 500 }
        );
    }
}
