import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function getFromAddress() {
    return process.env.RESEND_FROM_EMAIL || "Tellr.me <onboarding@tellr.me>";
}

async function sendWaitlistWelcomeEmail(email: string, origin: string) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        console.warn("RESEND_API_KEY is missing. Skipping waitlist welcome email.");
        return;
    }

    const logoUrl = new URL("/tellr-logo.svg", origin).toString();

    const html = `
      <div style="margin:0;padding:32px 24px;background:#f7f4f1;font-family:Inter,Arial,sans-serif;color:#111218;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid rgba(17,18,24,0.08);border-radius:24px;padding:32px;box-shadow:0 20px 50px rgba(17,18,24,0.08);">
          <img
            src="${logoUrl}"
            alt="Tellr.me"
            width="180"
            style="display:block;height:auto;border:0;outline:none;text-decoration:none;margin:0 0 28px;"
          />
          <div style="font-size:16px;line-height:1.7;color:#111218;">
            <p style="margin:0 0 16px;">Hi,</p>
            <p style="margin:0 0 16px;">thank you for joining our private beta.</p>
            <p style="margin:0 0 16px;">We are having a good amount of beta testers and I'm happy to add you to the club too.</p>
            <p style="margin:0 0 16px;">You'll receive another email with a magic link.<br />See you super soon.</p>
            <p style="margin:24px 0 0;">- Giamp</p>
          </div>
        </div>
      </div>
    `;

    const text = [
        "Hi,",
        "",
        "thank you for joining our private beta.",
        "We are having a good amount of beta testers and I'm happy to add you to the club too.",
        "",
        "You'll receive another email with a magic link.",
        "See you super soon.",
        "",
        "- Giamp",
    ].join("\n");

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: getFromAddress(),
            to: [email],
            subject: "Welcome to the Tellr.me private beta",
            html,
            text,
        }),
    });

    if (!response.ok) {
        const payload = await response.text();
        throw new Error(`Resend error (${response.status}): ${payload}`);
    }
}

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
        } catch (e: unknown) {
            // Handle unique constraint (P2002)
            const code =
                typeof e === "object" && e !== null && "code" in e
                    ? (e as { code?: string }).code
                    : undefined;

            if (code === "P2002") {
                return NextResponse.json(
                    { message: "You are already subscribed to the waitlist!" },
                    { status: 200 }
                );
            }
            throw e;
        }

        try {
            await sendWaitlistWelcomeEmail(email, request.nextUrl.origin);
        } catch (emailError) {
            console.error("Waitlist email error:", emailError);
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
