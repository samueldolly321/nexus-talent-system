import React, { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import TopBar from "./TopBar";
import { User, AuditLog, UserRole } from "../types";
import { apiJson } from "../lib/api";

interface ConnectionsViewProps {
  activeUser: User | null;
}

// Journal des connexions — réservé aux admins entreprise/plateforme.
// L'IP et le navigateur ne sont renvoyés par l'API qu'à ces rôles (le serveur
// les masque pour les autres) ; cette vue n'est de toute façon accessible qu'à eux.
export default function ConnectionsView({ activeUser }: ConnectionsViewProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const isCompanyAdmin =
    activeUser?.role === UserRole.AdminPlateforme || activeUser?.role === UserRole.AdminEntreprise;

  useEffect(() => {
    if (!isCompanyAdmin) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    apiJson<{ data: AuditLog[] }>("/api/audit-logs?limit=100")
      .then((res) => {
        if (!cancelled) setLogs((res.data || []).filter((l) => l.action === "Connexion"));
      })
      .catch(() => {
        if (!cancelled) setError("Impossible de charger le journal des connexions.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isCompanyAdmin]);

  const q = search.trim().toLowerCase();
  const visible = logs.filter(
    (l) =>
      !q ||
      l.userName.toLowerCase().includes(q) ||
      (l.ip ?? "").toLowerCase().includes(q) ||
      (l.userAgent ?? "").toLowerCase().includes(q)
  );

  return (
    <div className="flex-1 bg-background min-h-screen flex flex-col">
      <TopBar activeUser={activeUser} searchValue={search} onSearchChange={setSearch} />
      <main className="p-4 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Globe size={22} className="text-secondary" />
          <h2 className="font-sans text-2xl font-semibold text-on-surface">Connexions</h2>
        </div>

        {!isCompanyAdmin ? (
          <p className="text-sm text-on-surface-variant">Accès réservé aux administrateurs.</p>
        ) : error ? (
          <p className="text-sm text-error bg-error-container/40 border border-error-container rounded-lg px-3 py-2">
            {error}
          </p>
        ) : loading ? (
          <p className="text-sm text-on-surface-variant">Chargement…</p>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant font-mono text-[10px] uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">Utilisateur</th>
                  <th className="px-4 py-3 font-semibold">Rôle</th>
                  <th className="px-4 py-3 font-semibold">Adresse IP</th>
                  <th className="px-4 py-3 font-semibold">Navigateur</th>
                  <th className="px-4 py-3 font-semibold">Date &amp; heure</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-on-surface-variant">
                      Aucune connexion.
                    </td>
                  </tr>
                ) : (
                  visible.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b border-outline-variant/60 last:border-0 hover:bg-surface-container-low"
                    >
                      <td className="px-4 py-3 font-medium text-on-surface whitespace-nowrap">{l.userName}</td>
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{l.userRole}</td>
                      <td className="px-4 py-3 font-mono text-on-surface whitespace-nowrap">{l.ip || "—"}</td>
                      <td
                        className="px-4 py-3 text-on-surface-variant max-w-[280px] truncate"
                        title={l.userAgent || ""}
                      >
                        {l.userAgent || "—"}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                        {new Date(l.timestamp).toLocaleString("fr-FR")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
