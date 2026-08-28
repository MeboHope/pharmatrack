
import React from "react";

import {
  LayoutDashboard,
  Package,
  Pill,
  Truck,
  Users,
  BarChart3,
  ClipboardList,
  Settings,
  LogOut,
  ShieldCheck,
} from "lucide-react";

import type {
  PharmacySettings,
  TabType,
  UserAccount,
} from "../types";

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (
    tab: TabType,
  ) => void;
  settings: PharmacySettings;
  currentUser: UserAccount;
  onOpenAuthModal: () => void;
  onLogoutClick: () => void;
}

interface NavigationItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  adminOnly?: boolean;
}

export const Sidebar: React.FC<
  SidebarProps
> = ({
  activeTab,
  setActiveTab,
  settings,
  currentUser,
  onOpenAuthModal,
  onLogoutClick,
}) => {
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
    },
    {
      id: "dispensing",
      label: "Dispensing",
      icon: Pill,
    },
    {
      id: "suppliers",
      label: "Suppliers",
      icon: Truck,
    },
    {
      id: "patients",
      label: "Patients",
      icon: Users,
    },
    {
      id: "reports",
      label: "Reports",
      icon: BarChart3,
    },
    {
      id: "stock-adjustments",
      label: "Stock Adjustments",
      icon: ClipboardList,
    },
    {
      id: "user-management",
      label: "User Management",
      icon: ShieldCheck,
      adminOnly: true,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  const visibleItems =
    navigationItems.filter(
      (item) =>
        !item.adminOnly ||
        currentUser.role === "Admin",
    );

  return (
    <aside className="w-64 min-h-screen bg-[#22577A] text-white flex flex-col shrink-0">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img
            src={
              settings.logoUrl ||
              "/logo/logo.png"
            }
            alt="PharmaTrack Logo"
            className="w-10 h-10 object-contain shrink-0"
          />

          <div className="min-w-0">
            <h1 className="font-bold text-lg truncate">
              {settings.pharmacyName ||
                "PharmaTrack"}
            </h1>

            <p className="text-[10px] text-white/70 truncate">
              {settings.tagline ||
                "Pharmacy Management System"}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-white text-[#22577A] shadow-sm"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />

                <span className="truncate">
                  {item.label}
                </span>
              </button>
            );
          },
        )}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          type="button"
          onClick={onOpenAuthModal}
          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold">
                {currentUser.name
                  .charAt(0)
                  .toUpperCase()}
              </span>
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold truncate">
                {currentUser.name}
              </p>

              <p className="text-[10px] text-white/60 truncate">
                {currentUser.role}
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onLogoutClick}
          className="w-full mt-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/80 hover:bg-rose-500/20 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />

          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;