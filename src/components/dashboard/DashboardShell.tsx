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
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const selectedCampaign =
    campaigns.find((campaign) => campaign.id === selectedCampaignId) || null;

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link href="/" className="dashboard-brand">
          <span className="dashboard-brand-mark">▶</span>
          <span className="dashboard-brand-text">VR</span>
        </Link>

        <div className="dashboard-profile-card">
          <div className="dashboard-avatar">G</div>
          <div>
            <p className="dashboard-profile-name">Giampiero</p>
            <p className="dashboard-profile-workspace">{workspaceName}</p>
          </div>
        </div>

        <div className="dashboard-nav-group">
          <p className="dashboard-nav-label">Menu</p>
          <button type="button" className="dashboard-nav-item dashboard-nav-item-active">
            <span className="dashboard-nav-dot" />
            Campaign
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <div className="dashboard-hero-card">
          <div>
            <p className="dashboard-eyebrow">Campaign</p>
            <h1 className="dashboard-title">Your campaigns</h1>
            <p className="dashboard-subtitle">
              Create and manage your public video review campaigns from here.
            </p>
          </div>

          <button
            type="button"
            className="dashboard-action-btn"
            onClick={() => setShowBuilder((current) => !current)}
          >
            {showBuilder ? "Close builder" : "Create new campaign"}
          </button>
        </div>

        {!campaignRuntimeReady && (
          <div className="dashboard-alert-card">
            Campaign data is not available in the current server runtime. Restart the dev server if this message appears again.
          </div>
        )}

        {showBuilder && (
          <div className="dashboard-builder-wrap">
            <CampaignBuilder />
          </div>
        )}

        <div className="dashboard-list-card">
          {campaigns.length === 0 ? (
            <div className="dashboard-empty-state">No campaigns created yet.</div>
          ) : (
            campaigns.map((campaign, index) => {
              const state = getCampaignState(campaign.hasNoEndDate, campaign.endsAt);

              return (
                <div
                  key={campaign.id}
                  className={`dashboard-campaign-row ${index > 0 ? "with-divider" : ""}`}
                >
                  <div className="dashboard-campaign-copy">
                    <p className="dashboard-campaign-name">{campaign.name}</p>
                    <p className="dashboard-campaign-path">{campaign.publicPath}</p>
                  </div>

                  <div className="dashboard-campaign-actions">
                    <span
                      className={`dashboard-status-badge ${
                        state === "Active" ? "is-active" : "is-inactive"
                      }`}
                    >
                      {state}
                    </span>
                    <button
                      type="button"
                      className="dashboard-secondary-btn"
                      onClick={() =>
                        setSelectedCampaignId((current) =>
                          current === campaign.id ? null : campaign.id
                        )
                      }
                    >
                      {selectedCampaignId === campaign.id ? "Hide submissions" : "Submissions"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {selectedCampaign && (
          <div className="dashboard-submissions-card">
            <div className="dashboard-submissions-head">
              <div>
                <p className="dashboard-eyebrow">Submissions</p>
                <h2 className="dashboard-submissions-title">{selectedCampaign.name}</h2>
                <p className="dashboard-submissions-subtitle">
                  Collected reviews for this campaign.
                </p>
              </div>

              <span className="dashboard-count-badge">
                {selectedCampaign.submissions.length} total
              </span>
            </div>

            {selectedCampaign.submissions.length === 0 ? (
              <div className="dashboard-empty-state">No submissions collected yet.</div>
            ) : (
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Date</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Rating</th>
                      <th>Video</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCampaign.submissions.map((submission) => (
                      <tr key={submission.id}>
                        <td className="dashboard-table-id">{submission.id}</td>
                        <td>{new Date(submission.createdAt).toLocaleDateString()}</td>
                        <td className="dashboard-table-strong">{submission.reviewerName}</td>
                        <td>{submission.reviewerEmail}</td>
                        <td className="dashboard-table-rating">
                          {submission.reviewerRating ? `${submission.reviewerRating}/5` : "No rating"}
                        </td>
                        <td>
                          <span className="dashboard-video-badge" title={submission.videoKey}>
                            Video stored
                          </span>
                        </td>
                        <td>
                          <a
                            href={`/api/campaigns/${selectedCampaign.id}/submissions/${submission.id}/view`}
                            target="_blank"
                            rel="noreferrer"
                            className="dashboard-secondary-btn dashboard-inline-link"
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

      <style>{dashboardShellStyles}</style>
    </div>
  );
}

const dashboardShellStyles = `
  .dashboard-shell {
    display: grid;
    grid-template-columns: 248px minmax(0, 1fr);
    gap: 24px;
    align-items: start;
  }

  .dashboard-sidebar {
    position: sticky;
    top: 24px;
    align-self: start;
    display: grid;
    gap: 20px;
    padding: 20px;
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.88);
    box-shadow:
      0 18px 42px rgba(20, 18, 24, 0.06),
      0 1px 0 rgba(255, 255, 255, 0.84) inset;
  }

  .dashboard-brand {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    justify-self: start;
    text-decoration: none;
    color: #111117;
  }

  .dashboard-brand-mark {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    display: grid;
    place-items: center;
    background: var(--brand);
    color: #fff;
    font-size: 16px;
    box-shadow: 0 10px 24px rgba(255, 92, 53, 0.18);
  }

  .dashboard-brand-text {
    font-family: "Figtree", sans-serif;
    font-size: 20px;
    font-weight: 800;
  }

  .dashboard-profile-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 0 18px;
    border-bottom: 1px solid rgba(24, 24, 32, 0.08);
  }

  .dashboard-avatar {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    display: grid;
    place-items: center;
    background: linear-gradient(180deg, #ff7a57, #ff5c35);
    color: #fff;
    font-family: "Figtree", sans-serif;
    font-weight: 800;
  }

  .dashboard-profile-name {
    font-weight: 700;
    color: #14141b;
  }

  .dashboard-profile-workspace {
    color: rgba(24, 24, 32, 0.46);
    font-size: 14px;
  }

  .dashboard-nav-group {
    display: grid;
    gap: 10px;
  }

  .dashboard-nav-label {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 700;
    color: rgba(24, 24, 32, 0.34);
  }

  .dashboard-nav-item {
    width: 100%;
    justify-content: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 16px;
    border: 1px solid rgba(24, 24, 32, 0.08);
    background: rgba(255, 255, 255, 0.72);
    color: #14141b;
    font-family: "Figtree", sans-serif;
    font-size: 15px;
    font-weight: 700;
  }

  .dashboard-nav-item-active {
    border-color: rgba(255, 92, 53, 0.2);
    background: rgba(255, 92, 53, 0.08);
  }

  .dashboard-nav-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: var(--brand);
    display: inline-block;
  }

  .dashboard-main {
    min-width: 0;
    display: grid;
    gap: 24px;
  }

  .dashboard-hero-card,
  .dashboard-list-card,
  .dashboard-submissions-card,
  .dashboard-alert-card {
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.88);
    box-shadow:
      0 18px 42px rgba(20, 18, 24, 0.06),
      0 1px 0 rgba(255, 255, 255, 0.84) inset;
  }

  .dashboard-hero-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    padding: 22px clamp(18px, 3vw, 28px);
  }

  .dashboard-eyebrow {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--brand-2);
    margin-bottom: 8px;
  }

  .dashboard-title {
    font-size: clamp(30px, 4vw, 46px);
    margin-bottom: 8px;
    color: #121218;
  }

  .dashboard-subtitle,
  .dashboard-submissions-subtitle,
  .dashboard-empty-state,
  .dashboard-table td {
    color: rgba(24, 24, 32, 0.5);
  }

  .dashboard-subtitle {
    max-width: 680px;
  }

  .dashboard-action-btn,
  .dashboard-secondary-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    font-family: "Figtree", sans-serif;
    font-weight: 800;
    font-size: 15px;
    cursor: pointer;
    text-decoration: none;
    white-space: nowrap;
  }

  .dashboard-action-btn {
    border: none;
    padding: 14px 22px;
    background: var(--brand);
    color: #fff;
    box-shadow: 0 12px 26px rgba(255, 92, 53, 0.18);
  }

  .dashboard-secondary-btn {
    border: 1px solid rgba(24, 24, 32, 0.1);
    padding: 10px 16px;
    background: rgba(255, 255, 255, 0.9);
    color: #14141b;
  }

  .dashboard-alert-card {
    padding: 16px 18px;
    color: #c94d2e;
    background: rgba(255, 255, 255, 0.88);
    border-color: rgba(255, 92, 53, 0.14);
  }

  .dashboard-builder-wrap {
    min-width: 0;
  }

  .dashboard-list-card {
    overflow: hidden;
  }

  .dashboard-empty-state {
    padding: 24px;
  }

  .dashboard-campaign-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    padding: 18px 22px;
  }

  .dashboard-campaign-row.with-divider {
    border-top: 1px solid rgba(24, 24, 32, 0.08);
  }

  .dashboard-campaign-copy {
    min-width: 0;
  }

  .dashboard-campaign-name,
  .dashboard-submissions-title,
  .dashboard-table-strong {
    font-weight: 700;
    color: #14141b;
  }

  .dashboard-campaign-name {
    margin-bottom: 6px;
  }

  .dashboard-campaign-path {
    color: rgba(24, 24, 32, 0.42);
    font-size: 14px;
    word-break: break-all;
  }

  .dashboard-campaign-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .dashboard-status-badge,
  .dashboard-count-badge,
  .dashboard-video-badge {
    display: inline-flex;
    align-items: center;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    border: 1px solid rgba(24, 24, 32, 0.08);
    background: rgba(255, 255, 255, 0.9);
  }

  .dashboard-status-badge.is-active {
    color: #2f9964;
    border-color: rgba(47, 153, 100, 0.16);
    background: rgba(47, 153, 100, 0.08);
  }

  .dashboard-status-badge.is-inactive {
    color: #c94d2e;
    border-color: rgba(255, 92, 53, 0.16);
    background: rgba(255, 92, 53, 0.08);
  }

  .dashboard-count-badge,
  .dashboard-video-badge {
    color: rgba(24, 24, 32, 0.56);
  }

  .dashboard-submissions-card {
    overflow: hidden;
  }

  .dashboard-submissions-head {
    padding: 20px 22px;
    border-bottom: 1px solid rgba(24, 24, 32, 0.08);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .dashboard-submissions-title {
    font-size: clamp(22px, 3vw, 30px);
    margin-bottom: 6px;
  }

  .dashboard-table-wrap {
    overflow-x: auto;
  }

  .dashboard-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 860px;
  }

  .dashboard-table thead tr {
    color: rgba(24, 24, 32, 0.38);
    text-align: left;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .dashboard-table th {
    padding: 12px 16px;
    font-weight: 700;
  }

  .dashboard-table tbody tr {
    border-top: 1px solid rgba(24, 24, 32, 0.08);
  }

  .dashboard-table td {
    padding: 14px 16px;
  }

  .dashboard-table-id {
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
  }

  .dashboard-table-rating {
    color: #ffb347;
    font-weight: 700;
  }

  .dashboard-inline-link {
    display: inline-flex;
  }

  @media (max-width: 980px) {
    .dashboard-shell {
      grid-template-columns: 1fr;
    }

    .dashboard-sidebar {
      position: static;
    }
  }

  @media (max-width: 760px) {
    .dashboard-hero-card,
    .dashboard-campaign-row,
    .dashboard-submissions-head {
      padding: 18px 16px;
    }

    .dashboard-list-card,
    .dashboard-submissions-card,
    .dashboard-alert-card,
    .dashboard-sidebar,
    .dashboard-hero-card {
      border-radius: 20px;
    }
  }
`;
