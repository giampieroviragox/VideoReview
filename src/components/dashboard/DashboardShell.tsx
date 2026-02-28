"use client";

import { useState } from "react";
import Link from "next/link";
import CampaignBuilder from "@/components/dashboard/CampaignBuilder";

type DashboardShellProps = {
  workspaceName: string;
  campaignRuntimeReady: boolean;
  campaigns: Array<{
    id: string;
    name: string;
    hasNoEndDate: boolean;
    endsAt: string | null;
    publicPath: string;
    submissions: Array<{
      id: string;
      reviewerName: string;
      reviewerEmail: string;
      reviewerRating: number | null;
      videoKey: string;
      createdAt: string;
    }>;
  }>;
};

function getCampaignState(hasNoEndDate: boolean, endsAt: string | null) {
  if (hasNoEndDate || !endsAt) {
    return "Active";
  }

  return new Date(endsAt).getTime() >= Date.now() ? "Active" : "Inactive";
}

export default function DashboardShell({
  workspaceName,
  campaignRuntimeReady,
  campaigns,
}: DashboardShellProps) {
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null
  );

  const selectedCampaign =
    campaigns.find((campaign) => campaign.id === selectedCampaignId) || null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "248px minmax(0, 1fr)",
        gap: 24,
        alignItems: "start",
      }}
    >
      <aside
        style={{
          position: "sticky",
          top: 24,
          borderRadius: 24,
          border: "1px solid var(--ink-3)",
          background: "rgba(10,10,15,.9)",
          padding: 18,
        }}
      >
        <Link href="/" className="logo" style={{ marginBottom: 18 }}>
          <span className="logo-mark">▶</span>
          VR
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            paddingBottom: 18,
            marginBottom: 18,
            borderBottom: "1px solid var(--ink-3)",
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, var(--brand), var(--brand-2))",
              color: "var(--pure)",
              fontFamily: "Syne, sans-serif",
              fontWeight: 800,
            }}
          >
            G
          </div>
          <div>
            <p style={{ fontWeight: 700 }}>Giampiero</p>
            <p style={{ color: "var(--fog)", fontSize: "var(--text-sm)" }}>
              {workspaceName}
            </p>
          </div>
        </div>

        <div>
          <p className="label" style={{ color: "var(--fog)", marginBottom: 10 }}>
            Menu
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid rgba(255,95,61,.18)",
              background: "rgba(255,95,61,.08)",
              color: "var(--white)",
            }}
          >
            <span style={{ color: "var(--brand-2)" }}>◉</span>
            Campaign
          </div>
        </div>
      </aside>

      <section style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 24,
            border: "1px solid var(--ink-3)",
            borderRadius: 24,
            padding: "22px clamp(18px, 3vw, 28px)",
            background: "rgba(17,17,24,.9)",
          }}
        >
          <div>
            <p className="label" style={{ color: "var(--brand-2)", marginBottom: 8 }}>
              Campaign
            </p>
            <h1 className="heading" style={{ fontSize: "clamp(30px, 4vw, 46px)", marginBottom: 8 }}>
              Your campaigns
            </h1>
            <p style={{ color: "var(--fog)", maxWidth: 680 }}>
              Create and manage your public video review campaigns from here.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowBuilder((current) => !current)}
          >
            {showBuilder ? "Close builder" : "Create new campaign"}
          </button>
        </div>

        {!campaignRuntimeReady && (
          <div
            style={{
              marginBottom: 24,
              borderRadius: 20,
              border: "1px solid rgba(255,95,61,.18)",
              background: "rgba(255,95,61,.08)",
              padding: 18,
              color: "var(--brand-2)",
            }}
          >
            Campaign data is not available in the current server runtime. Restart the dev server if this message appears again.
          </div>
        )}

        {showBuilder && (
          <div style={{ marginBottom: 24 }}>
            <CampaignBuilder />
          </div>
        )}

        <div
          style={{
            border: "1px solid var(--ink-3)",
            borderRadius: 24,
            background: "rgba(17,17,24,.86)",
            overflow: "hidden",
          }}
        >
          {campaigns.length === 0 ? (
            <div style={{ padding: 24, color: "var(--fog)" }}>
              No campaigns created yet.
            </div>
          ) : (
            campaigns.map((campaign, index) => {
              const state = getCampaignState(campaign.hasNoEndDate, campaign.endsAt);

              return (
                <div
                  key={campaign.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                    padding: "18px 22px",
                    borderTop: index === 0 ? "none" : "1px solid var(--ink-3)",
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 700, marginBottom: 6 }}>{campaign.name}</p>
                    <p style={{ color: "var(--fog)", fontSize: "var(--text-sm)" }}>
                      {campaign.publicPath}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "6px 10px",
                        borderRadius: 999,
                        border:
                          state === "Active"
                            ? "1px solid rgba(61,255,160,.16)"
                            : "1px solid rgba(255,95,61,.18)",
                        background:
                          state === "Active"
                            ? "rgba(61,255,160,.08)"
                            : "rgba(255,95,61,.08)",
                        color: state === "Active" ? "var(--success)" : "var(--brand-2)",
                        fontSize: "var(--text-xs)",
                        fontFamily: "Syne, sans-serif",
                      }}
                    >
                      {state}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() =>
                        setSelectedCampaignId((current) =>
                          current === campaign.id ? null : campaign.id
                        )
                      }
                    >
                      {selectedCampaignId === campaign.id
                        ? "Hide submissions"
                        : "Submissions"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {selectedCampaign && (
          <div
            style={{
              marginTop: 24,
              border: "1px solid var(--ink-3)",
              borderRadius: 24,
              background: "rgba(17,17,24,.86)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px 22px",
                borderBottom: "1px solid var(--ink-3)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <p
                  className="label"
                  style={{ color: "var(--brand-2)", marginBottom: 8 }}
                >
                  Submissions
                </p>
                <h2
                  className="heading"
                  style={{ fontSize: "clamp(22px, 3vw, 30px)", marginBottom: 6 }}
                >
                  {selectedCampaign.name}
                </h2>
                <p style={{ color: "var(--fog)", fontSize: "var(--text-sm)" }}>
                  Collected reviews for this campaign.
                </p>
              </div>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--ink-3)",
                  background: "rgba(255,255,255,.04)",
                  color: "var(--smoke)",
                  fontSize: "var(--text-xs)",
                  fontFamily: "Syne, sans-serif",
                }}
              >
                {selectedCampaign.submissions.length} total
              </span>
            </div>

            {selectedCampaign.submissions.length === 0 ? (
              <div style={{ padding: 22, color: "var(--fog)" }}>
                No submissions collected yet.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 860,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        color: "var(--fog)",
                        textAlign: "left",
                        fontSize: "var(--text-xs)",
                        textTransform: "uppercase",
                        letterSpacing: ".08em",
                      }}
                    >
                      <th style={{ padding: "12px 16px" }}>ID</th>
                      <th style={{ padding: "12px 16px" }}>Date</th>
                      <th style={{ padding: "12px 16px" }}>Name</th>
                      <th style={{ padding: "12px 16px" }}>Email</th>
                      <th style={{ padding: "12px 16px" }}>Rating</th>
                      <th style={{ padding: "12px 16px" }}>Video</th>
                      <th style={{ padding: "12px 16px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCampaign.submissions.map((submission) => (
                      <tr
                        key={submission.id}
                        style={{ borderTop: "1px solid var(--ink-3)" }}
                      >
                        <td
                          style={{
                            padding: "14px 16px",
                            fontFamily:
                              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: "12px",
                            color: "var(--smoke)",
                          }}
                        >
                          {submission.id}
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            color: "var(--smoke)",
                          }}
                        >
                          {new Date(submission.createdAt).toLocaleDateString()}
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            fontWeight: 600,
                          }}
                        >
                          {submission.reviewerName}
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            color: "var(--smoke)",
                          }}
                        >
                          {submission.reviewerEmail}
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            color: "var(--warn)",
                            fontWeight: 600,
                          }}
                        >
                          {submission.reviewerRating
                            ? `${submission.reviewerRating}/5`
                            : "No rating"}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "6px 10px",
                              borderRadius: 999,
                              border: "1px solid rgba(255,95,61,.18)",
                              background: "rgba(255,95,61,.08)",
                              color: "var(--brand-2)",
                              fontSize: "var(--text-xs)",
                              fontFamily: "Syne, sans-serif",
                            }}
                            title={submission.videoKey}
                          >
                            Video stored
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <a
                            href={`/api/campaigns/${selectedCampaign.id}/submissions/${submission.id}/view`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-ghost"
                          >
                            View
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      <style>{`
        @media (max-width: 980px) {
          div[style*="grid-template-columns: 248px minmax(0, 1fr)"] {
            grid-template-columns: 1fr !important;
          }

          aside {
            position: static !important;
          }
        }
      `}</style>
    </div>
  );
}
