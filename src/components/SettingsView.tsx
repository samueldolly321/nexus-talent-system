import React, { useState, useEffect } from "react";
import { User as UserIcon, Building2, Lock, Loader2, ShieldCheck, KeyRound, Eye, EyeOff } from "lucide-react";
import TopBar from "./TopBar";
import { Company, User, UserRole, PermissionsData, DemoCredentialData, roleKeyOf } from "../types";
import { apiFetch } from "../lib/api";

interface SettingsViewProps {
  activeUser: User | null;
  activeCompany: Company | null;
  onCompanyUpdated?: (company: Company) => void;
  // Droit effectif du rôle courant (piloté par la matrice).
  can: (action: string) => boolean;
  // Grille "Rôles & permissions" (globale) + remontée après sauvegarde.
  permissions: PermissionsData | null;
  onPermissionsUpdated: (data: PermissionsData) => void;
}

const LABEL_CLS = "block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold mb-1.5";
const INPUT_CLS =
  "w-full bg-surface-container-lowest border border-outline-variant rounded-[8px] px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all";

// Clé du Super admin : colonne omnipotente, toujours cochée et non éditable.
const SUPER_ADMIN_KEY = "AdminPlateforme";

// Copie profonde (1 niveau de rôles) de la matrice, pour un brouillon éditable.
const cloneMatrix = (m: Record<string, Record<string, boolean>>) =>
  Object.fromEntries(Object.entries(m).map(([action, roles]) => [action, { ...roles }]));

