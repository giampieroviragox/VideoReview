import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email || !email.includes("@")) {
            return NextResponse.json(
                { error: "Inserisci un indirizzo email valido." },
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
                    { message: "Sei già iscritto alla waitlist!" },
                    { status: 200 }
                );
            }
            throw e;
        }

        return NextResponse.json(
            { message: "Grazie! Ti abbiamo aggiunto alla waitlist." },
            { status: 201 }
        );
    } catch (error) {
        console.error("Waitlist error:", error);
        return NextResponse.json(
            { error: "Si è verificato un errore. Riprova più tardi." },
            { status: 500 }
        );
    }
}
