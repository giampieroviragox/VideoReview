"use client";

import { UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type DashboardPersistentSidebarProps = {
  viewerName: string;
  viewerEmail?: string;
  workspaceName: string;
  campaignsCount: number;
};

export default function DashboardPersistentSidebar({
  viewerName,
  viewerEmail,
  workspaceName,
  campaignsCount,
}: DashboardPersistentSidebarProps) {
  const pathname = usePathname();
  const isCampaigns = pathname.startsWith("/dashboard/campaigns");
  const isSettings = pathname.startsWith("/dashboard/settings");

  const viewerInitials = viewerName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return (
    <aside className="dashboard-persistent-sidebar">
      <div className="dashboard-persistent-sidebar-top">
        <Link href="/" className="dashboard-persistent-brand">
          <Image
            src="/tellr-logo.svg"
            alt="Tellr"
            width={184}
            height={48}
            className="dashboard-persistent-brand-logo"
          />
        </Link>
      </div>

      <div className="dashboard-persistent-nav">
        <div className="dashboard-persistent-nav-group">
          <p className="dashboard-persistent-nav-label">Workspace</p>
          <Link
            href="/dashboard/campaigns"
            className={`dashboard-persistent-nav-item ${
              isCampaigns ? "is-active" : "is-muted"
            }`}
          >
            <span className="dashboard-persistent-nav-icon" aria-hidden="true">
              <svg viewBox="0 0 15 15" fill="none">
                <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.2" />
                <path
                  d="M7.5 4.5v3.2l2.2 2.2"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span>Campaigns</span>
            <span className="dashboard-persistent-nav-count">{campaignsCount}</span>
          </Link>
        </div>

        <div className="dashboard-persistent-nav-group">
          <p className="dashboard-persistent-nav-label">Account</p>
          <Link
            href="/dashboard/settings/general"
            className={`dashboard-persistent-nav-item ${
              isSettings ? "is-active" : "is-muted"
            }`}
          >
            <span className="dashboard-persistent-nav-icon" aria-hidden="true">
              <svg viewBox="0 0 15 15" fill="none">
                <circle cx="7.5" cy="7.5" r="2.2" stroke="currentColor" strokeWidth="1.2" />
                <path
                  d="M7.5 1.5v1.2M7.5 12.3v1.2M1.5 7.5h1.2M12.3 7.5h1.2M3.3 3.3l.85.85M10.85 10.85l.85.85M3.3 11.7l.85-.85M10.85 4.15l.85-.85"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span>Settings</span>
          </Link>
        </div>
      </div>

      <div className="dashboard-persistent-spacer" />

      <div className="dashboard-persistent-footer">
        <div className="dashboard-persistent-profile">
          <div className="dashboard-persistent-avatar-shell">
            <span className="dashboard-persistent-avatar-fallback">{viewerInitials || "T"}</span>
            <div className="dashboard-persistent-avatar">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
          <div>
            <p className="dashboard-persistent-name">{viewerName}</p>
            <p className="dashboard-persistent-workspace">{viewerEmail || workspaceName}</p>
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-persistent-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 232px;
          background: #f7f7f7;
          border-right: 1px solid #e8e8e8;
          display: flex;
          flex-direction: column;
          z-index: 40;
          font-family: "Geist", "Inter", "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        .dashboard-persistent-sidebar-top {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          height: 64px;
          min-height: 64px;
          padding: 0 14px;
        }

        .dashboard-persistent-brand {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
        }

        .dashboard-persistent-brand-logo {
          width: auto;
          height: 44px;
          max-width: 100%;
        }

        .dashboard-persistent-nav {
          padding: 10px 8px;
          display: grid;
          gap: 16px;
        }

        .dashboard-persistent-nav-group {
          display: grid;
          gap: 5px;
        }

        .dashboard-persistent-nav-label {
          margin: 0;
          padding: 0 9px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: #9a9a9a;
        }

        .dashboard-persistent-nav-item {
          width: 100%;
          min-height: 38px;
          border: 1px solid transparent;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 10px;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          color: #5c5c5c;
        }

        .dashboard-persistent-nav-item.is-active {
          background: #fff;
          color: #0a0a0a;
          border-color: #e8e8e8;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        }

        .dashboard-persistent-nav-item.is-muted:hover {
          background: #efefef;
          color: #0a0a0a;
        }

        .dashboard-persistent-nav-icon {
          width: 14px;
          height: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .dashboard-persistent-nav-icon svg {
          width: 100%;
          height: 100%;
        }

        .dashboard-persistent-nav-count {
          margin-left: auto;
          min-width: 22px;
          height: 22px;
          border-radius: 999px;
          background: #ff4820;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 6px;
        }

        .dashboard-persistent-spacer {
          flex: 1;
        }

        .dashboard-persistent-footer {
          border-top: 1px solid #e8e8e8;
          padding: 8px;
        }

        .dashboard-persistent-profile {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
          padding: 7px 9px;
          border-radius: 6px;
        }

        .dashboard-persistent-profile:hover {
          background: #f0f0f0;
        }

        .dashboard-persistent-avatar-shell {
          position: relative;
          width: 26px;
          height: 26px;
          flex-shrink: 0;
        }

        .dashboard-persistent-avatar-fallback {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background: #0a0a0a;
          color: #fff;
          display: grid;
          place-items: center;
          font-size: 12px;
          font-weight: 700;
        }

        .dashboard-persistent-avatar {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          opacity: 0;
        }

        .dashboard-persistent-avatar :where(.cl-userButtonBox, .cl-userButtonTrigger, .cl-avatarBox) {
          width: 26px;
          height: 26px;
          border-radius: 999px;
        }

        .dashboard-persistent-name {
          margin: 0;
          font-size: 12px;
          font-weight: 500;
          color: #0a0a0a;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dashboard-persistent-workspace {
          margin: 2px 0 0;
          font-size: 11px;
          color: #9a9a9a;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 960px) {
          .dashboard-persistent-sidebar {
            position: static;
            width: auto;
            border-right: none;
            border-bottom: 1px solid #e8e8e8;
          }
        }
      `}</style>
    </aside>
  );
}
