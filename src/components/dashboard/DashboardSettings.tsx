"use client";

import { useClerk } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

type DashboardWebhookEndpoint = {
  id: string;
  url: string;
  description: string | null;
  subscribedEvents: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deliveries: Array<{
    id: string;
    status: string;
    attemptCount: number;
    responseStatus: number | null;
    lastError: string | null;
    createdAt: string;
    eventType: string;
  }>;
};

type WebhookEventOption = {
  value: string;
  label: string;
  helper: string;
};

export type SettingsPanelId =
  | "general"
  | "profile"
  | "brand"
  | "notifications"
  | "moderation"
  | "rewards"
  | "team"
  | "integrations"
  | "billing"
  | "api"
  | "danger";

type TeamMember = {
  id: string;
  initials: string;
  name: string;
  email: string;
  role: "Owner" | "Admin" | "Editor" | "Viewer";
  accent: string;
  background: string;
};

type PendingInvite = {
  id: string;
  email: string;
  role: "Admin" | "Editor" | "Viewer";
  invitedAt: string;
};

type SettingsDraft = {
  workspaceName: string;
  reviewPageSlug: string;
  website: string;
  industry: string;
  language: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  notificationEmail: string;
  ccEmail: string;
  newReviewSubmitted: boolean;
  reviewPendingApproval: boolean;
  rewardRedeemed: boolean;
  campaignMilestone: boolean;
  weeklyDigest: boolean;
  budgetLow: boolean;
  browserPushEnabled: boolean;
  soundAlerts: boolean;
  allowVideoReviews: boolean;
  allowTextReviews: boolean;
  allowFileUpload: boolean;
  collectStarRating: boolean;
  maxVideoDuration: string;
  requireManualApproval: boolean;
  autoPublishFiveStar: boolean;
  autoRejectThreshold: string;
  showConsentCheckbox: boolean;
  consentText: string;
  anonymizeReviewerNames: boolean;
  rewardsEnabledGlobally: boolean;
  defaultRewardType: string;
  defaultRewardValue: string;
  defaultRewardInstructions: string;
  sendRewardAutomatically: boolean;
  sendRewardAfterApproval: boolean;
  notifyRewardByEmail: boolean;
  budgetWarningThreshold: string;
  pauseCampaignWhenBudgetRunsOut: boolean;
  billingEmail: string;
};

type DashboardSettingsProps = {
  viewerName: string;
  viewerEmail?: string;
  workspaceName: string;
  siteHost: string;
  websiteUrl?: string;
  campaignsCount: number;
  totalReviews: number;
  webhookEndpoints: DashboardWebhookEndpoint[];
  webhookLoading: boolean;
  webhookError: string | null;
  webhookActionId: string | null;
  webhookUrl: string;
  webhookDescription: string;
  webhookEvents: string[];
  webhookFormSaving: boolean;
  latestWebhookSecret: string | null;
  webhookNotice: string | null;
  webhookEventOptions: readonly WebhookEventOption[];
  onWebhookUrlChange: (value: string) => void;
  onWebhookDescriptionChange: (value: string) => void;
  onToggleWebhookEvent: (eventType: string) => void;
  onCreateWebhook: (event: FormEvent<HTMLFormElement>) => void;
  onSendWebhookTest: (endpointId: string) => void;
  onRotateWebhookSecret: (endpointId: string) => void;
  onToggleWebhook: (endpoint: DashboardWebhookEndpoint) => void;
  onDeleteWebhook: (endpointId: string) => void;
  onCopyText: (value: string) => void;
  brandLoading: boolean;
  brandSaving: boolean;
  brandError: string | null;
  brandNotice: string | null;
  brandName: string;
  brandWebsiteUrl: string;
  brandLogoUrl: string;
  brandPrimaryColor: string;
  brandSecondaryColor: string;
  brandLogoUploading: boolean;
  brandLogoUploadProgress: number;
  onBrandNameChange: (value: string) => void;
  onBrandWebsiteUrlChange: (value: string) => void;
  onBrandLogoUrlChange: (value: string) => void;
  onBrandPrimaryColorChange: (value: string) => void;
  onBrandSecondaryColorChange: (value: string) => void;
  onBrandLogoFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSaveBrandSettings: (event: FormEvent<HTMLFormElement>) => void;
  initialPanel?: SettingsPanelId;
};

function slugifyWorkspace(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function SettingsSwitch({
  checked,
  onClick,
}: {
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`settingsv2-switch ${checked ? "is-on" : ""}`}
      onClick={onClick}
      aria-pressed={checked}
    />
  );
}

function SettingsBadge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "danger";
  children: React.ReactNode;
}) {
  return <span className={`settingsv2-badge settingsv2-badge-${tone}`}>{children}</span>;
}

