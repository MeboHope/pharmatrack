import {
  BarChart3,
  Building2,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  Pill,
  ScrollText,
  Settings,
  ShieldCheck,
  Truck,
  UserRound,
  Users,
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
      } catch (error) {
        console.error(
          "Failed to switch organization:",
          error,
        );
      } finally {
        setSwitchingOrganizationId(null);
      }
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

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col overflow-hidden bg-[#22577A] text-white shadow-xl">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
            <ShieldCheck className="h-6 w-6 text-[#22577A]" />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight">
              PharmaTrack
            </h1>

            <p className="truncate text-xs text-white/70">
              Pharmacy &amp; Clinic Management
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-white/10 px-4 py-4">
        {isSuperAdmin ? (
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
        ) : (
          <div
            ref={organizationMenuRef}
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
                    Current {organizationTypeLabel}
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
                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
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
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
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
                    setActiveTab(item.id)
                  }
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
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
      </nav>

      <div className="border-t border-white/10 p-3">
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
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#22577A] transition hover:bg-white/90"
          >
            <UserRound className="h-4 w-4" />
            Sign in
          </button>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;