export default function SettingsView({
  activeUser,
  activeCompany,
  onCompanyUpdated,
  can,
  permissions,
  onPermissionsUpdated,
}: SettingsViewProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Édition société : pilotée par la grille (action "edit_company").
  const canEditCompany = can("edit_company");
  // Éditeur de permissions : réservé en DUR aux Super admin / Admin (miroir de
  // isCompanyAdmin côté serveur) → un admin ne peut jamais se verrouiller dehors.
  const isAdmin =
    activeUser?.role === UserRole.AdminPlateforme || activeUser?.role === UserRole.AdminEntreprise;
  // Clé Prisma du rôle courant (pour surligner sa colonne dans la grille).
  const currentRoleKey = roleKeyOf(activeUser?.role);
  // Affiche la grille des permissions → bascule en 2 colonnes (grille à droite).
  const showPerms = isAdmin && !!permissions;
  const [companyName, setCompanyName] = useState(activeCompany?.name ?? "");
  const [appName, setAppName] = useState(activeCompany?.appName ?? "Nexus Talent");
  const [companySaving, setCompanySaving] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companySuccess, setCompanySuccess] = useState<string | null>(null);

  // Synchronise les champs quand la société change (chargement post-login).
  useEffect(() => {
    setCompanyName(activeCompany?.name ?? "");
    setAppName(activeCompany?.appName ?? "Nexus Talent");
  }, [activeCompany?.id, activeCompany?.name, activeCompany?.appName]);

  // Brouillon éditable de la grille de permissions (copie de la matrice reçue).
  const [permDraft, setPermDraft] = useState<Record<string, Record<string, boolean>>>({});
  const [permSaving, setPermSaving] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);
  const [permSuccess, setPermSuccess] = useState<string | null>(null);

  // Compte de démonstration — administrable par les Super admin / Admin (isAdmin).
  const [demoEmail, setDemoEmail] = useState("");
  const [demoPassword, setDemoPassword] = useState("");
  const [showDemoPassword, setShowDemoPassword] = useState(false);
  const [demoVisible, setDemoVisible] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoSaving, setDemoSaving] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoSuccess, setDemoSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (permissions) setPermDraft(cloneMatrix(permissions.matrix));
  }, [permissions]);

  // Charge les identifiants démo à l'ouverture (admin uniquement).
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setDemoLoading(true);
    apiFetch("/api/demo-credential")
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((d: DemoCredentialData) => {
        if (cancelled) return;
        setDemoEmail(d.email ?? "");
        setDemoPassword(d.password ?? "");
        setDemoVisible(d.visible ?? true);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setDemoLoading(false); });
    return () => { cancelled = true; };
  }, [isAdmin]);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (demoSaving) return;
    setDemoError(null);
    setDemoSuccess(null);
    if (!demoEmail.trim()) { setDemoError("L'email de démo est requis."); return; }
    if (demoPassword.length < 6) { setDemoError("Le mot de passe démo doit contenir au moins 6 caractères."); return; }
    setDemoSaving(true);
    try {
      const res = await apiFetch("/api/demo-credential", {
        method: "PUT",
        body: JSON.stringify({ email: demoEmail.trim(), password: demoPassword, visible: demoVisible }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Échec de la mise à jour.");
      setDemoEmail(data.email ?? demoEmail);
      setDemoPassword(data.password ?? demoPassword);
      setDemoVisible(data.visible ?? demoVisible);
      setDemoSuccess("Compte de démonstration mis à jour.");
    } catch (err: any) {
      setDemoError(err?.message || "Une erreur est survenue.");
    } finally {
      setDemoSaving(false);
    }
  };

  const toggleCell = (action: string, roleKey: string) => {
    setPermSuccess(null);
    setPermDraft(prev => ({
      ...prev,
      [action]: { ...prev[action], [roleKey]: !prev[action]?.[roleKey] },
    }));
  };

  // Y a-t-il une modification non enregistrée ? (hors colonne Super admin, verrouillée)
  const permDirty = !!permissions && permissions.actions.some(a =>
    permissions.roles.some(r =>
      r.key !== SUPER_ADMIN_KEY &&
      (permDraft[a.key]?.[r.key] ?? false) !== (permissions.matrix[a.key]?.[r.key] ?? false)
    )
  );

  const handleSavePermissions = async () => {
    if (permSaving || !permissions) return;
    setPermError(null);
    setPermSuccess(null);
    setPermSaving(true);
    try {
      // N'envoie que les cases MODIFIÉES (hors Super admin) → transaction serveur
      // minimale (robuste au réveil à froid Neon). Les cases inchangées gardent
      // leur valeur en base (upsert ciblé côté serveur).
      const updates: { action: string; role: string; allowed: boolean }[] = [];
      for (const a of permissions.actions) {
        for (const r of permissions.roles) {
          if (r.key === SUPER_ADMIN_KEY) continue; // omnipotent, non éditable
          const next = !!permDraft[a.key]?.[r.key];
          const prev = !!permissions.matrix[a.key]?.[r.key];
          if (next !== prev) updates.push({ action: a.key, role: r.key, allowed: next });
        }
      }
      const res = await apiFetch("/api/permissions", { method: "PUT", body: JSON.stringify({ updates }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Échec de la mise à jour.");
      setPermSuccess("Permissions mises à jour.");
      onPermissionsUpdated({ ...permissions, matrix: data.matrix });
    } catch (err: any) {
      setPermError(err?.message || "Une erreur est survenue.");
    } finally {
      setPermSaving(false);
    }
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (companySaving || !activeCompany) return;
    setCompanyError(null);
    setCompanySuccess(null);
    if (!companyName.trim()) {
      setCompanyError("Le nom de la société est requis.");
      return;
    }
    setCompanySaving(true);
    try {
      const res = await apiFetch(`/api/companies/${activeCompany.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: companyName.trim(), appName: appName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Échec de la mise à jour.");
      setCompanySuccess("Paramètres de la société mis à jour.");
      onCompanyUpdated?.(data);
    } catch (err: any) {
      setCompanyError(err?.message || "Une erreur est survenue.");
    } finally {
      setCompanySaving(false);
    }
  };

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
    <div className="flex-1 bg-transparent min-h-screen flex flex-col">
      <TopBar activeUser={activeUser} />
      <main className={`p-4 md:p-8 w-full ${showPerms ? "max-w-6xl" : "max-w-2xl"}`}>
        <h2 className="font-sans text-2xl font-semibold text-on-surface mb-6">Paramètres</h2>

        {/* Sur grand écran, quand la grille des permissions est visible, on
            passe en 2 colonnes : profil / sécurité / entreprise à gauche, et
            la grille « Rôles & permissions » à DROITE (plutôt qu'empilée en bas). */}
        <div className={showPerms ? "grid grid-cols-1 lg:grid-cols-2 gap-6 items-start" : ""}>
          <div className="space-y-6">

        {/* Mon profil (lecture seule) */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
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
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
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
          {canEditCompany ? (
            <form onSubmit={handleCompanySubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="company-name" className={LABEL_CLS}>Nom de la société</label>
                  <input id="company-name" type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className={INPUT_CLS} placeholder="Ma société" />
                </div>
                <div>
                  <label htmlFor="app-name" className={LABEL_CLS}>Nom de l'application</label>
                  <input id="app-name" type="text" value={appName} onChange={e => setAppName(e.target.value)} className={INPUT_CLS} placeholder="Nexus Talent" />
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>Domaine</label>
                <p className="text-sm text-on-surface-variant font-medium">{activeCompany?.domain || "—"}</p>
              </div>
              {companyError && <p className="text-error text-sm">{companyError}</p>}
              {companySuccess && <p className="text-secondary text-sm font-medium">{companySuccess}</p>}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={companySaving}
                  className="h-10 px-4 bg-accent hover:bg-accent-dark text-white rounded-[8px] text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {companySaving && <Loader2 size={16} className="animate-spin" />}
                  {companySaving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Nom de la société</label>
                <p className="text-sm text-on-surface font-medium">{activeCompany?.name || "—"}</p>
              </div>
              <div>
                <label className={LABEL_CLS}>Nom de l'application</label>
                <p className="text-sm text-on-surface font-medium">{activeCompany?.appName || "Nexus Talent"}</p>
              </div>
              <div>
                <label className={LABEL_CLS}>Domaine</label>
                <p className="text-sm text-on-surface font-medium">{activeCompany?.domain || "—"}</p>
              </div>
            </div>
          )}
        </section>

        {/* Compte de démonstration — réservé aux Super admin / Admin (isAdmin).
            Modifier ces identifiants change le VRAI compte démo (email + mot de
            passe) et le texte affiché sur la page de connexion. */}
        {isAdmin && (
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound size={18} className="text-secondary shrink-0" />
              <h3 className="font-bold text-on-surface font-sans text-sm">Compte de démonstration</h3>
            </div>
            <p className="text-xs text-on-surface-variant mb-4">
              Identifiants affichés sur la page de connexion. Les modifier change le
              <strong> vrai compte démo</strong> (email et mot de passe) et le texte du login.
            </p>
            {demoLoading ? (
              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                <Loader2 size={16} className="animate-spin" /> Chargement…
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="demo-email" className={LABEL_CLS}>Email de démo</label>
                    <input id="demo-email" type="email" autoComplete="off" value={demoEmail} onChange={e => setDemoEmail(e.target.value)} className={INPUT_CLS} placeholder="demo@exemple.com" />
                  </div>
                  <div>
                    <label htmlFor="demo-pass" className={LABEL_CLS}>Mot de passe de démo</label>
                    <div className="relative">
                      <input id="demo-pass" type={showDemoPassword ? "text" : "password"} autoComplete="off" value={demoPassword} onChange={e => setDemoPassword(e.target.value)} className={`${INPUT_CLS} pr-10`} placeholder="au moins 6 caractères" />
                      <button
                        type="button"
                        onClick={() => setShowDemoPassword(v => !v)}
                        aria-label={showDemoPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        title={showDemoPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                      >
                        {showDemoPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer select-none">
                  <input type="checkbox" checked={demoVisible} onChange={e => setDemoVisible(e.target.checked)} className="h-4 w-4 accent-secondary" />
                  Afficher ces identifiants sur la page de connexion
                </label>
                {demoError && <p className="text-error text-sm">{demoError}</p>}
                {demoSuccess && <p className="text-secondary text-sm font-medium">{demoSuccess}</p>}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={demoSaving}
                    className="h-10 px-4 bg-accent hover:bg-accent-dark text-white rounded-[8px] text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {demoSaving && <Loader2 size={16} className="animate-spin" />}
                    {demoSaving ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}
          </div>{/* fin colonne gauche */}

        {/* Grille "Rôles & permissions" — ÉDITABLE (colonne de droite sur grand
            écran), réservée aux Super admin / Admin (isAdmin, codé en dur → pas
            de verrouillage). La colonne Super admin est toujours cochée. */}
        {showPerms && (
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={18} className="text-secondary shrink-0" />
              <h3 className="font-bold text-on-surface font-sans text-sm">Rôles &amp; permissions</h3>
            </div>
            <p className="text-xs text-on-surface-variant mb-4">
              Cochez les actions autorisées pour chaque rôle, puis enregistrez. Les droits
              s'appliquent immédiatement (navigation et actions serveur). La grille est
              <strong> globale</strong> : elle vaut pour toute la plateforme. Le Super admin
              conserve tous les droits.
            </p>
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="text-left font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold py-2 pr-3">
                      Action
                    </th>
                    {permissions.roles.map(r => (
                      <th
                        key={r.key}
                        className={`text-center font-mono text-[10px] uppercase tracking-wider font-semibold py-2 px-2 whitespace-nowrap ${
                          currentRoleKey === r.key ? "text-secondary" : "text-on-surface-variant"
                        }`}
                      >
                        {r.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissions.actions.map(a => (
                    <tr key={a.key} className="border-b border-outline-variant/60 last:border-0">
                      <td className="py-2 pr-3 text-xs text-on-surface font-medium">{a.label}</td>
                      {permissions.roles.map(r => {
                        const locked = r.key === SUPER_ADMIN_KEY; // Super admin : omnipotent
                        const checked = locked ? true : !!permDraft[a.key]?.[r.key];
                        return (
                          <td key={r.key} className="text-center py-2 px-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={locked}
                              onChange={() => toggleCell(a.key, r.key)}
                              aria-label={`${a.label} — ${r.label}`}
                              className="h-4 w-4 accent-secondary cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {permError && <p className="text-error text-sm mt-4">{permError}</p>}
            {permSuccess && <p className="text-secondary text-sm font-medium mt-4">{permSuccess}</p>}
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={permSaving || !permDirty}
                className="h-10 px-4 bg-accent hover:bg-accent-dark text-white rounded-[8px] text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {permSaving && <Loader2 size={16} className="animate-spin" />}
                {permSaving ? "Enregistrement…" : "Enregistrer les permissions"}
              </button>
            </div>
          </section>
        )}
        </div>{/* fin grille 2 colonnes */}
      </main>
    </div>
  );
}
