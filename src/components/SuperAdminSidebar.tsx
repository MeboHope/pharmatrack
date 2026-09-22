import React from "react";

import {
  Activity,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

export type SuperAdminSection =
  | "dashboard"
  | "organizations"
  | "users"
  | "audit-logs"
  | "system-status"
  | "settings";

interface SuperAdminSidebarProps {
  activeSection: SuperAdminSection;
  onSectionChange: (
    section: SuperAdminSection,
  ) => void;
  onLogout: () => void | Promise<void>;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavigationItem {
  id: SuperAdminSection;
  label: string;
  description: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
  }>;
}

const primaryNavigation: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Platform overview",
    icon: LayoutDashboard,
  },
  {
    id: "organizations",
    label: "Organizations",
    description: "Pharmacies and clinics",
    icon: Building2,
  },
  {
    id: "users",
    label: "Platform Users",
    description: "Global user directory",
    icon: Users,
  },
];

const managementNavigation: NavigationItem[] = [
  {
    id: "audit-logs",
    label: "Audit Logs",
    description: "Platform activity",
    icon: ClipboardList,
  },
  {
    id: "system-status",
    label: "System Status",
    description: "Platform health",
    icon: Activity,
  },
  {
    id: "settings",
    label: "Platform Settings",
    description: "System configuration",
    icon: Settings,
  },
];

export function SuperAdminSidebar({
  activeSection,
  onSectionChange,
  onLogout,
  isCollapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}: SuperAdminSidebarProps) {
  const handleNavigation = (
    section: SuperAdminSection,
  ) => {
    onSectionChange(section);
    onCloseMobile?.();
  };

  const renderNavigation = (
    items: NavigationItem[],
  ) => (
    <div className="space-y-1.5">
      {items.map((item) => {
        const Icon = item.icon;

        const isActive =
          activeSection === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() =>
              handleNavigation(item.id)
            }
            title={
              isCollapsed
                ? item.label
                : undefined
            }
            className={[
              "group relative flex w-full items-center rounded-xl text-left transition-all duration-200",
              isCollapsed
                ? "justify-center px-3 py-3"
                : "gap-3 px-3 py-3",
              isActive
                ? "bg-white text-[#22577A] shadow-sm"
                : "text-slate-200 hover:bg-[#1B4865] hover:text-white",
            ].join(" ")}
          >
            {isActive && (
              <span className="absolute left-0 top-2.5 h-8 w-1 rounded-r-full bg-white" />
            )}

            <span
              className={[
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                isActive
                  ? "bg-[#22577A]/10 text-[#22577A]"
                  : "bg-white/5 text-slate-300 group-hover:bg-white/10 group-hover:text-white",
              ].join(" ")}
            >
              <Icon
                size={19}
                strokeWidth={1.9}
              />
            </span>

            {!isCollapsed && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {item.label}
                </span>

                <span
                  className={[
                    "mt-0.5 block truncate text-[11px]",
                    isActive
                      ? "text-[#22577A]/70"
                      : "text-slate-400 group-hover:text-slate-300",
                  ].join(" ")}
                >
                  {item.description}
                </span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#22577A] text-white">
      {/* Brand */}
      <div className="flex h-[76px] shrink-0 items-center border-b border-white/10 px-4">
        <div
          className={[
            "flex min-w-0 items-center",
            isCollapsed
              ? "w-full justify-center"
              : "gap-3",
          ].join(" ")}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl">
            <img
              src="/logo/logo.png"
              alt="PharmaTrack"
              className="h-full w-full object-contain"
              onError={(event) => {
                event.currentTarget.style.display =
                  "none";

                const fallback =
                  event.currentTarget
                    .nextElementSibling;

                if (fallback) {
                  fallback.classList.remove(
                    "hidden",
                  );
                }
              }}
            />

            <ShieldCheck
              size={25}
              strokeWidth={2.1}
              className="hidden text-white"
            />
          </div>

          {!isCollapsed && (
            <div className="min-w-0">
              <div className="truncate text-[17px] font-bold tracking-tight text-white">
                PharmaTrack
              </div>

              <div className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                Platform Control
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onCloseMobile}
          className="ml-auto rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close navigation"
        >
          <X size={19} />
        </button>
      </div>

      {/* Platform identity */}
      {!isCollapsed && (
        <div className="mx-3 mt-4 rounded-xl border border-white/10 bg-white/10 px-3 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
              <ShieldCheck
                size={16}
                strokeWidth={2}
              />
            </span>

            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">
                Super Administrator
              </p>

              <p className="truncate text-[10px] text-slate-300">
                Platform-level access
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-5">
        {!isCollapsed && (
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300/70">
            Platform
          </p>
        )}

        {renderNavigation(
          primaryNavigation,
        )}

        <div className="my-5 border-t border-white/10" />

        {!isCollapsed && (
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300/70">
            Management
          </p>
        )}

        {renderNavigation(
          managementNavigation,
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-white/10 p-3">
        <button
          type="button"
          onClick={() => {
            onCloseMobile?.();
            void onLogout();
          }}
          title={
            isCollapsed
              ? "Sign out"
              : undefined
          }
          className={[
            "group flex w-full items-center rounded-xl text-left text-white transition-colors",
            "border border-white/10 bg-[#1B4865] shadow-sm",
            "hover:bg-[#163A52] hover:text-white",
            isCollapsed
              ? "justify-center px-3 py-3"
              : "gap-3 px-3 py-3",
          ].join(" ")}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white transition-colors group-hover:bg-white/10">
            <LogOut
              size={18}
              strokeWidth={1.9}
            />
          </span>

          {!isCollapsed && (
            <span>
              <span className="block text-sm font-semibold">
                Sign out
              </span>

              <span className="block text-[11px] text-white/60 group-hover:text-white/75">
                End platform session
              </span>
            </span>
          )}
        </button>

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="mt-2 hidden w-full items-center justify-center rounded-xl border border-white/10 py-2 text-slate-300 transition-colors hover:bg-[#1B4865] hover:text-white lg:flex"
            aria-label={
              isCollapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
          >
            {isCollapsed ? (
              <ChevronRight
                size={17}
              />
            ) : (
              <ChevronLeft
                size={17}
              />
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 hidden border-r border-[#1B4865] shadow-xl transition-all duration-300 lg:block",
          isCollapsed
            ? "w-[84px]"
            : "w-[264px]",
        ].join(" ")}
      >
        {sidebarContent}
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Mobile */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-[280px] shadow-2xl transition-transform duration-300 lg:hidden",
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full",
        ].join(" ")}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export default SuperAdminSidebar;