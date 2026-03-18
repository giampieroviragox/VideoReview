import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ campaignId: string }>;
};

export default async function DashboardCampaignRedirectPage({ params }: PageProps) {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  const { campaignId } = await params;
  redirect(`/dashboard/campaigns/${campaignId}/submissions`);
}
