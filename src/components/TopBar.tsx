import React, { useEffect, useState } from "react";
import { Search, Bell, HelpCircle, Menu, X } from "lucide-react";
import { User, AuditLog } from "../types";
import { useSidebar } from "../SidebarContext";
import { apiJson } from "../lib/api";

interface TopBarProps {
  activeUser: User | null;
  searchPlaceholder?: string;
  breadcrumb?: React.ReactNode;
  rightSlot?: React.ReactNode;
  searchValue?: string;
  onSearchChange?: (q: string) => void;
}

// Horodatage relatif compact (fr).
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `il y a ${d} j`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `il y a ${mo} mois`;
  return `il y a ${Math.floor(mo / 12)} an(s)`;
}

// Description des vues pour le panneau d'aide (rôle en une ligne + détail).
const VIEW_HELP: Array<{ name: string; role: string; description: string }> = [
  { name: "Tableau de bord", role: "Vue d'ensemble & KPIs", description: "Indicateurs clés, tendances de sourcing et activité récente du recrutement." },
  { name: "Offres", role: "Gérer les offres d'emploi", description: "Créer, modifier et archiver les offres, avec compétences et date limite." },
  { name: "Candidats", role: "Base de candidats", description: "Lister, filtrer et ouvrir les fiches candidats ; ajouter et exporter." },
  { name: "Pipeline", role: "Suivi kanban des étapes", description: "Déplacer les candidats entre les étapes de recrutement par glisser-déposer." },
  { name: "Emails", role: "Boîte de réception", description: "Candidatures reçues par email, importables en candidats." },
  { name: "Recherche IA", role: "Recherche sémantique", description: "Trouver des profils par correspondance sémantique avec un besoin." },
  { name: "Rapports", role: "Exports & statistiques", description: "Générer et exporter des rapports d'activité et de performance." },
  { name: "Utilisateurs", role: "Gestion des comptes", description: "Consulter les utilisateurs de l'espace ; les admins peuvent en créer." },
  { name: "Paramètres", role: "Configuration de l'espace", description: "Informations de l'entreprise et réglages du tenant actif." },
];

export default function TopBar({ activeUser, searchPlaceholder, breadcrumb, rightSlot, searchValue, onSearchChange }: TopBarProps) {
  const { openSidebar } = useSidebar();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<AuditLog[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);

  // Charge les 5 dernières actions (pour le badge + le panneau).
  useEffect(() => {
    let cancelled = false;
    apiJson<{ data: AuditLog[] }>("/api/audit-logs?limit=5")
      .then(res => { if (!cancelled) setNotifs(res.data ?? []); })
      .catch(() => { /* silencieux : le badge reste simplement vide */ });
    return () => { cancelled = true; };
  }, []);

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
              className="w-full bg-surface-container-low border border-outline-variant rounded-full py-1.5 pl-9 pr-3 md:pl-10 md:pr-4 focus:ring-2 focus:ring-secondary-container focus:outline-none text-sm transition-all"
              placeholder={searchPlaceholder || "Rechercher candidats, offres ou rapports..."}
              type="text"
              {...(onSearchChange
                ? { value: searchValue ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value) }
                : {})}
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {rightSlot}
        {/* Cloche : notifications (5 dernières actions) + badge. Masquée sur mobile. */}
        <button
          onClick={() => setNotifOpen(true)}
          title="Notifications"
          className="hidden sm:inline-flex relative p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-all"
        >
          <Bell size={18} />
          {notifs.length > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-error text-white text-[10px] font-bold leading-4 text-center">
              {notifs.length}
            </span>
          )}
        </button>
        {/* Aide */}
        <button
          onClick={() => setHelpOpen(true)}
          title="Aide"
          className="hidden sm:inline-flex p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-all"
        >
          <HelpCircle size={18} />
        </button>
        <div className="hidden sm:block h-8 w-px bg-outline-variant mx-1" />
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

      {/* Panneau latéral droit : notifications. Se ferme au clic en dehors (backdrop). */}
      {notifOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setNotifOpen(false)} aria-hidden="true" />
          <aside className="fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] bg-white shadow-xl border-l border-outline-variant flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-outline-variant">
              <h3 className="font-sans font-semibold text-primary">Notifications</h3>
              <button onClick={() => setNotifOpen(false)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-outline-variant">
              {notifs.length === 0 ? (
                <p className="p-4 text-sm text-on-surface-variant">Aucune activité récente.</p>
              ) : (
                notifs.map(n => (
                  <div key={n.id} className="p-4">
                    <p className="text-sm text-on-surface"><span className="font-bold">{n.userName}</span> — {n.action}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">{n.details}</p>
                    <p className="font-mono text-[10px] text-on-surface-variant mt-1">{relativeTime(n.timestamp)}</p>
                  </div>
                ))
              )}
            </div>
          </aside>
        </>
      )}

      {/* Modal d'aide centré : Raccourcis + Aide rapide */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setHelpOpen(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl p-6 shadow-[0px_10px_25px_rgba(15,23,42,0.08)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-sans text-lg font-semibold text-primary">Aide — Nexus Talent</h3>
              <button onClick={() => setHelpOpen(false)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Section 1 : Raccourcis (vues et rôle en une ligne) */}
            <h4 className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold mb-2">Raccourcis</h4>
            <div className="border border-outline-variant rounded-lg overflow-hidden mb-6">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-outline-variant">
                  {VIEW_HELP.map(v => (
                    <tr key={v.name} className="hover:bg-surface-container-low">
                      <td className="px-4 py-2 font-bold text-on-surface whitespace-nowrap">{v.name}</td>
                      <td className="px-4 py-2 text-on-surface-variant">{v.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 2 : Aide rapide (description de chaque vue) */}
            <h4 className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold mb-2">Aide rapide</h4>
            <ul className="space-y-2.5">
              {VIEW_HELP.map(v => (
                <li key={v.name} className="text-sm">
                  <span className="font-bold text-on-surface">{v.name}</span>
                  <span className="text-on-surface-variant"> — {v.description}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </header>
  );
}