function SettingsNavIcon({ type }: { type: SettingsPanelId }) {
  if (type === "profile") {
    return (
      <svg viewBox="0 0 13 13" fill="none">
        <circle cx="6.5" cy="4.5" r="2.1" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M2.2 11c.4-1.9 2.1-3.2 4.3-3.2 2.1 0 3.9 1.3 4.3 3.2"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === "notifications") {
    return (
      <svg viewBox="0 0 13 13" fill="none">
        <path
          d="M6.5 1.5a4 4 0 0 1 4 4c0 2.5 1 3 1 3H1.5s1-.5 1-3a4 4 0 0 1 4-4z"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path d="M5.5 10.5a1 1 0 0 0 2 0" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }

  if (type === "moderation") {
    return (
      <svg viewBox="0 0 13 13" fill="none">
        <path
          d="M6.5 1L2 4v4c0 2 2 4 4.5 4S11 10 11 8V4L6.5 1z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M4.5 6.5l1.5 1.5 2.5-2.5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "rewards") {
    return (
      <svg viewBox="0 0 13 13" fill="none">
        <path
          d="M6.5 2L8 4.5h3L8.5 6.5l1 3-3-1.5L3.5 9.5l1-3L2 4.5h3z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "team") {
    return (
      <svg viewBox="0 0 13 13" fill="none">
        <circle cx="5" cy="4.5" r="1.8" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="9" cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M1.5 11C1.5 9 3 7.5 5 7.5S8.5 9 8.5 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M9 7.5c1.5 0 2.5 1.2 2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "integrations") {
    return (
      <svg viewBox="0 0 13 13" fill="none">
        <path
          d="M2 6.5h2.5M8.5 6.5H11M6.5 2V4M6.5 9v2M4 4l1.5 1.5M7.5 7.5L9 9M9 4L7.5 5.5M4.5 7.5L3 9"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <circle cx="6.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }

  if (type === "billing") {
    return (
      <svg viewBox="0 0 13 13" fill="none">
        <rect x="1" y="3" width="11" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M1 5.5h11" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }

  if (type === "api") {
    return (
      <svg viewBox="0 0 13 13" fill="none">
        <path d="M1.5 5.5l-1 1 1 1M11.5 5.5l1 1-1 1M8 2l-3 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "danger") {
    return (
      <svg viewBox="0 0 13 13" fill="none">
        <path d="M6.5 2L1.5 11h10L6.5 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M6.5 5.5v2.5M6.5 9.5h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 13 13" fill="none">
      <rect x="1" y="1" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 6.5h5M4 4.5h5M4 8.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

const styles = `
  .settingsv2-root {
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 32px);
    background: #fff;
    position: relative;
  }

  .settingsv2-wrap {
    flex: 1;
    display: block;
    overflow: hidden;
    position: relative;
  }

  .settingsv2-nav {
    position: fixed;
    top: 48px;
    left: 232px;
    bottom: 0;
    width: 200px;
    border-right: 1px solid var(--dashboard-border);
    padding: 10px 8px;
    overflow-y: auto;
    background: var(--dashboard-bg-subtle);
    z-index: 5;
  }

  .settingsv2-nav-group {
    padding: 8px 10px 4px;
    font-size: 10px;
    font-weight: 600;
    color: var(--dashboard-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .settingsv2-nav-group:first-child {
    padding-top: 2px;
  }

  .settingsv2-nav-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: var(--dashboard-text-secondary);
    font-size: 13px;
    font-weight: 400;
    text-align: left;
    cursor: pointer;
    text-decoration: none;
  }

  .settingsv2-nav-item:visited {
    color: var(--dashboard-text-secondary);
  }

  .settingsv2-nav-item:hover {
    background: #f0f0f0;
    color: var(--dashboard-text);
  }

  .settingsv2-nav-item.is-active {
    background: #fff;
    color: var(--dashboard-text);
    font-weight: 500;
    border-color: var(--dashboard-border);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .settingsv2-nav-item.is-danger {
    color: #dc2626;
  }

  .settingsv2-nav-item svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
    opacity: 0.6;
  }

  .settingsv2-nav-item.is-active svg,
  .settingsv2-nav-item.is-danger svg {
    opacity: 1;
  }

  .settingsv2-content {
    margin-left: 200px;
    height: calc(100vh - 48px);
    overflow-y: auto;
    background: #fff;
    min-width: 0;
  }

  .settingsv2-panel {
    display: none;
    flex-direction: column;
  }

  .settingsv2-panel.is-active {
    display: flex;
  }

  .settingsv2-panel-head {
    padding: 24px 28px 20px;
    border-bottom: 1px solid var(--dashboard-border);
  }

  .settingsv2-panel-title {
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.02em;
    margin: 0 0 3px;
  }

  .settingsv2-panel-title.is-danger {
    color: #dc2626;
  }

  .settingsv2-panel-desc {
    margin: 0;
    font-size: 13px;
    color: var(--dashboard-text-secondary);
    line-height: 1.55;
  }

  .settingsv2-alert {
    margin: 14px 28px 0;
    padding: 10px 12px;
    border: 1px solid var(--dashboard-border);
    border-radius: 6px;
    background: #f7f7f7;
    font-size: 12px;
    color: var(--dashboard-text-secondary);
  }

  .settingsv2-alert.is-success {
    color: #166534;
    background: #f0fdf4;
    border-color: #bbf7d0;
  }

  .settingsv2-alert.is-error {
    color: #b91c1c;
    background: #fef2f2;
    border-color: #fecaca;
  }

  .settingsv2-block {
    border-bottom: 1px solid var(--dashboard-border);
  }

  .settingsv2-block:last-child {
    border-bottom: none;
  }

  .settingsv2-block-head {
    padding: 20px 28px 0;
  }

  .settingsv2-block-title {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--dashboard-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .settingsv2-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 14px 28px;
    border-bottom: 1px solid var(--dashboard-border);
  }

  .settingsv2-grid.grid-3 {
    grid-template-columns: repeat(3, 1fr);
  }

  .settingsv2-grid.grid-1 {
    grid-template-columns: 1fr;
  }

  .settingsv2-grid:last-child {
    border-bottom: none;
  }

  .settingsv2-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
  }

  .settingsv2-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--dashboard-text);
  }

  .settingsv2-label-optional {
    font-weight: 400;
    color: var(--dashboard-text-tertiary);
  }

  .settingsv2-hint {
    font-size: 11px;
    color: var(--dashboard-text-tertiary);
    line-height: 1.45;
  }

  .settingsv2-input,
  .settingsv2-select,
  .settingsv2-textarea {
    width: 100%;
    height: 32px;
    padding: 0 10px;
    border: 1px solid var(--dashboard-border);
    border-radius: 6px;
    background: #fff;
    color: var(--dashboard-text);
    font-size: 13px;
    font-family: inherit;
    outline: none;
    transition: border-color 80ms ease, box-shadow 80ms ease;
  }

  .settingsv2-input:hover,
  .settingsv2-select:hover,
  .settingsv2-textarea:hover {
    border-color: var(--dashboard-border-strong);
  }

  .settingsv2-input:focus,
  .settingsv2-select:focus,
  .settingsv2-textarea:focus {
    border-color: var(--dashboard-text);
    box-shadow: 0 0 0 3px rgba(10, 10, 10, 0.07);
  }

  .settingsv2-textarea {
    height: auto;
    min-height: 80px;
    padding: 8px 10px;
    resize: vertical;
    line-height: 1.6;
  }

  .settingsv2-input-prefix-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .settingsv2-input-prefix {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    padding: 0 10px;
    background: #f7f7f7;
    border-right: 1px solid var(--dashboard-border);
    border-radius: 6px 0 0 6px;
    font-size: 12px;
    color: var(--dashboard-text-secondary);
    white-space: nowrap;
  }

  .settingsv2-input-with-prefix {
    padding-left: 76px;
  }

  .settingsv2-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 28px;
    border-bottom: 1px solid var(--dashboard-border);
  }

  .settingsv2-row:last-child {
    border-bottom: none;
  }

  .settingsv2-row-main {
    flex: 1;
    min-width: 0;
  }

  .settingsv2-row-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--dashboard-text);
    margin: 0 0 2px;
  }

  .settingsv2-row-desc {
    margin: 0;
    font-size: 12px;
    color: var(--dashboard-text-secondary);
    line-height: 1.5;
  }

  .settingsv2-switch {
    width: 32px;
    height: 18px;
    background: #d0d0d0;
    border: none;
    border-radius: 9999px;
    position: relative;
    flex-shrink: 0;
    cursor: pointer;
  }

  .settingsv2-switch::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    transition: transform 150ms ease;
  }

  .settingsv2-switch.is-on {
    background: #0a0a0a;
  }

  .settingsv2-switch.is-on::after {
    transform: translateX(14px);
  }

  .settingsv2-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 30px;
    padding: 0 12px;
    border-radius: 6px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--dashboard-text);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
  }

  .settingsv2-btn-sm {
    height: 26px;
    padding: 0 9px;
    font-size: 12px;
    border-radius: 4px;
  }

  .settingsv2-btn-primary {
    background: #0a0a0a;
    color: #fff;
    border-color: #0a0a0a;
  }

  .settingsv2-btn-accent {
    background: #ff4820;
    color: #fff;
    border-color: #ff4820;
  }

  .settingsv2-btn-secondary {
    background: #fff;
    color: var(--dashboard-text);
    border-color: var(--dashboard-border);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .settingsv2-btn-ghost {
    color: var(--dashboard-text-secondary);
  }

  .settingsv2-btn-danger {
    background: #fef2f2;
    color: #dc2626;
    border-color: #fecaca;
  }

  .settingsv2-btn-danger-ghost {
    color: #dc2626;
  }

  .settingsv2-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px;
    border-radius: 9999px;
    border: 1px solid transparent;
    font-size: 11px;
    font-weight: 500;
    line-height: 1.5;
    white-space: nowrap;
  }

  .settingsv2-badge-neutral {
    background: #f0f0f0;
    color: #525252;
    border-color: var(--dashboard-border);
  }

  .settingsv2-badge-success {
    background: #f0fdf4;
    color: #16a34a;
    border-color: #bbf7d0;
  }

  .settingsv2-badge-warning {
    background: #fffbeb;
    color: #d97706;
    border-color: #fde68a;
  }

  .settingsv2-badge-danger {
    background: #fef2f2;
    color: #dc2626;
    border-color: #fecaca;
  }

  .settingsv2-role-chip-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    padding: 14px 28px;
    border-top: 1px solid var(--dashboard-border);
  }

  .settingsv2-role-chip {
    padding: 12px;
    background: #f7f7f7;
    border: 1px solid var(--dashboard-border);
    border-radius: 8px;
  }

  .settingsv2-role-chip strong {
    display: block;
    font-size: 12px;
    margin-bottom: 4px;
  }

  .settingsv2-role-chip span {
    font-size: 11px;
    color: var(--dashboard-text-secondary);
    line-height: 1.5;
  }

  .settingsv2-invite-box {
    margin: 14px 28px;
    padding: 16px;
    display: flex;
    gap: 8px;
    align-items: flex-end;
    border: 1px solid var(--dashboard-border);
    border-radius: 8px;
    background: #f7f7f7;
  }

  .settingsv2-subsection-title {
    padding: 9px 28px;
    border-top: 1px solid var(--dashboard-border);
    border-bottom: 1px solid var(--dashboard-border);
    font-size: 11px;
    font-weight: 600;
    color: var(--dashboard-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .settingsv2-member-row,
  .settingsv2-integration-row {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 12px 28px;
    border-bottom: 1px solid var(--dashboard-border);
  }

  .settingsv2-member-row:last-child,
  .settingsv2-integration-row:last-child {
    border-bottom: none;
  }

  .settingsv2-avatar {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: 9999px;
    display: grid;
    place-items: center;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .settingsv2-member-info,
  .settingsv2-integration-info {
    flex: 1;
    min-width: 0;
  }

  .settingsv2-member-name,
  .settingsv2-integration-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--dashboard-text);
  }

  .settingsv2-member-email,
  .settingsv2-integration-desc {
    margin-top: 1px;
    font-size: 12px;
    color: var(--dashboard-text-tertiary);
  }

  .settingsv2-member-actions,
  .settingsv2-integration-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .settingsv2-integration-icon {
    width: 36px;
    height: 36px;
    border: 1px solid var(--dashboard-border);
    border-radius: 8px;
    background: #f0f0f0;
    display: grid;
    place-items: center;
    font-size: 18px;
    flex-shrink: 0;
  }

  .settingsv2-plan-card {
    margin: 14px 28px;
    padding: 18px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border: 1px solid var(--dashboard-border);
    border-radius: 10px;
    background: #f7f7f7;
  }

  .settingsv2-plan-name {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.01em;
    margin: 0 0 3px;
  }

  .settingsv2-plan-price {
    margin-top: 6px;
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.03em;
  }

  .settingsv2-plan-price span {
    font-size: 13px;
    font-weight: 400;
    color: var(--dashboard-text-secondary);
  }

  .settingsv2-plan-features {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: 10px;
  }

  .settingsv2-plan-feature {
    font-size: 12px;
    color: var(--dashboard-text-secondary);
  }

  .settingsv2-plan-feature::before {
    content: "✓";
    margin-right: 6px;
    color: #16a34a;
    font-weight: 700;
  }

  .settingsv2-usage-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 28px;
    border-bottom: 1px solid var(--dashboard-border);
  }

  .settingsv2-usage-row:last-child {
    border-bottom: none;
  }

  .settingsv2-usage-label {
    flex: 1;
    font-size: 13px;
    font-weight: 500;
  }

  .settingsv2-usage-bar-wrap {
    width: 160px;
  }

  .settingsv2-usage-value {
    min-width: 60px;
    font-size: 12px;
    color: var(--dashboard-text-secondary);
    text-align: right;
  }

  .settingsv2-usage-bar {
    height: 4px;
    margin-top: 5px;
    border-radius: 9999px;
    background: #f0f0f0;
    overflow: hidden;
  }

  .settingsv2-usage-fill {
    height: 100%;
    border-radius: 9999px;
    background: #0a0a0a;
  }

  .settingsv2-usage-fill.is-warning {
    background: #d97706;
  }

  .settingsv2-mono {
    font-family: "SF Mono", "Fira Code", monospace;
    font-size: 12px;
  }

  .settingsv2-inline-help {
    margin: 0 28px 14px;
    padding: 10px 12px;
    border: 1px solid var(--dashboard-border);
    border-radius: 6px;
    background: #f7f7f7;
    font-size: 11px;
    color: var(--dashboard-text-tertiary);
    line-height: 1.7;
  }

  .settingsv2-inline-help strong {
    color: var(--dashboard-text-secondary);
  }

  .settingsv2-inline-help a {
    color: #ff4820;
    text-decoration: none;
  }

  .settingsv2-event-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .settingsv2-event-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    cursor: pointer;
    padding: 3px 0;
  }

  .settingsv2-checkbox {
    width: 15px;
    height: 15px;
    border: 1px solid var(--dashboard-border-strong);
    border-radius: 4px;
    background: #fff;
    flex-shrink: 0;
    margin-top: 1px;
    display: grid;
    place-items: center;
  }

  .settingsv2-checkbox.is-on {
    background: #ff4820;
    border-color: #ff4820;
  }

  .settingsv2-checkbox.is-on::after {
    content: "";
    width: 7px;
    height: 4px;
    border: 1.5px solid #fff;
    border-top: none;
    border-right: none;
    transform: rotate(-45deg) translateY(-1px);
  }

  .settingsv2-danger-stack {
    padding: 20px 28px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .settingsv2-danger-card {
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border: 1px solid #fecaca;
    border-radius: 10px;
    background: #fef2f2;
  }

  .settingsv2-danger-title {
    margin: 0 0 3px;
    font-size: 13px;
    font-weight: 600;
    color: #dc2626;
  }

  .settingsv2-danger-desc {
    margin: 0;
    font-size: 12px;
    color: var(--dashboard-text-secondary);
    line-height: 1.5;
  }

  .settingsv2-webhook-card {
    padding: 12px 28px;
    border-top: 1px solid var(--dashboard-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .settingsv2-webhook-url {
    margin: 0;
    font-size: 13px;
    font-weight: 500;
    color: var(--dashboard-text);
    word-break: break-word;
  }

  .settingsv2-webhook-meta {
    margin: 2px 0 0;
    font-size: 12px;
    color: var(--dashboard-text-tertiary);
  }

  .settingsv2-webhook-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .settingsv2-brand-logo-row {
    display: grid;
    grid-template-columns: 1fr 220px;
    gap: 8px;
  }

  .settingsv2-brand-progress {
    margin-top: 8px;
    width: 100%;
    height: 6px;
    border-radius: 999px;
    background: #f0f0f0;
    overflow: hidden;
  }

  .settingsv2-brand-progress-fill {
    height: 100%;
    background: #ff4820;
  }

  .settingsv2-brand-color-row {
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr);
    gap: 8px;
    align-items: center;
  }

  .settingsv2-brand-color-chip {
    width: 20px;
    height: 20px;
    border-radius: 6px;
    border: 1px solid var(--dashboard-border);
  }

  .settingsv2-brand-preview {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--dashboard-border);
    border-radius: 8px;
    background: #f7f7f7;
  }

  .settingsv2-brand-preview-logo {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    overflow: hidden;
  }

  .settingsv2-brand-preview-logo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .settingsv2-brand-preview-copy {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .settingsv2-brand-preview-copy strong {
    font-size: 13px;
    color: var(--dashboard-text);
  }

  .settingsv2-brand-preview-copy span {
    font-size: 11px;
    color: var(--dashboard-text-secondary);
  }

  .settingsv2-brand-preview-colors {
    margin-left: auto;
    display: inline-flex;
    gap: 6px;
  }

  .settingsv2-brand-preview-colors span {
    width: 18px;
    height: 18px;
    border-radius: 999px;
    border: 1px solid rgba(24, 24, 32, 0.16);
  }

  @media (max-width: 960px) {
    .settingsv2-wrap {
      flex-direction: column;
    }

    .settingsv2-nav {
      position: static;
      width: 100%;
      left: auto;
      top: auto;
      bottom: auto;
      border-right: none;
      border-bottom: 1px solid var(--dashboard-border);
      padding-bottom: 12px;
    }

    .settingsv2-content {
      margin-left: 0;
      height: auto;
    }
  }

  @media (max-width: 760px) {
    .settingsv2-grid,
    .settingsv2-grid.grid-3,
    .settingsv2-role-chip-grid,
    .settingsv2-event-grid {
      grid-template-columns: 1fr;
    }

    .settingsv2-plan-card,
    .settingsv2-danger-card,
    .settingsv2-row,
    .settingsv2-invite-box,
    .settingsv2-member-row,
    .settingsv2-integration-row,
    .settingsv2-webhook-card,
    .settingsv2-usage-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .settingsv2-member-actions,
    .settingsv2-integration-actions,
    .settingsv2-webhook-actions {
      justify-content: flex-start;
    }

    .settingsv2-brand-logo-row {
      grid-template-columns: 1fr;
    }

    .settingsv2-brand-preview {
      align-items: flex-start;
      flex-direction: column;
    }

    .settingsv2-brand-preview-colors {
      margin-left: 0;
    }

    .settingsv2-usage-bar-wrap,
    .settingsv2-usage-value {
      width: 100%;
      min-width: 0;
      text-align: left;
    }
  }
`;

const navItems: Array<{
  id: SettingsPanelId;
  label: string;
  group: "workspace" | "account";
  danger?: boolean;
}> = [
  { id: "general", label: "General", group: "workspace" },
  { id: "profile", label: "Profile", group: "workspace" },
  { id: "brand", label: "Brand", group: "workspace" },
  { id: "notifications", label: "Notifications", group: "workspace" },
  { id: "moderation", label: "Reviews & Moderation", group: "workspace" },
  { id: "rewards", label: "Rewards", group: "workspace" },
  { id: "team", label: "Team", group: "account" },
  { id: "integrations", label: "Integrations", group: "account" },
  { id: "billing", label: "Billing & Plan", group: "account" },
  { id: "api", label: "API & Webhooks", group: "account" },
  { id: "danger", label: "Danger Zone", group: "account", danger: true },
];

const defaultTeamMembers: TeamMember[] = [
  {
    id: "owner",
    initials: "GP",
    name: "Giampiero",
    email: "giampiero@virago.ai",
    role: "Owner",
    accent: "#ff4820",
    background: "#fff0ed",
  },
  {
    id: "editor",
    initials: "AL",
    name: "Andrea Luca",
    email: "andrea@acme.com",
    role: "Editor",
    accent: "#2563eb",
    background: "#eff6ff",
  },
];

const defaultPendingInvites: PendingInvite[] = [
  {
    id: "pending-1",
    email: "sara@example.com",
    role: "Editor",
    invitedAt: "Invited Jun 14",
  },
];

const integrations = [
  {
    icon: "⚡",
    name: "Zapier",
    desc: "Automate workflows with 5,000+ apps. Trigger on new reviews, approvals, rewards.",
    status: "Connected" as const,
  },
  {
    icon: "🔔",
    name: "Slack",
    desc: "Get review notifications in your Slack channels in real-time.",
    status: "Available" as const,
  },
  {
    icon: "📧",
    name: "Mailchimp",
    desc: "Sync reviewer emails to your Mailchimp audiences automatically.",
    status: "Available" as const,
  },
  {
    icon: "🔗",
    name: "Make (Integromat)",
    desc: "Build advanced automation scenarios with Vouch events as triggers.",
    status: "Available" as const,
  },
  {
    icon: "🛒",
    name: "Shopify",
    desc: "Automatically send review requests after a Shopify purchase is fulfilled.",
    status: "Available" as const,
  },
  {
    icon: "💬",
    name: "Intercom",
    desc: "Trigger review requests from Intercom conversations and tags.",
    status: "Soon" as const,
  },
  {
    icon: "📊",
    name: "HubSpot",
    desc: "Sync review data to HubSpot CRM contacts and deals.",
    status: "Soon" as const,
  },
];

export default function DashboardSettings({
  viewerName,
  viewerEmail,
  workspaceName,
  siteHost,
  websiteUrl,
  campaignsCount,
  totalReviews,
  webhookEndpoints,
  webhookLoading,
  webhookError,
  webhookActionId,
  webhookUrl,
  webhookDescription,
  webhookEvents,
  webhookFormSaving,
  latestWebhookSecret,
  webhookNotice,
  webhookEventOptions,
  onWebhookUrlChange,
  onWebhookDescriptionChange,
  onToggleWebhookEvent,
  onCreateWebhook,
  onSendWebhookTest,
  onRotateWebhookSecret,
  onToggleWebhook,
  onDeleteWebhook,
  onCopyText,
  brandLoading,
  brandSaving,
  brandError,
  brandNotice,
  brandName,
  brandWebsiteUrl,
  brandLogoUrl,
  brandPrimaryColor,
  brandSecondaryColor,
  brandLogoUploading,
  brandLogoUploadProgress,
  onBrandNameChange,
  onBrandWebsiteUrlChange,
  onBrandLogoUrlChange,
  onBrandPrimaryColorChange,
  onBrandSecondaryColorChange,
  onBrandLogoFileChange,
  onSaveBrandSettings,
  initialPanel = "general",
}: DashboardSettingsProps) {
  const clerk = useClerk();
  const { user } = useUser();
  const panel = initialPanel;
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"Admin" | "Editor" | "Viewer">("Editor");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(defaultTeamMembers);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(defaultPendingInvites);
  const [draft, setDraft] = useState<SettingsDraft>({
    workspaceName,
    reviewPageSlug: slugifyWorkspace(workspaceName),
    website: websiteUrl || `https://${siteHost}`,
    industry: "SaaS / Software",
    language: "English (US)",
    timezone: "UTC+1 — Rome, Paris, Berlin",
    dateFormat: "MM/DD/YYYY",
    currency: "USD — US Dollar",
    notificationEmail: viewerEmail || "",
    ccEmail: "",
    newReviewSubmitted: true,
    reviewPendingApproval: true,
    rewardRedeemed: false,
    campaignMilestone: true,
    weeklyDigest: true,
    budgetLow: true,
    browserPushEnabled: false,
    soundAlerts: false,
    allowVideoReviews: true,
    allowTextReviews: true,
    allowFileUpload: false,
    collectStarRating: true,
    maxVideoDuration: "90 seconds",
    requireManualApproval: true,
    autoPublishFiveStar: false,
    autoRejectThreshold: "Disabled",
    showConsentCheckbox: true,
    consentText: "I agree that my review may be used for marketing purposes.",
    anonymizeReviewerNames: false,
    rewardsEnabledGlobally: false,
    defaultRewardType: "Gift card",
    defaultRewardValue: "$25",
    defaultRewardInstructions: "Your gift card will be delivered to your email within 24 hours.",
    sendRewardAutomatically: false,
    sendRewardAfterApproval: true,
    notifyRewardByEmail: true,
    budgetWarningThreshold: "5 remaining",
    pauseCampaignWhenBudgetRunsOut: true,
    billingEmail: viewerEmail || "",
  });

  useEffect(() => {
    if (!settingsNotice) {
      return;
    }
    const timeoutId = window.setTimeout(() => setSettingsNotice(null), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [settingsNotice]);

  const usage = useMemo(() => {
    const reviewCap = 500;
    const teamCap = 3;
    const storageUsed = Math.max(1, Math.min(10, Number((totalReviews * 0.033).toFixed(1))));
    return {
      reviewsWidth: `${Math.min(100, Math.round((totalReviews / reviewCap) * 100))}%`,
      reviewsValue: `${totalReviews} / ${reviewCap}`,
      campaignsWidth: campaignsCount > 0 ? `${Math.min(100, campaignsCount * 20)}%` : "4%",
      campaignsValue: `${campaignsCount} / unlimited`,
      teamWidth: `${Math.min(100, Math.round((teamMembers.length / teamCap) * 100))}%`,
      teamValue: `${teamMembers.length} / ${teamCap}`,
      storageWidth: `${Math.min(100, Math.round((storageUsed / 10) * 100))}%`,
      storageValue: `${storageUsed.toFixed(1)} / 10 GB`,
    };
  }, [campaignsCount, teamMembers.length, totalReviews]);

  function updateDraft<K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleDraft(key: keyof SettingsDraft) {
    setDraft((current) => ({ ...current, [key]: !current[key] }));
  }

  function handleSaveAll() {
    setSettingsNotice("Settings saved.");
  }

  function handleOpenClerkProfile() {
    clerk.openUserProfile();
  }

  function handleOpenClerkSecurity() {
    clerk.openUserProfile({
      __experimental_startPath: "/security",
    });
  }

  const clerkName =
    user?.fullName ||
    user?.firstName ||
    user?.username ||
    viewerName;
  const clerkEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    viewerEmail ||
    "";

  function handleSendInvite() {
    const normalized = inviteEmail.trim();
    if (!normalized || !normalized.includes("@")) {
      setSettingsNotice("Enter a valid email address.");
      return;
    }

    setPendingInvites((current) => [
      {
        id: `invite-${Date.now()}`,
        email: normalized,
        role: inviteRole,
        invitedAt: "Invited just now",
      },
      ...current,
    ]);
    setInviteEmail("");
    setSettingsNotice(`Invite sent to ${normalized}.`);
  }

  const apiKeyValue = "sk_live_••••••••••••••••••••••••••••••";

  return (
    <div className="settingsv2-root">
      <div className="dashboard-section-topbar">
        <span className="dashboard-section-topbar-title">Settings</span>
        <div className="dashboard-section-topbar-spacer" />
        {panel === "brand" ? (
          <button
            type="submit"
            form="settings-brand-form"
            className="dashboard-section-btn dashboard-section-btn-primary"
            disabled={brandSaving}
          >
            {brandSaving ? "Saving..." : "Save brand"}
          </button>
        ) : panel === "profile" ? (
          <button
            type="button"
            className="dashboard-section-btn dashboard-section-btn-primary"
            onClick={handleOpenClerkProfile}
          >
            Open profile
          </button>
        ) : (
          <button
            type="button"
            className="dashboard-section-btn dashboard-section-btn-primary"
            onClick={handleSaveAll}
          >
            Save changes
          </button>
        )}
      </div>

      <div className="settingsv2-wrap">
        <nav className="settingsv2-nav">
          <div className="settingsv2-nav-group">Workspace</div>
          {navItems
            .filter((item) => item.group === "workspace")
            .map((item) => (
              <Link
                key={item.id}
                className={`settingsv2-nav-item ${panel === item.id ? "is-active" : ""}`}
                href={`/dashboard/settings/${item.id}`}
                prefetch
              >
                <SettingsNavIcon type={item.id} />
                {item.label}
              </Link>
            ))}

          <div className="settingsv2-nav-group" style={{ marginTop: 8 }}>Account</div>
          {navItems
            .filter((item) => item.group === "account")
            .map((item) => (
              <Link
                key={item.id}
                className={`settingsv2-nav-item ${panel === item.id ? "is-active" : ""} ${item.danger ? "is-danger" : ""}`}
                href={`/dashboard/settings/${item.id}`}
                prefetch
              >
                <SettingsNavIcon type={item.id} />
                {item.label}
              </Link>
            ))}
        </nav>

        <div className="settingsv2-content">
          <div className={`settingsv2-panel ${panel === "general" ? "is-active" : ""}`}>
            <div className="settingsv2-panel-head">
              <h2 className="settingsv2-panel-title">General</h2>
              <p className="settingsv2-panel-desc">Workspace name, URL, locale and profile settings.</p>
            </div>
            {settingsNotice && <div className="settingsv2-alert is-success">{settingsNotice}</div>}

            <div className="settingsv2-block">
              <div className="settingsv2-block-head"><p className="settingsv2-block-title">Workspace</p></div>
              <div className="settingsv2-grid">
                <div className="settingsv2-field">
                  <label className="settingsv2-label">Workspace name</label>
                  <input className="settingsv2-input" value={draft.workspaceName} onChange={(event) => updateDraft("workspaceName", event.target.value)} />
                  <div className="settingsv2-hint">Visible to your team and in email notifications.</div>
                </div>
                <div className="settingsv2-field">
                  <label className="settingsv2-label">Review page URL</label>
                  <div className="settingsv2-input-prefix-wrap">
                    <div className="settingsv2-input-prefix">{siteHost}/</div>
                    <input className="settingsv2-input settingsv2-input-with-prefix" value={draft.reviewPageSlug} onChange={(event) => updateDraft("reviewPageSlug", slugifyWorkspace(event.target.value))} />
                  </div>
                  <div className="settingsv2-hint">Used for all your public review pages.</div>
                </div>
                <div className="settingsv2-field">
                  <label className="settingsv2-label">Website</label>
                  <input className="settingsv2-input" type="url" value={draft.website} placeholder="https://yoursite.com" onChange={(event) => updateDraft("website", event.target.value)} />
                </div>
                <div className="settingsv2-field">
                  <label className="settingsv2-label">Industry</label>
                  <select className="settingsv2-select" value={draft.industry} onChange={(event) => updateDraft("industry", event.target.value)}>
                    <option>SaaS / Software</option>
                    <option>Agency</option>
                    <option>E-commerce</option>
                    <option>Consulting</option>
                    <option>Coaching</option>
                    <option>Creator / Freelance</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="settingsv2-block">
              <div className="settingsv2-block-head"><p className="settingsv2-block-title">Locale</p></div>
              <div className="settingsv2-grid">
                <div className="settingsv2-field">
                  <label className="settingsv2-label">Language</label>
                  <select className="settingsv2-select" value={draft.language} onChange={(event) => updateDraft("language", event.target.value)}>
                    <option>English (US)</option>
                    <option>Italian</option>
                    <option>French</option>
                    <option>Spanish</option>
                    <option>German</option>
                    <option>Portuguese</option>
                  </select>
                  <div className="settingsv2-hint">Language of the recorder widget and emails.</div>
                </div>
                <div className="settingsv2-field">
                  <label className="settingsv2-label">Timezone</label>
                  <select className="settingsv2-select" value={draft.timezone} onChange={(event) => updateDraft("timezone", event.target.value)}>
                    <option>UTC+1 — Rome, Paris, Berlin</option>
                    <option>UTC — London, Lisbon</option>
                    <option>UTC-5 — New York, Toronto</option>
                    <option>UTC-8 — Los Angeles, Vancouver</option>
                    <option>UTC+9 — Tokyo, Seoul</option>
                  </select>
                  <div className="settingsv2-hint">Used for analytics and scheduled reports.</div>
                </div>
                <div className="settingsv2-field">
                  <label className="settingsv2-label">Date format</label>
                  <select className="settingsv2-select" value={draft.dateFormat} onChange={(event) => updateDraft("dateFormat", event.target.value)}>
                    <option>DD/MM/YYYY</option>
                    <option>MM/DD/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>
                <div className="settingsv2-field">
                  <label className="settingsv2-label">Currency</label>
                  <select className="settingsv2-select" value={draft.currency} onChange={(event) => updateDraft("currency", event.target.value)}>
                    <option>USD — US Dollar</option>
                    <option>EUR — Euro</option>
                    <option>GBP — British Pound</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className={`settingsv2-panel ${panel === "profile" ? "is-active" : ""}`}>
            <div className="settingsv2-panel-head">
              <h2 className="settingsv2-panel-title">Profile</h2>
              <p className="settingsv2-panel-desc">
                Manage account profile and password from Clerk.
              </p>
            </div>

            <div className="settingsv2-block">
              <div className="settingsv2-block-head"><p className="settingsv2-block-title">Account</p></div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main">
                  <p className="settingsv2-row-label">{clerkName}</p>
                  <p className="settingsv2-row-desc">{clerkEmail}</p>
                </div>
                <button
                  type="button"
                  className="settingsv2-btn settingsv2-btn-secondary settingsv2-btn-sm"
                  onClick={handleOpenClerkProfile}
                >
                  Modify
                </button>
              </div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main">
                  <p className="settingsv2-row-label">Password and security</p>
                  <p className="settingsv2-row-desc">
                    Open the Clerk modal to update password, email and account settings.
                  </p>
                </div>
                <button
                  type="button"
                  className="settingsv2-btn settingsv2-btn-secondary settingsv2-btn-sm"
                  onClick={handleOpenClerkSecurity}
                >
                  Manage security
                </button>
              </div>
            </div>
          </div>

          <div className={`settingsv2-panel ${panel === "brand" ? "is-active" : ""}`}>
            <div className="settingsv2-panel-head">
              <h2 className="settingsv2-panel-title">Brand</h2>
              <p className="settingsv2-panel-desc">
                Manage brand identity for recorder widget and public review pages.
              </p>
            </div>

            {brandError && <div className="settingsv2-alert is-error">{brandError}</div>}
            {brandNotice && <div className="settingsv2-alert is-success">{brandNotice}</div>}
            {brandLoading && <div className="settingsv2-alert">Loading brand settings...</div>}

            <form id="settings-brand-form" onSubmit={onSaveBrandSettings}>
              <div className="settingsv2-block">
                <div className="settingsv2-block-head"><p className="settingsv2-block-title">Workspace details</p></div>
                <div className="settingsv2-grid">
                  <div className="settingsv2-field">
                    <label className="settingsv2-label">Workspace name</label>
                    <input
                      className="settingsv2-input"
                      type="text"
                      value={brandName}
                      maxLength={80}
                      onChange={(event) => onBrandNameChange(event.target.value)}
                      required
                    />
                  </div>
                  <div className="settingsv2-field">
                    <label className="settingsv2-label">Website URL</label>
                    <input
                      className="settingsv2-input"
                      type="url"
                      value={brandWebsiteUrl}
                      onChange={(event) => onBrandWebsiteUrlChange(event.target.value)}
                      placeholder="https://yourcompany.com"
                    />
                  </div>
                </div>

                <div style={{ padding: "0 28px 14px" }}>
                  <div className="settingsv2-field">
                    <label className="settingsv2-label">Logo</label>
                    <div className="settingsv2-brand-logo-row">
                      <input
                        className="settingsv2-input"
                        type="url"
                        value={brandLogoUrl}
                        onChange={(event) => onBrandLogoUrlChange(event.target.value)}
                        placeholder="https://yourcompany.com/logo.png"
                      />
                      <input
                        className="settingsv2-input"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif"
                        onChange={onBrandLogoFileChange}
                      />
                    </div>
                    {brandLogoUploading && (
                      <div className="settingsv2-brand-progress">
                        <div
                          className="settingsv2-brand-progress-fill"
                          style={{ width: `${brandLogoUploadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="settingsv2-block">
                <div className="settingsv2-block-head"><p className="settingsv2-block-title">Colors</p></div>
                <div className="settingsv2-grid">
                  <div className="settingsv2-field">
                    <label className="settingsv2-label">Primary</label>
                    <div className="settingsv2-brand-color-row">
                      <span
                        className="settingsv2-brand-color-chip"
                        style={{ background: brandPrimaryColor || "#ff4820" }}
                      />
                      <input
                        className="settingsv2-input"
                        type="text"
                        value={brandPrimaryColor}
                        onChange={(event) => onBrandPrimaryColorChange(event.target.value)}
                        placeholder="#ff4820"
                      />
                    </div>
                  </div>
                  <div className="settingsv2-field">
                    <label className="settingsv2-label">Secondary</label>
                    <div className="settingsv2-brand-color-row">
                      <span
                        className="settingsv2-brand-color-chip"
                        style={{ background: brandSecondaryColor || "#111318" }}
                      />
                      <input
                        className="settingsv2-input"
                        type="text"
                        value={brandSecondaryColor}
                        onChange={(event) => onBrandSecondaryColorChange(event.target.value)}
                        placeholder="#111318"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="settingsv2-block">
                <div className="settingsv2-block-head"><p className="settingsv2-block-title">Live preview</p></div>
                <div style={{ padding: "14px 28px 20px" }}>
                  <div className="settingsv2-brand-preview">
                    <div className="settingsv2-brand-preview-logo" style={{ background: brandSecondaryColor || "#111318" }}>
                      {brandLogoUrl ? (
                        <Image
                          src={brandLogoUrl}
                          alt={`${brandName || "Brand"} logo`}
                          width={40}
                          height={40}
                          unoptimized
                        />
                      ) : (
                        <span>{(brandName || "B").slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="settingsv2-brand-preview-copy">
                      <strong>{brandName || "Your brand"}</strong>
                      <span>{brandWebsiteUrl || "No website set"}</span>
                    </div>
                    <div className="settingsv2-brand-preview-colors">
                      <span style={{ background: brandPrimaryColor || "#ff4820" }} />
                      <span style={{ background: brandSecondaryColor || "#111318" }} />
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>

          <div className={`settingsv2-panel ${panel === "notifications" ? "is-active" : ""}`}>
            <div className="settingsv2-panel-head">
              <h2 className="settingsv2-panel-title">Notifications</h2>
              <p className="settingsv2-panel-desc">Control when and how you receive alerts about reviews and campaigns.</p>
            </div>
            <div className="settingsv2-block">
              <div className="settingsv2-block-head"><p className="settingsv2-block-title">Email notifications</p></div>
              {[
                ["New review submitted", "Get an email each time a customer submits a video or text review.", "newReviewSubmitted"],
                ["Review pending approval", "Reminder if a review hasn't been approved within 48 hours.", "reviewPendingApproval"],
                ["Reward redeemed", "When a customer claims their reward after submission.", "rewardRedeemed"],
                ["Campaign milestone", "When a campaign hits 10, 25, 50, 100 reviews.", "campaignMilestone"],
                ["Weekly digest", "A summary of reviews and campaign performance sent every Monday.", "weeklyDigest"],
                ["Reward budget low", "Notify when fewer than 5 rewards remain in any active campaign.", "budgetLow"],
              ].map(([label, desc, key]) => (
                <div className="settingsv2-row" key={key}>
                  <div className="settingsv2-row-main">
                    <p className="settingsv2-row-label">{label}</p>
                    <p className="settingsv2-row-desc">{desc}</p>
                  </div>
                  <SettingsSwitch checked={Boolean(draft[key as keyof SettingsDraft])} onClick={() => toggleDraft(key as keyof SettingsDraft)} />
                </div>
              ))}
            </div>

            <div className="settingsv2-block">
              <div className="settingsv2-block-head"><p className="settingsv2-block-title">Notification email</p></div>
              <div className="settingsv2-grid">
                <div className="settingsv2-field">
                  <label className="settingsv2-label">Send to</label>
                  <input className="settingsv2-input" type="email" value={draft.notificationEmail} onChange={(event) => updateDraft("notificationEmail", event.target.value)} />
                  <div className="settingsv2-hint">All notification emails will be sent to this address.</div>
                </div>
                <div className="settingsv2-field">
                  <label className="settingsv2-label">CC address <span className="settingsv2-label-optional">(optional)</span></label>
                  <input className="settingsv2-input" type="email" placeholder="team@acme.com" value={draft.ccEmail} onChange={(event) => updateDraft("ccEmail", event.target.value)} />
                  <div className="settingsv2-hint">Add a team inbox to copy on all notifications.</div>
                </div>
              </div>
            </div>

            <div className="settingsv2-block">
              <div className="settingsv2-block-head"><p className="settingsv2-block-title">In-app notifications</p></div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main">
                  <p className="settingsv2-row-label">Browser push notifications</p>
                  <p className="settingsv2-row-desc">Receive push notifications in your browser when new reviews arrive.</p>
                </div>
                <button type="button" className="settingsv2-btn settingsv2-btn-secondary settingsv2-btn-sm" onClick={() => { updateDraft("browserPushEnabled", true); setSettingsNotice("Browser push enabled."); }}>
                  {draft.browserPushEnabled ? "Enabled" : "Enable"}
                </button>
              </div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main">
                  <p className="settingsv2-row-label">Sound alerts</p>
                  <p className="settingsv2-row-desc">Play a sound when a new review is submitted.</p>
                </div>
                <SettingsSwitch checked={draft.soundAlerts} onClick={() => toggleDraft("soundAlerts")} />
              </div>
            </div>
          </div>

          <div className={`settingsv2-panel ${panel === "moderation" ? "is-active" : ""}`}>
            <div className="settingsv2-panel-head">
              <h2 className="settingsv2-panel-title">Reviews & Moderation</h2>
              <p className="settingsv2-panel-desc">Control how reviews are collected, displayed, and moderated across campaigns.</p>
            </div>

            <div className="settingsv2-block">
              <div className="settingsv2-block-head"><p className="settingsv2-block-title">Collection</p></div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main"><p className="settingsv2-row-label">Allow video reviews</p><p className="settingsv2-row-desc">Reviewers can record a video using their camera.</p></div>
                <SettingsSwitch checked={draft.allowVideoReviews} onClick={() => toggleDraft("allowVideoReviews")} />
              </div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main"><p className="settingsv2-row-label">Allow text reviews</p><p className="settingsv2-row-desc">Reviewers can submit a written review instead of video.</p></div>
                <SettingsSwitch checked={draft.allowTextReviews} onClick={() => toggleDraft("allowTextReviews")} />
              </div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main"><p className="settingsv2-row-label">Allow file upload</p><p className="settingsv2-row-desc">Reviewers can upload a pre-recorded video file (MP4, MOV, WebM).</p></div>
                <SettingsSwitch checked={draft.allowFileUpload} onClick={() => toggleDraft("allowFileUpload")} />
              </div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main"><p className="settingsv2-row-label">Collect star rating</p><p className="settingsv2-row-desc">Show a 1–5 star rating step before the recording screen.</p></div>
                <SettingsSwitch checked={draft.collectStarRating} onClick={() => toggleDraft("collectStarRating")} />
              </div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main"><p className="settingsv2-row-label">Max video duration</p><p className="settingsv2-row-desc">Limit how long a reviewer&apos;s video can be.</p></div>
                <select className="settingsv2-select" style={{ width: 140 }} value={draft.maxVideoDuration} onChange={(event) => updateDraft("maxVideoDuration", event.target.value)}>
                  <option>60 seconds</option>
                  <option>90 seconds</option>
                  <option>2 minutes</option>
                  <option>3 minutes</option>
                  <option>No limit</option>
                </select>
              </div>
            </div>

            <div className="settingsv2-block">
              <div className="settingsv2-block-head"><p className="settingsv2-block-title">Approval & publishing</p></div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main"><p className="settingsv2-row-label">Require manual approval</p><p className="settingsv2-row-desc">All submitted reviews must be approved before they appear publicly.</p></div>
                <SettingsSwitch checked={draft.requireManualApproval} onClick={() => toggleDraft("requireManualApproval")} />
              </div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main"><p className="settingsv2-row-label">Auto-publish 5-star reviews</p><p className="settingsv2-row-desc">Skip approval queue for verified 5-star reviews.</p></div>
                <SettingsSwitch checked={draft.autoPublishFiveStar} onClick={() => toggleDraft("autoPublishFiveStar")} />
              </div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main"><p className="settingsv2-row-label">Auto-reject reviews below</p><p className="settingsv2-row-desc">Automatically reject submissions below a minimum star rating.</p></div>
                <select className="settingsv2-select" style={{ width: 140 }} value={draft.autoRejectThreshold} onChange={(event) => updateDraft("autoRejectThreshold", event.target.value)}>
                  <option>Disabled</option>
                  <option>Below 2 stars</option>
                  <option>Below 3 stars</option>
                </select>
              </div>
            </div>

            <div className="settingsv2-block">
              <div className="settingsv2-block-head"><p className="settingsv2-block-title">Privacy & consent</p></div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main"><p className="settingsv2-row-label">Show consent checkbox</p><p className="settingsv2-row-desc">Require reviewers to accept a consent statement before submitting.</p></div>
                <SettingsSwitch checked={draft.showConsentCheckbox} onClick={() => toggleDraft("showConsentCheckbox")} />
              </div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main"><p className="settingsv2-row-label">Consent text</p><p className="settingsv2-row-desc">The text shown in the consent checkbox.</p></div>
              </div>
              <div style={{ padding: "0 28px 14px" }}>
                <input className="settingsv2-input" value={draft.consentText} onChange={(event) => updateDraft("consentText", event.target.value)} />
              </div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main"><p className="settingsv2-row-label">Anonymize reviewer names</p><p className="settingsv2-row-desc">Show only first name and last initial publicly.</p></div>
                <SettingsSwitch checked={draft.anonymizeReviewerNames} onClick={() => toggleDraft("anonymizeReviewerNames")} />
              </div>
            </div>
          </div>

          <div className={`settingsv2-panel ${panel === "rewards" ? "is-active" : ""}`}>
            <div className="settingsv2-panel-head">
              <h2 className="settingsv2-panel-title">Rewards</h2>
              <p className="settingsv2-panel-desc">Configure how rewards are distributed to reviewers. Rewards can also be set per campaign.</p>
            </div>

            <div className="settingsv2-block">
              <div className="settingsv2-block-head"><p className="settingsv2-block-title">Default reward</p></div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main"><p className="settingsv2-row-label">Enable rewards globally</p><p className="settingsv2-row-desc">Turn on rewards by default for all new campaigns.</p></div>
                <SettingsSwitch checked={draft.rewardsEnabledGlobally} onClick={() => toggleDraft("rewardsEnabledGlobally")} />
              </div>
              <div className="settingsv2-grid">
                <div className="settingsv2-field">
                  <label className="settingsv2-label">Default reward type</label>
                  <select className="settingsv2-select" value={draft.defaultRewardType} onChange={(event) => updateDraft("defaultRewardType", event.target.value)}>
                    <option>No reward</option>
                    <option>Gift card</option>
                    <option>Discount code</option>
                    <option>Store credit</option>
                    <option>Custom message</option>
                  </select>
                </div>
                <div className="settingsv2-field">
                  <label className="settingsv2-label">Default value</label>
                  <input className="settingsv2-input" value={draft.defaultRewardValue} onChange={(event) => updateDraft("defaultRewardValue", event.target.value)} />
                </div>
                <div className="settingsv2-field" style={{ gridColumn: "1 / -1" }}>
                  <label className="settingsv2-label">Instructions shown to reviewer</label>
                  <input className="settingsv2-input" value={draft.defaultRewardInstructions} onChange={(event) => updateDraft("defaultRewardInstructions", event.target.value)} />
                </div>
              </div>
            </div>

            <div className="settingsv2-block">
              <div className="settingsv2-block-head"><p className="settingsv2-block-title">Delivery</p></div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main"><p className="settingsv2-row-label">Send reward automatically</p><p className="settingsv2-row-desc">Deliver the reward immediately after submission, without waiting for approval.</p></div>
                <SettingsSwitch checked={draft.sendRewardAutomatically} onClick={() => toggleDraft("sendRewardAutomatically")} />
              </div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main"><p className="settingsv2-row-label">Send reward after approval</p><p className="settingsv2-row-desc">Hold reward delivery until you manually approve the review.</p></div>
                <SettingsSwitch checked={draft.sendRewardAfterApproval} onClick={() => toggleDraft("sendRewardAfterApproval")} />
              </div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main"><p className="settingsv2-row-label">Notify reviewer by email</p><p className="settingsv2-row-desc">Send an email when their reward is ready to claim.</p></div>
                <SettingsSwitch checked={draft.notifyRewardByEmail} onClick={() => toggleDraft("notifyRewardByEmail")} />
              </div>
            </div>

            <div className="settingsv2-block">
              <div className="settingsv2-block-head"><p className="settingsv2-block-title">Budget alerts</p></div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main"><p className="settingsv2-row-label">Low budget warning threshold</p><p className="settingsv2-row-desc">Get notified when fewer than this many rewards remain in any campaign.</p></div>
                <select className="settingsv2-select" style={{ width: 120 }} value={draft.budgetWarningThreshold} onChange={(event) => updateDraft("budgetWarningThreshold", event.target.value)}>
                  <option>3 remaining</option>
                  <option>5 remaining</option>
                  <option>10 remaining</option>
                  <option>15 remaining</option>
                </select>
              </div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main"><p className="settingsv2-row-label">Pause campaign when budget runs out</p><p className="settingsv2-row-desc">Automatically pause the campaign if there are no rewards left to give.</p></div>
                <SettingsSwitch checked={draft.pauseCampaignWhenBudgetRunsOut} onClick={() => toggleDraft("pauseCampaignWhenBudgetRunsOut")} />
              </div>
            </div>
          </div>

          <div className={`settingsv2-panel ${panel === "team" ? "is-active" : ""}`}>
            <div className="settingsv2-panel-head">
              <h2 className="settingsv2-panel-title">Team</h2>
              <p className="settingsv2-panel-desc">Manage who has access to your workspace.</p>
            </div>
            {settingsNotice && <div className="settingsv2-alert is-success">{settingsNotice}</div>}

            <div className="settingsv2-invite-box">
              <div className="settingsv2-field" style={{ flex: 1 }}>
                <label className="settingsv2-label">Invite by email</label>
                <input className="settingsv2-input" type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} />
              </div>
              <div className="settingsv2-field" style={{ width: 140 }}>
                <label className="settingsv2-label">Role</label>
                <select className="settingsv2-select" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as PendingInvite["role"])}>
                  <option>Viewer</option>
                  <option>Editor</option>
                  <option>Admin</option>
                </select>
              </div>
              <button type="button" className="settingsv2-btn settingsv2-btn-primary settingsv2-btn-sm" onClick={handleSendInvite}>
                Send invite
              </button>
            </div>

            <div className="settingsv2-subsection-title">Members — {teamMembers.length}</div>
            {teamMembers.map((member) => (
              <div key={member.id} className="settingsv2-member-row">
                <div className="settingsv2-avatar" style={{ background: member.background, color: member.accent }}>{member.initials}</div>
                <div className="settingsv2-member-info">
                  <div className="settingsv2-member-name">{member.name}</div>
                  <div className="settingsv2-member-email">{member.email}</div>
                </div>
                <div className="settingsv2-member-actions">
                  {member.role === "Owner" ? (
                    <SettingsBadge>Owner</SettingsBadge>
                  ) : (
                    <>
                      <select className="settingsv2-select" style={{ width: 100, height: 28, fontSize: 12 }} value={member.role} onChange={(event) => {
                        setTeamMembers((current) =>
                          current.map((entry) =>
                            entry.id === member.id ? { ...entry, role: event.target.value as TeamMember["role"] } : entry
                          )
                        );
                      }}>
                        <option>Viewer</option>
                        <option>Editor</option>
                        <option>Admin</option>
                      </select>
                      <button type="button" className="settingsv2-btn settingsv2-btn-danger-ghost settingsv2-btn-sm" onClick={() => setTeamMembers((current) => current.filter((entry) => entry.id !== member.id))}>
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            <div className="settingsv2-subsection-title" style={{ marginTop: 4 }}>Pending invites — {pendingInvites.length}</div>
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="settingsv2-member-row">
                <div className="settingsv2-avatar" style={{ background: "#f0f0f0", color: "#9a9a9a" }}>?</div>
                <div className="settingsv2-member-info">
                  <div className="settingsv2-member-name" style={{ color: "var(--dashboard-text-secondary)" }}>{invite.email}</div>
                  <div className="settingsv2-member-email">{invite.invitedAt} · {invite.role}</div>
                </div>
                <div className="settingsv2-member-actions">
                  <SettingsBadge tone="warning">Pending</SettingsBadge>
                  <button type="button" className="settingsv2-btn settingsv2-btn-ghost settingsv2-btn-sm" onClick={() => setSettingsNotice(`Invite resent to ${invite.email}.`)}>
                    Resend
                  </button>
                  <button type="button" className="settingsv2-btn settingsv2-btn-danger-ghost settingsv2-btn-sm" onClick={() => setPendingInvites((current) => current.filter((entry) => entry.id !== invite.id))}>
                    Revoke
                  </button>
                </div>
              </div>
            ))}

            <div className="settingsv2-role-chip-grid">
              <div className="settingsv2-role-chip"><strong>Viewer</strong><span>Can view campaigns and reviews. Cannot edit or approve.</span></div>
              <div className="settingsv2-role-chip"><strong>Editor</strong><span>Can create and edit campaigns, approve reviews, manage rewards.</span></div>
              <div className="settingsv2-role-chip"><strong>Admin</strong><span>Full access including billing, team, and workspace settings.</span></div>
            </div>
          </div>

          <div className={`settingsv2-panel ${panel === "integrations" ? "is-active" : ""}`}>
            <div className="settingsv2-panel-head">
              <h2 className="settingsv2-panel-title">Integrations</h2>
              <p className="settingsv2-panel-desc">Connect Tellr to your existing tools to automate workflows and sync data.</p>
            </div>

            <div className="settingsv2-block">
              <div className="settingsv2-block-head"><p className="settingsv2-block-title">Connected</p></div>
              {integrations.filter((entry) => entry.status === "Connected").map((entry) => (
                <div key={entry.name} className="settingsv2-integration-row">
                  <div className="settingsv2-integration-icon">{entry.icon}</div>
                  <div className="settingsv2-integration-info">
                    <div className="settingsv2-integration-name">{entry.name}</div>
                    <div className="settingsv2-integration-desc">{entry.desc}</div>
                  </div>
                  <div className="settingsv2-integration-actions">
                    <SettingsBadge tone="success">Connected</SettingsBadge>
                    <button type="button" className="settingsv2-btn settingsv2-btn-danger-ghost settingsv2-btn-sm" onClick={() => setSettingsNotice(`${entry.name} disconnected.`)}>
                      Disconnect
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="settingsv2-block">
              <div className="settingsv2-block-head"><p className="settingsv2-block-title">Available</p></div>
              {integrations.filter((entry) => entry.status !== "Connected").map((entry) => (
                <div key={entry.name} className="settingsv2-integration-row">
                  <div className="settingsv2-integration-icon">{entry.icon}</div>
                  <div className="settingsv2-integration-info">
                    <div className="settingsv2-integration-name">{entry.name}</div>
                    <div className="settingsv2-integration-desc">{entry.desc}</div>
                  </div>
                  <div className="settingsv2-integration-actions">
                    {entry.status === "Soon" ? (
                      <SettingsBadge>Coming soon</SettingsBadge>
                    ) : (
                      <button type="button" className="settingsv2-btn settingsv2-btn-secondary settingsv2-btn-sm" onClick={() => setSettingsNotice(`Redirecting to ${entry.name}...`)}>
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`settingsv2-panel ${panel === "billing" ? "is-active" : ""}`}>
            <div className="settingsv2-panel-head">
              <h2 className="settingsv2-panel-title">Billing & Plan</h2>
              <p className="settingsv2-panel-desc">Manage your subscription, usage, and payment details.</p>
            </div>

            <div className="settingsv2-block">
              <div className="settingsv2-block-head"><p className="settingsv2-block-title">Current plan</p></div>
              <div className="settingsv2-plan-card">
                <div>
                  <p className="settingsv2-plan-name">Pro <SettingsBadge tone="success">Active</SettingsBadge></p>
                  <div className="settingsv2-plan-price">$49<span> / month</span></div>
                  <div className="settingsv2-plan-features">
                    <div className="settingsv2-plan-feature">Unlimited campaigns</div>
                    <div className="settingsv2-plan-feature">500 video reviews / month</div>
                    <div className="settingsv2-plan-feature">Custom branding removed</div>
                    <div className="settingsv2-plan-feature">Zapier + Make integrations</div>
                    <div className="settingsv2-plan-feature">Priority support</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                  <button type="button" className="settingsv2-btn settingsv2-btn-primary settingsv2-btn-sm" onClick={() => setSettingsNotice("Redirecting to plan upgrade...")}>
                    Upgrade to Business
                  </button>
                  <button type="button" className="settingsv2-btn settingsv2-btn-ghost settingsv2-btn-sm" onClick={() => setSettingsNotice("Redirecting to billing portal...")}>
                    Manage subscription
                  </button>
                  <div className="settingsv2-hint" style={{ textAlign: "right", marginTop: 4 }}>Next billing: Jul 1, 2025<br />Renews automatically</div>
                </div>
              </div>
            </div>

            <div className="settingsv2-block">
              <div className="settingsv2-block-head"><p className="settingsv2-block-title">Monthly usage</p></div>
              <div className="settingsv2-usage-row">
                <div className="settingsv2-usage-label">Video reviews</div>
                <div className="settingsv2-usage-bar-wrap"><div className="settingsv2-usage-bar"><div className="settingsv2-usage-fill" style={{ width: usage.reviewsWidth }} /></div></div>
                <div className="settingsv2-usage-value">{usage.reviewsValue}</div>
              </div>
              <div className="settingsv2-usage-row">
                <div className="settingsv2-usage-label">Active campaigns</div>
                <div className="settingsv2-usage-bar-wrap"><div className="settingsv2-usage-bar"><div className="settingsv2-usage-fill" style={{ width: usage.campaignsWidth }} /></div></div>
                <div className="settingsv2-usage-value">{usage.campaignsValue}</div>
              </div>
              <div className="settingsv2-usage-row">
                <div className="settingsv2-usage-label">Team members</div>
                <div className="settingsv2-usage-bar-wrap"><div className="settingsv2-usage-bar"><div className="settingsv2-usage-fill is-warning" style={{ width: usage.teamWidth }} /></div></div>
                <div className="settingsv2-usage-value">{usage.teamValue}</div>
              </div>
              <div className="settingsv2-usage-row">
                <div className="settingsv2-usage-label">Storage</div>
                <div className="settingsv2-usage-bar-wrap"><div className="settingsv2-usage-bar"><div className="settingsv2-usage-fill" style={{ width: usage.storageWidth }} /></div></div>
                <div className="settingsv2-usage-value">{usage.storageValue}</div>
              </div>
            </div>

            <div className="settingsv2-block">
              <div className="settingsv2-block-head"><p className="settingsv2-block-title">Payment method</p></div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ background: "#f0f0f0", border: "1px solid var(--dashboard-border)", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600 }}>VISA</div>
                    <div>
                      <p className="settingsv2-row-label">Visa ending in 4242</p>
                      <p className="settingsv2-row-desc">Expires 09/2027</p>
                    </div>
                  </div>
                </div>
                <button type="button" className="settingsv2-btn settingsv2-btn-secondary settingsv2-btn-sm" onClick={() => setSettingsNotice("Redirecting to payment portal...")}>
                  Update card
                </button>
              </div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main">
                  <p className="settingsv2-row-label">Billing email</p>
                  <p className="settingsv2-row-desc">Invoices are sent to this address.</p>
                </div>
                <input className="settingsv2-input" style={{ width: 220, height: 28, fontSize: 12 }} type="email" value={draft.billingEmail} onChange={(event) => updateDraft("billingEmail", event.target.value)} />
              </div>
            </div>

            <div className="settingsv2-block">
              <div className="settingsv2-block-head"><p className="settingsv2-block-title">Invoices</p></div>
              {["Jun 1, 2025", "May 1, 2025", "Apr 1, 2025"].map((date) => (
                <div key={date} className="settingsv2-row">
                  <div className="settingsv2-row-main">
                    <p className="settingsv2-row-label">{date}</p>
                    <p className="settingsv2-row-desc">Pro plan — Monthly</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <SettingsBadge tone="success">Paid</SettingsBadge>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>$49.00</span>
                    <button type="button" className="settingsv2-btn settingsv2-btn-ghost settingsv2-btn-sm" onClick={() => setSettingsNotice("Invoice downloaded.")}>
                      PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`settingsv2-panel ${panel === "api" ? "is-active" : ""}`}>
            <div className="settingsv2-panel-head">
              <h2 className="settingsv2-panel-title">API & Webhooks</h2>
              <p className="settingsv2-panel-desc">Manage your API keys and configure account-level webhooks for automation.</p>
            </div>
            {webhookNotice && <div className="settingsv2-alert is-success">{webhookNotice}</div>}
            {webhookError && <div className="settingsv2-alert is-error">{webhookError}</div>}

            <div className="settingsv2-block">
              <div className="settingsv2-block-head"><p className="settingsv2-block-title">API keys</p></div>
              <div className="settingsv2-row">
                <div className="settingsv2-row-main">
                  <p className="settingsv2-row-label">Secret API key</p>
                  <p className="settingsv2-row-desc">Use this key to authenticate requests to the API. Keep it secret.</p>
                </div>
                <button type="button" className="settingsv2-btn settingsv2-btn-primary settingsv2-btn-sm" onClick={() => setSettingsNotice("New API key generated.")}>
                  Generate key
                </button>
              </div>
              <div style={{ padding: "0 28px 14px", display: "flex", gap: 8, alignItems: "center" }}>
                <input className="settingsv2-input settingsv2-mono" type="password" value={apiKeyValue} readOnly style={{ background: "#f7f7f7" }} />
                <button type="button" className="settingsv2-btn settingsv2-btn-secondary settingsv2-btn-sm" onClick={() => onCopyText(apiKeyValue)}>
                  Copy
                </button>
                <button type="button" className="settingsv2-btn settingsv2-btn-danger-ghost settingsv2-btn-sm" onClick={() => setSettingsNotice("API key revoked. Generate a new one.")}>
                  Revoke
                </button>
              </div>
              <div className="settingsv2-inline-help">
                <strong>Tip:</strong> Never expose your secret key in client-side code. Rotate it immediately if you suspect it&apos;s compromised.
                <br />→ <a href="#" onClick={(event) => event.preventDefault()}>View API documentation</a>
              </div>
            </div>

            <div className="settingsv2-block">
              <div className="settingsv2-block-head"><p className="settingsv2-block-title">Account-level webhooks</p></div>
              {latestWebhookSecret && (
                <div className="settingsv2-alert" style={{ marginBottom: 0 }}>
                  Latest signing secret: <strong>{latestWebhookSecret}</strong>{" "}
                  <button type="button" className="settingsv2-btn settingsv2-btn-ghost settingsv2-btn-sm" onClick={() => onCopyText(latestWebhookSecret)} style={{ marginLeft: 8 }}>
                    Copy
                  </button>
                </div>
              )}
              <form onSubmit={onCreateWebhook}>
                <div className="settingsv2-grid">
                  <div className="settingsv2-field">
                    <label className="settingsv2-label">Endpoint URL</label>
                    <input id="dashboard-webhook-endpoint-url" className="settingsv2-input" type="url" placeholder="https://hooks.zapier.com/..." value={webhookUrl} onChange={(event) => onWebhookUrlChange(event.target.value)} />
                  </div>
                  <div className="settingsv2-field">
                    <label className="settingsv2-label">Description</label>
                    <input className="settingsv2-input" type="text" placeholder="e.g. Zapier trigger" value={webhookDescription} onChange={(event) => onWebhookDescriptionChange(event.target.value)} />
                  </div>
                </div>
                <div style={{ padding: "0 28px 14px" }}>
                  <div className="settingsv2-block-title" style={{ marginBottom: 10 }}>Trigger on</div>
                  <div className="settingsv2-event-grid">
                    {webhookEventOptions.map((option) => {
                      const checked = webhookEvents.includes(option.value);
                      return (
                        <button key={option.value} type="button" className="settingsv2-event-item" onClick={() => onToggleWebhookEvent(option.value)}>
                          <span className={`settingsv2-checkbox ${checked ? "is-on" : ""}`} />
                          <span>
                            <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--dashboard-text)" }}>{option.value}</span>
                            <span style={{ display: "block", fontSize: 11, color: "var(--dashboard-text-tertiary)" }}>{option.helper}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ padding: "0 28px 14px", display: "flex", gap: 6 }}>
                  <button type="submit" className="settingsv2-btn settingsv2-btn-accent settingsv2-btn-sm" disabled={webhookFormSaving || webhookEvents.length === 0}>
                    {webhookFormSaving ? "Saving..." : "Save webhook"}
                  </button>
                </div>
              </form>

              {webhookLoading && <div className="settingsv2-alert">Loading webhook endpoints...</div>}
              {webhookEndpoints.map((endpoint) => (
                <div key={endpoint.id} className="settingsv2-webhook-card">
                  <div>
                    <p className="settingsv2-webhook-url">{endpoint.url}</p>
                    <p className="settingsv2-webhook-meta">{endpoint.description || "No description"} · {endpoint.isActive ? "Active" : "Paused"}</p>
                  </div>
                  <div className="settingsv2-webhook-actions">
                    <button type="button" className="settingsv2-btn settingsv2-btn-ghost settingsv2-btn-sm" onClick={() => onSendWebhookTest(endpoint.id)} disabled={webhookActionId === `test:${endpoint.id}`}>
                      {webhookActionId === `test:${endpoint.id}` ? "Sending..." : "Send test"}
                    </button>
                    <button type="button" className="settingsv2-btn settingsv2-btn-ghost settingsv2-btn-sm" onClick={() => onRotateWebhookSecret(endpoint.id)} disabled={webhookActionId === `rotate:${endpoint.id}`}>
                      {webhookActionId === `rotate:${endpoint.id}` ? "Rotating..." : "Rotate secret"}
                    </button>
                    <button type="button" className="settingsv2-btn settingsv2-btn-ghost settingsv2-btn-sm" onClick={() => onToggleWebhook(endpoint)} disabled={webhookActionId === `toggle:${endpoint.id}`}>
                      {webhookActionId === `toggle:${endpoint.id}` ? "Saving..." : endpoint.isActive ? "Pause" : "Enable"}
                    </button>
                    <button type="button" className="settingsv2-btn settingsv2-btn-danger-ghost settingsv2-btn-sm" onClick={() => onDeleteWebhook(endpoint.id)} disabled={webhookActionId === `delete:${endpoint.id}`}>
                      {webhookActionId === `delete:${endpoint.id}` ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`settingsv2-panel ${panel === "danger" ? "is-active" : ""}`}>
            <div className="settingsv2-panel-head">
              <h2 className="settingsv2-panel-title is-danger">Danger Zone</h2>
              <p className="settingsv2-panel-desc">These actions are irreversible. Please read carefully before proceeding.</p>
            </div>
            <div className="settingsv2-danger-stack">
              {[
                ["Delete all reviews", "Permanently deletes all submitted reviews across every campaign.", "Delete all reviews"],
                ["Unpublish all reviews", "Remove all published reviews from public pages and any embed codes.", "Unpublish all"],
                ["Delete all campaigns", "Permanently deletes all campaigns and their associated settings.", "Delete all campaigns"],
                ["Delete workspace", "Permanently and immediately deletes your entire workspace — all campaigns, reviews, team members, and billing data.", "Delete workspace"],
              ].map(([title, desc, action]) => (
                <div key={title} className="settingsv2-danger-card">
                  <div>
                    <p className="settingsv2-danger-title">{title}</p>
                    <p className="settingsv2-danger-desc">{desc}</p>
                  </div>
                  <button type="button" className="settingsv2-btn settingsv2-btn-danger" onClick={() => setSettingsNotice(`${title} requires backend confirmation before execution.`)}>
                    {action}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
}
