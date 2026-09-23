import {
  BarChart3,
  Building2,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Pill,
  ScrollText,
  Settings,
  ShieldCheck,
  Truck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  PharmacySettings,
  TabType,
  UserAccount,
  UserOrganization,
} from "../types";

import { PharmaTrackLogo } from "./PharmaTrackLogo";

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  settings: PharmacySettings;
  currentUser: UserAccount | null;
  organizations?: UserOrganization[];
  currentOrganization?: UserOrganization | null;
  onSwitchOrganization?: (
    organizationId: string,
  ) => Promise<UserAccount>;
  onOpenAuthModal: () => void;
  onLogoutClick: () => void;
}

interface NavigationItem {
  id: TabType;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  roles?: Array<UserAccount["role"]>;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  settings,
  currentUser,
  organizations = [],
  currentOrganization = null,
  onSwitchOrganization,
  onOpenAuthModal,
  onLogoutClick,
}: SidebarProps) {
  const [
    organizationMenuOpen,
    setOrganizationMenuOpen,
  ] = useState(false);

  const [
    switchingOrganizationId,
    setSwitchingOrganizationId,
  ] = useState<string | null>(null);

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  const organizationMenuRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleDocumentClick = (
      event: MouseEvent,
    ) => {
      if (
        organizationMenuRef.current &&
        !organizationMenuRef.current.contains(
          event.target as Node,
        )
      ) {
        setOrganizationMenuOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleDocumentClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleDocumentClick,
      );
    };
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        setOrganizationMenuOpen(false);
      }
    };

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        originalOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setOrganizationMenuOpen(false);
  }, [activeTab]);

  const navigationItems: NavigationItem[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: Package,
      roles: [
        "Admin",
        "Pharmacist",
        "Clinician",
      ],
    },
    {
      id: "dispensing",
      label: "Dispensing",
      icon: Pill,
      roles: [
        "Admin",
        "Pharmacist",
        "Clinician",
      ],
    },
    {
      id: "suppliers",
      label: "Suppliers",
      icon: Truck,
      roles: [
        "Admin",
        "Pharmacist",
      ],
    },
    {
      id: "patients",
      label: "Patients",
      icon: Users,
      roles: [
        "Admin",
        "Pharmacist",
        "Clinician",
      ],
    },
    {
      id: "reports",
      label: "Reports",
      icon: BarChart3,
      roles: [
        "Admin",
        "Pharmacist",
        "Clinician",
      ],
    },
    {
      id: "stock-adjustments",
      label: "Stock Adjustments",
      icon: ClipboardList,
      roles: [
        "Admin",
        "Pharmacist",
        "Clinician",
      ],
    },
    {
      id: "user-management",
      label: "User Management",
      icon: UserRound,
      adminOnly: true,
    },
    {
      id: "audit-logs",
      label: "Audit Logs",
      icon: ScrollText,
      adminOnly: true,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      roles: [
        "Admin",
        "Pharmacist",
        "Clinician",
      ],
    },
  ];

  const visibleItems =
    navigationItems.filter(
      (item) => {
        if (
          item.adminOnly &&
          currentUser?.role !== "Admin"
        ) {
          return false;
        }

        if (
          item.roles &&
          currentUser &&
          !item.roles.includes(
            currentUser.role,
          )
        ) {
          return false;
        }

        return true;
      },
    );

  const handleOrganizationSwitch =
    async (
      organizationId: string,
    ) => {
      if (
        !onSwitchOrganization ||
        organizationId ===
          currentOrganization?.id ||
        switchingOrganizationId
      ) {
        return;
      }

      setSwitchingOrganizationId(
        organizationId,
      );

      try {
        await onSwitchOrganization(
          organizationId,
        );

        setOrganizationMenuOpen(false);
        setMobileMenuOpen(false);
      } catch (error) {
        console.error(
          "Failed to switch organization:",
          error,
        );
      } finally {
        setSwitchingOrganizationId(null);
      }
    };

  const handleNavigation = (
    tab: TabType,
  ) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setOrganizationMenuOpen(false);
  };

  const organizationName =
    currentOrganization?.name ??
    currentUser?.organizationName ??
    settings.pharmacyName ??
    "PharmaTrack";

  const organizationType =
    currentOrganization?.type ??
    currentUser?.organizationType ??
    "PHARMACY";

  const organizationTypeLabel =
    organizationType === "CLINIC"
      ? "Clinic"
      : "Pharmacy";

  const initials =
    currentUser?.name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (part) =>
          part.charAt(0).toUpperCase(),
      )
      .join("") || "U";

  const roleLabel =
    currentUser?.role ??
    "User";

  const isSuperAdmin =
    currentUser?.role ===
    "Super Admin";

  const hasMultipleOrganizations =
    organizations.length > 1;

  const renderOrganizationContext = (
    mobile = false,
  ) => {
    if (isSuperAdmin) {
      return (
        <div className="rounded-xl border border-white/15 bg-white/10 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                Platform Access
              </p>

              <p className="truncate text-sm font-semibold text-white">
                Super Admin
              </p>

              <p className="mt-0.5 text-xs text-white/65">
                Platform Administration
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={
          mobile
            ? undefined
            : organizationMenuRef
        }
        className="relative"
      >
        <button
          type="button"
          onClick={() => {
            if (
              hasMultipleOrganizations
            ) {
              setOrganizationMenuOpen(
                (open) => !open,
              );
            }
          }}
          disabled={
            !hasMultipleOrganizations
          }
          className={`w-full rounded-xl border border-white/15 bg-white/10 p-3 text-left transition ${
            hasMultipleOrganizations
              ? "cursor-pointer hover:bg-white/15"
              : "cursor-default"
          }`}
          aria-haspopup={
            hasMultipleOrganizations
              ? "menu"
              : undefined
          }
          aria-expanded={
            hasMultipleOrganizations
              ? organizationMenuOpen
              : undefined
          }
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <Building2 className="h-5 w-5 text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                Current{" "}
                {organizationTypeLabel}
              </p>

              <p className="truncate text-sm font-semibold text-white">
                {organizationName}
              </p>

              <p className="mt-0.5 text-xs text-white/65">
                {currentOrganization?.role ??
                  currentUser?.organizationRole ??
                  roleLabel}
              </p>
            </div>

            {hasMultipleOrganizations && (
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-white/70 transition-transform ${
                  organizationMenuOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            )}
          </div>
        </button>

        {organizationMenuOpen &&
          hasMultipleOrganizations && (
            <div className="absolute left-0 right-0 top-full z-[70] mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Switch organization
                </p>
              </div>

              <div className="max-h-64 overflow-y-auto py-1">
                {organizations.map(
                  (organization) => {
                    const isSelected =
                      organization.id ===
                      currentOrganization?.id;

                    const isSwitching =
                      switchingOrganizationId ===
                      organization.id;

                    return (
                      <button
                        key={
                          organization.id
                        }
                        type="button"
                        role="menuitem"
                        disabled={
                          isSelected ||
                          switchingOrganizationId !==
                            null
                        }
                        onClick={() =>
                          void handleOrganizationSwitch(
                            organization.id,
                          )
                        }
                        className={`flex w-full items-center gap-3 px-3 py-3 text-left transition ${
                          isSelected
                            ? "bg-slate-50"
                            : "hover:bg-slate-50"
                        } ${
                          switchingOrganizationId !==
                            null &&
                          !isSwitching
                            ? "cursor-not-allowed opacity-50"
                            : ""
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            isSelected
                              ? "bg-[#22577A] text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <Building2 className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm font-medium ${
                              isSelected
                                ? "text-slate-900"
                                : "text-slate-700"
                            }`}
                          >
                            {
                              organization.name
                            }
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {organization.type ===
                            "CLINIC"
                              ? "Clinic"
                              : "Pharmacy"}{" "}
                            ·{" "}
                            {
                              organization.role
                            }
                          </p>
                        </div>

                        {isSwitching ? (
                          <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-[#22577A]" />
                        ) : (
                          isSelected && (
                            <span className="text-xs font-semibold text-[#22577A]">
                              Current
                            </span>
                          )
                        )}
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          )}
      </div>
    );
  };

  const renderNavigation = () => (
    <>
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/45">
        Main Menu
      </p>

      <div className="space-y-1">
        {visibleItems.map(
          (item) => {
            const Icon = item.icon;

            const isActive =
              activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  handleNavigation(
                    item.id,
                  )
                }
                className={`group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white text-[#22577A] shadow-sm"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    isActive
                      ? "text-[#22577A]"
                      : "text-white/65 group-hover:text-white"
                  }`}
                />

                <span className="truncate">
                  {item.label}
                </span>

                {item.adminOnly &&
                  currentUser?.role ===
                    "Admin" && (
                    <ShieldCheck
                      className={`ml-auto h-3.5 w-3.5 ${
                        isActive
                          ? "text-[#22577A]/60"
                          : "text-white/35"
                      }`}
                    />
                  )}
              </button>
            );
          },
        )}
      </div>
    </>
  );

  const renderUserFooter = () => (
    <div className="shrink-0 border-t border-white/10 p-3">
      {currentUser ? (
        <div className="rounded-xl bg-white/10 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#22577A]">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {currentUser.name}
              </p>

              <p className="truncate text-xs text-white/60">
                {currentUser.email}
              </p>

              <div className="mt-1 flex items-center gap-1.5">
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/75">
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogoutClick}
            className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#1b4662] px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#163a52]"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpenAuthModal}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#22577A] transition hover:bg-white/90"
        >
          <UserRound className="h-4 w-4" />
          Sign in
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* =====================================================
          DESKTOP SIDEBAR
          ===================================================== */}
      <aside className="hidden h-full w-72 shrink-0 flex-col overflow-hidden bg-[#22577A] text-white shadow-xl lg:flex">
        <div className="shrink-0 border-b border-white/10 px-5 py-5">
          <PharmaTrackLogo
            showWordmark
            subtitle
            light
          />
        </div>

        <div className="shrink-0 border-b border-white/10 px-4 py-4">
          {renderOrganizationContext()}
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          {renderNavigation()}
        </nav>

        {renderUserFooter()}
      </aside>

      {/* =====================================================
          MOBILE HEADER
          ===================================================== */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() =>
            setMobileMenuOpen(true)
          }
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100"
          aria-label="Open navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          <Menu className="h-6 w-6" />
        </button>

        <PharmaTrackLogo
          compact
          showWordmark
          subtitle={false}
        />

        <button
          type="button"
          onClick={() =>
            setMobileMenuOpen(true)
          }
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22577A] text-sm font-bold text-white shadow-sm"
          aria-label="Open account menu"
        >
          {initials}
        </button>
      </header>

      {/* =====================================================
          MOBILE OVERLAY
          ===================================================== */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() =>
            setMobileMenuOpen(false)
          }
          className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* =====================================================
          MOBILE DRAWER
          ===================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-[60] flex w-[min(21rem,calc(100vw-3rem))] flex-col overflow-hidden bg-[#22577A] text-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-4">
          <PharmaTrackLogo
            showWordmark
            subtitle
            light
          />

          <button
            type="button"
            onClick={() =>
              setMobileMenuOpen(false)
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white/75 transition hover:bg-white/10 hover:text-white"
            aria-label="Close navigation menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="shrink-0 border-b border-white/10 px-4 py-4">
          {renderOrganizationContext(
            true,
          )}
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          {renderNavigation()}
        </nav>

        {renderUserFooter()}
      </aside>
    </>
  );
}

export default Sidebar;