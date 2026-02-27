import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ DATABASE_URL missing from environment");
    process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("🌱 Seeding database...");

    const page = await prisma.collectionPage.upsert({
        where: { slug: "demo-company" },
        update: {},
        create: {
            slug: "demo-company",
            companyName: "Demo Company",
            title: "Lasciaci una video recensione!",
            description:
                "Raccontaci la tua esperienza in un breve video. Ci vogliono solo pochi secondi e ci aiuterai tantissimo!",
        },
    });

    console.log(`✅ Created collection page: ${page.companyName} (/${page.slug})`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
