import React from "react";
import { Search, Bell, HelpCircle, Menu } from "lucide-react";
import { User } from "../types";
import { useSidebar } from "../SidebarContext";

interface TopBarProps {
  activeUser: User | null;
  searchPlaceholder?: string;
  breadcrumb?: React.ReactNode;
  rightSlot?: React.ReactNode;
  searchValue?: string;
  onSearchChange?: (q: string) => void;
}

export default function TopBar({ activeUser, searchPlaceholder, breadcrumb, rightSlot, searchValue, onSearchChange }: TopBarProps) {
  const { openSidebar } = useSidebar();
  return (
    <header className="sticky top-0 h-16 bg-surface/80 backdrop-blur-md border-b border-outline-variant flex justify-between items-center gap-2 px-4 md:px-8 z-40 shrink-0">
      {/* Ouverture du menu latéral (mobile uniquement) */}
      <button
        onClick={openSidebar}
        className="md:hidden p-2 -ml-1 text-on-surface-variant hover:bg-surface-variant rounded-lg transition-all shrink-0"
        title="Ouvrir le menu"
      >
        <Menu size={20} />
      </button>
      <div className="flex items-center flex-1 max-w-xl min-w-0">
        {breadcrumb ? (
          breadcrumb
        ) : (
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              className="w-full bg-surface-container-low border border-outline-variant rounded-full py-1.5 pl-10 pr-4 focus:ring-2 focus:ring-secondary-container focus:outline-none text-sm transition-all"
              placeholder={searchPlaceholder || "Rechercher candidats, offres ou rapports..."}
              type="text"
              {...(onSearchChange
                ? { value: searchValue ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value) }
                : {})}
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {rightSlot}
        <button className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-all">
          <Bell size={18} />
        </button>
        <button className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-all">
          <HelpCircle size={18} />
        </button>
        <div className="h-8 w-px bg-outline-variant mx-1" />
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-on-surface leading-tight">{activeUser?.name || "Utilisateur"}</p>
            <p className="font-mono text-[10px] text-on-surface-variant">{activeUser?.role || ""}</p>
          </div>
          {activeUser?.avatarUrl ? (
            <img
              src={activeUser.avatarUrl}
              alt={activeUser.name}
              className="h-10 w-10 rounded-full border-2 border-secondary object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs border-2 border-secondary">
              {activeUser?.name?.substring(0, 2).toUpperCase() || "RH"}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
