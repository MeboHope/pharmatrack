import React from "react";

import {
  Bell,
  Menu,
  ShieldCheck,
} from "lucide-react";

interface SuperAdminTopbarProps {
  title: string;
  description?: string;
  userName?: string;
  userEmail?: string;
  onOpenMobileMenu: () => void;
}

function getInitials(
  name?: string,
) {
  if (!name) {
    return "SA";
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

export function SuperAdminTopbar({
  title,
  description,
  userName,
  userEmail,
  onOpenMobileMenu,
}: SuperAdminTopbarProps) {
  const initials = getInitials(
    userName,
  );

  return (
    <header className="sticky top-0 z-30 border-b border-[#1B4865] bg-[#22577A] text-white shadow-sm">
      <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left side */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-bold tracking-tight text-white sm:text-xl">
                {title}
              </h1>

              <span className="hidden items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white sm:inline-flex">
                <ShieldCheck
                  size={12}
                />

                Platform
              </span>
            </div>

            {description && (
              <p className="mt-0.5 hidden truncate text-xs text-slate-200/80 sm:block">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-100 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Notifications"
          >
            <Bell size={18} />

            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-emerald-300 ring-2 ring-[#22577A]" />
          </button>

          <div className="hidden h-8 w-px bg-white/15 sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white text-sm font-bold text-[#22577A] shadow-sm">
              {initials}
            </div>

            <div className="hidden min-w-0 lg:block">
              <p className="max-w-[180px] truncate text-sm font-semibold text-white">
                {userName ||
                  "Super Administrator"}
              </p>

              <p className="max-w-[180px] truncate text-[11px] text-slate-200/75">
                {userEmail ||
                  "Platform Administrator"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default SuperAdminTopbar;