import React, { useState } from "react";
import { User as UserIcon, Building2, Lock, Loader2 } from "lucide-react";
import TopBar from "./TopBar";
import { Company, User } from "../types";
import { apiFetch } from "../lib/api";

interface SettingsViewProps {
  activeUser: User | null;
  activeCompany: Company | null;
}

const LABEL_CLS = "block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold mb-1.5";
const INPUT_CLS =
  "w-full bg-surface-container-lowest border border-outline-variant rounded-[8px] px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all";

export default function SettingsView({ activeUser, activeCompany }: SettingsViewProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword) {
      setError("Merci de renseigner le mot de passe actuel et le nouveau.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }
    if (!activeUser) {
      setError("Utilisateur inconnu.");
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch(`/api/users/${activeUser.id}/password`, {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Échec de la mise à jour.");
      setSuccess("Mot de passe mis à jour.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err?.message || "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 bg-background min-h-screen flex flex-col">
      <TopBar activeUser={activeUser} />
      <main className="p-4 md:p-8 max-w-2xl w-full">
        <h2 className="font-sans text-2xl font-semibold text-on-surface mb-6">Paramètres</h2>

        {/* Mon profil (lecture seule) */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <UserIcon size={18} className="text-secondary shrink-0" />
            <h3 className="font-bold text-on-surface font-sans text-sm">Mon profil</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Nom</label>
              <p className="text-sm text-on-surface font-medium">{activeUser?.name || "—"}</p>
            </div>
            <div>
              <label className={LABEL_CLS}>Email</label>
              <p className="text-sm text-on-surface font-medium break-words">{activeUser?.email || "—"}</p>
            </div>
            <div>
              <label className={LABEL_CLS}>Rôle</label>
              <p className="text-sm text-on-surface font-medium">{activeUser?.role || "—"}</p>
            </div>
          </div>
        </section>

        {/* Sécurité — changer le mot de passe */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={18} className="text-secondary shrink-0" />
            <h3 className="font-bold text-on-surface font-sans text-sm">Sécurité — Changer le mot de passe</h3>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="cur-pass" className={LABEL_CLS}>Mot de passe actuel</label>
              <input id="cur-pass" type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={INPUT_CLS} placeholder="••••••••" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="new-pass" className={LABEL_CLS}>Nouveau mot de passe</label>
                <input id="new-pass" type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={INPUT_CLS} placeholder="••••••••" />
              </div>
              <div>
                <label htmlFor="conf-pass" className={LABEL_CLS}>Confirmation</label>
                <input id="conf-pass" type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={INPUT_CLS} placeholder="••••••••" />
              </div>
            </div>
            {error && <p className="text-error text-sm">{error}</p>}
            {success && <p className="text-secondary text-sm font-medium">{success}</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="h-10 px-4 bg-accent hover:bg-accent-dark text-white rounded-[8px] text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? "Mise à jour…" : "Mettre à jour"}
              </button>
            </div>
          </form>
        </section>

        {/* Entreprise (lecture seule) */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} className="text-secondary shrink-0" />
            <h3 className="font-bold text-on-surface font-sans text-sm">Entreprise</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Nom</label>
              <p className="text-sm text-on-surface font-medium">{activeCompany?.name || "—"}</p>
            </div>
            <div>
              <label className={LABEL_CLS}>Domaine</label>
              <p className="text-sm text-on-surface font-medium">{activeCompany?.domain || "—"}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
