import React, {
  useEffect,
  useState,
} from "react";

import {
  SuperAdminSidebar,
  type SuperAdminSection,
} from "./SuperAdminSidebar";

import { SuperAdminTopbar } from "./SuperAdminTopbar";

interface SuperAdminLayoutProps {
  children: React.ReactNode;
  activeSection: SuperAdminSection;
  onSectionChange: (
    section: SuperAdminSection,
  ) => void;
  onLogout: () => void | Promise<void>;
  userName?: string;
  userEmail?: string;
}

const sectionMeta: Record<
  SuperAdminSection,
  {
    title: string;
    description: string;
  }
> = {
  dashboard: {
    title: "Platform Dashboard",
    description:
      "Monitor PharmaTrack organizations, users, and platform activity.",
  },

  organizations: {
    title: "Organizations",
    description:
      "Manage pharmacies and clinics registered on PharmaTrack.",
  },

  users: {
    title: "Platform Users",
    description:
      "View and manage users across the PharmaTrack platform.",
  },

  "audit-logs": {
    title: "Platform Audit Logs",
    description:
      "Review platform-level administrative activity and security events.",
  },

  "system-status": {
    title: "System Status",
    description:
      "Monitor platform services and operational health.",
  },

  settings: {
    title: "Platform Settings",
    description:
      "Manage global PharmaTrack configuration.",
  },
};

export function SuperAdminLayout({
  children,
  activeSection,
  onSectionChange,
  onLogout,
  userName,
  userEmail,
}: SuperAdminLayoutProps) {
  const [
    isCollapsed,
    setIsCollapsed,
  ] = useState(false);

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  const meta =
    sectionMeta[activeSection];

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };

    window.addEventListener(
      "resize",
      handleResize,
    );

    return () =>
      window.removeEventListener(
        "resize",
        handleResize,
      );
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [activeSection]);

  return (
    <div className="min-h-screen bg-slate-50">
      <SuperAdminSidebar
        activeSection={activeSection}
        onSectionChange={
          onSectionChange
        }
        onLogout={onLogout}
        isCollapsed={isCollapsed}
        onToggleCollapse={() =>
          setIsCollapsed(
            (previous) =>
              !previous,
          )
        }
        mobileOpen={mobileOpen}
        onCloseMobile={() =>
          setMobileOpen(false)
        }
      />

      <div
        className={[
          "min-h-screen transition-[margin] duration-300",
          isCollapsed
            ? "lg:ml-[84px]"
            : "lg:ml-[264px]",
        ].join(" ")}
      >
        <SuperAdminTopbar
          title={meta.title}
          description={
            meta.description
          }
          userName={userName}
          userEmail={userEmail}
          onOpenMobileMenu={() =>
            setMobileOpen(true)
          }
        />

        <main className="min-h-[calc(100vh-76px)]">
          {children}
        </main>
      </div>
    </div>
  );
}

export default SuperAdminLayout;