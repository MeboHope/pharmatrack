// src/components/Sidebar.tsx
import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Pill, 
  ShoppingCart, 
  Truck, 
  Users, 
  BarChart3, 
  SlidersHorizontal, 
  Settings,
  Stethoscope,
  UserCheck,
  Lock,
  LogOut,
  User
} from 'lucide-react';
import { TabType, PharmacySettings, UserAccount } from '../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  settings: PharmacySettings;
  currentUser: UserAccount | null;
  onOpenAuthModal: () => void;
  onLogoutClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  settings,
  currentUser,
  onOpenAuthModal,
  onLogoutClick
}) => {
  const [logoError, setLogoError] = useState(false);

  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'inventory', label: 'Inventory', icon: <Pill className="w-5 h-5" /> },
    { id: 'dispensing', label: 'Dispensing', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'suppliers', label: 'Suppliers', icon: <Truck className="w-5 h-5" /> },
    { id: 'patients', label: 'Patients', icon: <Users className="w-5 h-5" /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'stock-adjustments', label: 'Stock adjustments', icon: <SlidersHorizontal className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside 
      className="w-52 min-h-screen text-white flex flex-col justify-between shrink-0 shadow-lg no-print"
      style={{ backgroundColor: '#22577A' }}
    >
      <div>
        {/* Header App Branding */}
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className="w-full text-left p-4 border-b border-white/10 flex items-center gap-2.5 hover:bg-white/5 transition-colors cursor-pointer group"
          title="Go to Dashboard"
        >
          {!logoError ? (
            <img 
              src={settings.logoUrl || '/logo/logo.png'} 
              alt="PharmaTrack Logo" 
              className="max-w-[36px] max-h-[36px] w-auto h-auto object-contain shrink-0"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-[#57CC99] flex items-center justify-center text-[#22577A] font-bold shadow-md shrink-0">
              <Pill className="w-5 h-5 stroke-[2.5]" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-white leading-tight truncate group-hover:text-[#57CC99] transition-colors">PharmaTrack</h1>
            <p className="text-[11px] text-white/70 font-medium truncate">Inventory & POS System</p>
          </div>
        </button>

        {/* Navigation items */}
        <nav className="p-3 space-y-1">
          <div className="px-2.5 pb-1.5 text-[10px] font-semibold text-white/60 uppercase tracking-wider">
            Menu Options
          </div>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 text-left ${
                  isActive
                    ? 'bg-white text-[#22577A] shadow-sm transform translate-x-0.5'
                    : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className={isActive ? 'text-[#22577A]' : 'text-white/80'}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Logout Option */}
      <div className="p-3 m-2.5 rounded-xl bg-black/20 border border-white/10 text-xs text-white/90">
        <button
          type="button"
          onClick={onLogoutClick}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all group cursor-pointer"
          title="Click to Log Out of PharmaTrack"
        >
          {/* Small white circle with adaptive initials */}
          <div 
            className="w-7 h-7 rounded-full bg-white text-[#22577A] flex items-center justify-center text-xs shrink-0 shadow-xs leading-none"
            style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}
          >
            {(() => {
              const name = currentUser ? currentUser.name : (settings.clinicianName || settings.pharmacyName);
              if (!name) return 'SJ';
              const clean = name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.|Doctor)\s+/i, '').trim();
              const parts = clean.split(/\s+/).filter(Boolean);
              if (parts.length === 0) return 'SJ';
              if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
              return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            })()}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-white shrink-0">
            <span className="text-white">Log out</span>
            <LogOut className="w-4 h-4 text-white stroke-[2.2] transform group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      </div>
    </aside>
  );
};

