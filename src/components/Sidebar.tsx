import React from "react";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  KanbanSquare,
  Mail,
  BarChart3,
  UserCog,
  Settings,
  Plus,
  LogOut,
  BrainCircuit,
  Archive,
  CalendarDays,
  Sun,
  Moon,
  X
} from "lucide-react";
import { Company, User, UserRole } from "../types";

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  // Conservé pour afficher le nom de l'application (appName) dans le bandeau.
  activeCompany: Company | null;
  activeUser: User | null;
  onCreateJob?: () => void;
  onLogout?: () => void;
  // Drawer mobile : contrôlé par App (statique ≥ md, coulissant < md).
  isOpen?: boolean;
  onClose?: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export default function Sidebar({
  activeView,
  setActiveView,
  activeCompany,
  activeUser,
  onCreateJob,
  onLogout,
  isOpen = false,
  onClose,
  darkMode = false,
  onToggleDarkMode
}: SidebarProps) {
  // Seuls les admins (plateforme ou entreprise) voient la gestion des utilisateurs
  // et les paramètres — miroir du contrôle côté vues (App.tsx / serveur).
  const isAdmin =
    activeUser?.role === UserRole.AdminPlateforme || activeUser?.role === UserRole.AdminEntreprise;
  const adminOnlyIds = new Set(["users", "settings"]);

  const menuItems = [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { id: "jobs", label: "Offres", icon: Briefcase },
    { id: "archivedJobs", label: "Offres archivées", icon: Archive },
    { id: "candidates", label: "Candidats", icon: Users },
    { id: "pipeline", label: "Pipeline", icon: KanbanSquare },
    { id: "calendar", label: "Calendrier", icon: CalendarDays },
    { id: "emails", label: "Emails", icon: Mail },
    { id: "ai-search", label: "Recherche IA", icon: BrainCircuit },
    { id: "reports", label: "Rapports", icon: BarChart3 },
    { id: "users", label: "Utilisateurs", icon: UserCog },
    { id: "settings", label: "Paramètres", icon: Settings }
  ].filter(item => isAdmin || !adminOnlyIds.has(item.id));

  // Initiales (max 2 lettres) dérivées du nom de l'application pour le carré de marque.
  const appName = activeCompany?.appName || "Nexus Talent";
  const appInitials = appName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join("") || "NT";

  return (
    <>
      {/* Backdrop mobile : n'apparaît que lorsque le drawer est ouvert, < md. */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-[260px] h-screen bg-surface flex flex-col py-6 border-r border-outline-variant shrink-0 select-none fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:static md:z-auto md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
      {/* Brand */}
      <div className="px-6 mb-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center shrink-0">
          <span className="font-mono text-on-primary text-[10px] font-bold tracking-tight">{appInitials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-sans font-bold text-lg text-on-surface leading-tight truncate">{appName}</h1>
          <p className="font-mono text-[10px] text-on-surface-variant tracking-widest uppercase">Espace Recruteur</p>
        </div>
        {/* Fermeture du drawer (mobile uniquement) */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 -mr-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-all shrink-0"
          title="Fermer le menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 active:scale-[0.98] rounded-md ${
                isActive
                  ? "text-secondary font-bold border-r-4 border-secondary bg-surface-container-high rounded-r-none"
                  : "text-on-surface-variant hover:bg-surface-container font-medium"
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mode sombre */}
      {onToggleDarkMode && (
        <div className="px-6 mt-4">
          <button
            onClick={onToggleDarkMode}
            aria-pressed={darkMode}
            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 border border-outline-variant rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-all"
          >
            <span className="flex items-center gap-2">
              {darkMode ? <Moon size={16} /> : <Sun size={16} />}
              Mode sombre
            </span>
            <span
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
                darkMode ? "bg-secondary" : "bg-outline-variant"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  darkMode ? "translate-x-[18px]" : "translate-x-1"
                }`}
              />
            </span>
          </button>
        </div>
      )}

      {/* CTA */}
      <div className="px-6 mt-4">
        <button
          onClick={onCreateJob}
          className="w-full bg-accent text-white py-2.5 rounded-lg font-bold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus size={18} />
          Nouvelle Offre
        </button>
      </div>

      {/* Identity footer */}
      <div className="px-6 mt-6 pt-4 border-t border-outline-variant flex items-center gap-3">
        {activeUser?.avatarUrl ? (
          <img
            src={activeUser.avatarUrl}
            alt={activeUser.name}
            className="w-9 h-9 rounded-full object-cover border-2 border-secondary shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-xs shrink-0">
            {activeUser?.name?.substring(0, 2).toUpperCase() || "RH"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-on-surface truncate leading-tight">{activeUser?.name}</p>
          <p className="font-mono text-[10px] text-on-surface-variant truncate mt-0.5">{activeUser?.role}</p>
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            title="Se déconnecter"
            className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/30 rounded-lg transition-all shrink-0"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
      </aside>
    </>
  );
}
