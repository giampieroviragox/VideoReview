import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import SubmissionForm from "@/components/SubmissionForm";
import type { Metadata } from "next";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const page = await prisma.collectionPage.findUnique({
        where: { slug },
    });

    if (!page) {
        return { title: "Pagina non trovata" };
    }

    return {
        title: `${page.title} — ${page.companyName}`,
        description:
            page.description || `Lascia una video recensione per ${page.companyName}`,
    };
}

export default async function CollectionPageRoute({ params }: PageProps) {
    const { slug } = await params;
    const page = await prisma.collectionPage.findUnique({
        where: { slug },
    });

    if (!page) {
        notFound();
    }

    return (
        <main className="collection-page">
            <SubmissionForm
                slug={page.slug}
                companyName={page.companyName}
                title={page.title}
                description={page.description}
            />
        </main>
    );
}
