import { useEffect, useState } from "react";
import { Lock, ArrowLeft, CheckCircle2, Loader2, ShieldAlert, Eye, EyeOff } from "lucide-react";

const appName = localStorage.getItem("nexus-app-name") || "Nexus Talent";

// Page publique de définition d'un nouveau mot de passe. Le token provient du
// lien reçu par email (?token=...). Routée dans main.tsx sur /reset-password.
export default function ResetPasswordView() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = `Réinitialisation — ${appName}`;
    const t = new URLSearchParams(window.location.search).get("token");
    setToken(t);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Une erreur est survenue.");
      }
      setDone(true);
    } catch (err: any) {
      setError(err?.message || "Impossible de joindre le serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-secondary hover:underline mb-8">
          <ArrowLeft size={16} /> Retour à la connexion
        </a>

        <h1 className="font-sans text-2xl font-bold text-on-surface tracking-tight mb-1">Nouveau mot de passe</h1>
        <p className="text-sm text-on-surface-variant mb-8">Choisissez un mot de passe pour votre compte {appName}.</p>

        {!token ? (
          <div className="bg-error-container/40 border border-error-container rounded-xl p-5 flex gap-3">
            <ShieldAlert size={20} className="text-error shrink-0" />
            <div>
              <p className="text-sm font-semibold text-on-surface mb-1">Lien invalide</p>
              <p className="text-sm text-on-surface-variant">Le lien de réinitialisation est incomplet ou a expiré. Refaites une demande depuis l'écran de connexion.</p>
            </div>
          </div>
        ) : done ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-tertiary-container/60 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={26} className="text-secondary" />
            </div>
            <p className="text-sm font-semibold text-on-surface mb-1">Mot de passe mis à jour</p>
            <p className="text-sm text-on-surface-variant mb-6">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
            <a
              href="/"
              className="inline-block w-full bg-secondary text-white py-3 rounded-lg font-bold text-sm hover:brightness-110 transition-all"
            >
              Aller à la connexion
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5 font-semibold">Nouveau mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoFocus
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-3 pl-10 pr-11 text-sm focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary-container transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="mt-1.5 font-mono text-[10px] text-on-surface-variant">8 caractères minimum.</p>
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5 font-semibold">Confirmer le mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-3 pl-10 pr-11 text-sm focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary-container transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  aria-label={showConfirm ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  title={showConfirm ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-error bg-error-container/40 border border-error-container rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-secondary text-white py-3 rounded-lg font-bold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Enregistrement…" : "Réinitialiser le mot de passe"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
