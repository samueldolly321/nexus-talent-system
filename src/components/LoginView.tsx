import React, { useState, useEffect } from "react";
import { Mail, Lock, ArrowRight, Radar, TrendingUp, Users2, Sparkles, Target, BarChart3, Zap, CheckCircle2, X, Loader2, Eye, EyeOff } from "lucide-react";

interface LoginViewProps {
  onLogin: (email: string, password: string) => void;
  loading: boolean;
  error?: string | null;
}

// Nom de l'app mémorisé lors de la dernière session connectée (App le persiste).
const appName = localStorage.getItem("nexus-app-name") || "Nexus Talent";
const appInitials =
  appName.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "NT";

// Photo d'ambiance (autorisée par la CSP : imgSrc https:). Équipe RH en réunion.
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80";

export default function LoginView({ onLogin, loading, error }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  // Fournisseurs OAuth réellement configurés côté serveur.
  const [providers, setProviders] = useState<{ google: boolean }>({ google: false });

  // Identifiants du compte démo (administrables depuis Paramètres). Masqués si
  // l'admin a décoché « Afficher sur la page de connexion ». Le mot de passe
  // n'est PLUS exposé côté public : la page invite à « contacter Samuel ».
  const [demo, setDemo] = useState<{ visible: boolean; email?: string }>({ visible: false });

  // Modal "Mot de passe oublié".
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotDone, setForgotDone] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${appName} — Espace Recruteur`;
    fetch("/api/auth/providers")
      .then(r => (r.ok ? r.json() : null))
      .then(data => data && setProviders(data))
      .catch(() => {});
    fetch("/api/auth/demo")
      .then(r => (r.ok ? r.json() : null))
      .then(data => data && setDemo(data))
      .catch(() => {});
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  const openForgot = () => {
    setForgotEmail(email); // pré-remplit avec l'email déjà saisi
    setForgotDone(false);
    setForgotError(null);
    setShowForgot(true);
  };

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotLoading) return;
    setForgotLoading(true);
    setForgotError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Une erreur est survenue.");
      }
      setForgotDone(true);
    } catch (err: any) {
      setForgotError(err?.message || "Impossible de joindre le serveur.");
    } finally {
      setForgotLoading(false);
    }
  };

  const goToProvider = (path: string) => {
    // Redirection navigateur complète : le serveur démarre le flux OAuth.
    window.location.href = path;
  };

  return (
    <div className="w-screen h-screen flex bg-surface-container-lowest overflow-hidden">
      {/* Left: form */}
      <div className="w-full md:w-1/2 flex flex-col px-8 sm:px-16 py-10 overflow-y-auto">
        <div className="flex items-center gap-3 mb-16">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center shrink-0">
            <span className="font-mono text-on-primary text-xs font-bold">{appInitials}</span>
          </div>
          <div>
            <h1 className="font-sans font-bold text-lg text-on-surface leading-tight">{appName}</h1>
            <p className="font-mono text-[10px] text-on-surface-variant tracking-widest uppercase">Espace Recruteur</p>
          </div>
        </div>

        <div className="w-full flex-1 flex flex-col justify-center">
          <h2 className="font-sans text-[32px] font-semibold text-on-surface tracking-tight mb-2">Bon retour</h2>
          <p className="text-on-surface-variant mb-8">Accédez à vos insights de recrutement prédictifs.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5 font-semibold">Email professionnel</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary-container transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">Mot de passe</label>
                <button
                  type="button"
                  onClick={openForgot}
                  className="font-mono text-[10px] uppercase tracking-wider text-secondary font-semibold hover:underline"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
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
            </div>

            <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer select-none">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="rounded border-outline-variant text-secondary focus:ring-secondary" />
              Se souvenir de cet appareil pendant 30 jours
            </label>

            {error && (
              <p className="text-sm text-error bg-error-container/40 border border-error-container rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-secondary text-white py-3 rounded-lg font-bold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? "Connexion..." : "Se connecter"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="flex items-center gap-3 my-8">
            <div className="flex-1 h-px bg-outline-variant" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">Ou se connecter avec</span>
            <div className="flex-1 h-px bg-outline-variant" />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <ProviderButton
              label="Google"
              enabled={providers.google}
              onClick={() => goToProvider("/api/auth/google")}
              icon={<GoogleIcon />}
            />
          </div>

          {demo.visible && demo.email && (
            <p className="mt-6 text-center font-mono text-[10px] text-on-surface-variant bg-surface-container-low rounded-lg py-2 px-3">
              Démo : {demo.email} — mot de passe : contactez Samuel
            </p>
          )}

          <a
            href="/postuler"
            className="mt-4 block text-center text-sm font-bold text-secondary hover:underline"
          >
            Vous êtes candidat ? Postulez ici →
          </a>
        </div>

        <div className="pt-8 mt-8 border-t border-outline-variant flex justify-between items-center w-full">
          <p className="font-mono text-[10px] text-on-surface-variant">© {new Date().getFullYear()} {appName}. v1.0.0</p>
          <div className="flex gap-4">
            <a href="/confidentialite" className="font-mono text-[10px] text-on-surface-variant hover:text-secondary">Confidentialité</a>
            <a href="/support" className="font-mono text-[10px] text-on-surface-variant hover:text-secondary">Support</a>
          </div>
        </div>
      </div>

      {/* Right: visual panel — photo d'ambiance + cartes de données superposées */}
      <div className="hidden md:flex md:w-1/2 bg-primary-container relative overflow-hidden items-center justify-center">
        {/* Photo de fond */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        />
        {/* Voile dégradé pour la lisibilité + teinte de marque */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-primary-container/80" />
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(76,215,246,0.35), transparent 45%), radial-gradient(circle at 80% 75%, rgba(76,215,246,0.25), transparent 45%)" }} />

        <div className="relative z-10 px-12 max-w-lg w-full">
          {/* En-tête accroche */}
          <div className="mb-8">
            <span className="inline-flex items-center gap-2 glass-ai rounded-full px-3 py-1 mb-4">
              <Sparkles size={13} className="text-secondary-fixed-dim" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-white font-bold">Recrutement augmenté par l'IA</span>
            </span>
            <h2 className="font-sans text-3xl font-bold text-white leading-tight">
              Recrutez plus vite,<br />avec plus de justesse.
            </h2>
          </div>

          {/* Bloc central : orbite + cartes flottantes (illustrations vectorielles) */}
          <div className="relative h-52 mb-8 flex items-center justify-center">
            <div className="absolute w-44 h-44 rounded-full border border-secondary-fixed-dim/30 animate-pulse" />
            <div className="absolute w-64 h-64 rounded-full border border-secondary-fixed-dim/15" />
            <div className="absolute top-0 right-2 glass-ai rounded-xl px-4 py-2 flex items-center gap-2">
              <Target size={16} className="text-secondary-fixed-dim" />
              <span className="font-mono text-[10px] text-white font-bold">FIT MATCH</span>
            </div>
            <div className="absolute top-16 right-0 glass-ai rounded-xl px-4 py-2 flex items-center gap-2">
              <TrendingUp size={16} className="text-secondary-fixed-dim" />
              <span className="font-mono text-xs text-white font-bold">98% Fit</span>
            </div>
            <div className="w-20 h-20 rounded-full bg-secondary-fixed-dim/25 border border-secondary-fixed-dim/50 flex items-center justify-center backdrop-blur-sm">
              <Sparkles size={28} className="text-secondary-fixed-dim" />
            </div>
            <div className="absolute bottom-2 left-0 glass-ai rounded-xl px-4 py-2 flex items-center gap-2">
              <Users2 size={16} className="text-secondary-fixed-dim" />
              <span className="font-mono text-xs text-white font-bold">Synchro Pipeline</span>
            </div>
            <div className="absolute bottom-14 right-6 glass-ai rounded-xl px-3 py-1.5 flex items-center gap-2">
              <Zap size={14} className="text-secondary-fixed-dim" />
              <span className="font-mono text-[10px] text-white font-bold">-60% de délai</span>
            </div>
          </div>

          {/* Bandeau de statistiques */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: <BarChart3 size={16} className="text-secondary-fixed-dim" />, value: "12k+", label: "CV analysés" },
              { icon: <Target size={16} className="text-secondary-fixed-dim" />, value: "98%", label: "Précision fit" },
              { icon: <Zap size={16} className="text-secondary-fixed-dim" />, value: "3×", label: "Plus rapide" },
            ].map((s, i) => (
              <div key={i} className="glass-ai rounded-xl p-3 text-center">
                <div className="flex justify-center mb-1.5">{s.icon}</div>
                <div className="font-sans font-bold text-white text-lg leading-none">{s.value}</div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-inverse-on-surface/70 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Cartes fonctionnalités */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
              <div className="w-9 h-9 rounded-lg bg-secondary-fixed-dim/20 flex items-center justify-center mb-3">
                <Radar size={18} className="text-secondary-fixed-dim" />
              </div>
              <h3 className="font-sans font-semibold text-white mb-1.5">Sourcing prédictif</h3>
              <p className="text-xs text-inverse-on-surface/70 leading-relaxed">
                Notre IA identifie les meilleurs candidats grâce à une analyse comportementale multi-signaux.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
              <div className="w-9 h-9 rounded-lg bg-secondary-fixed-dim/20 flex items-center justify-center mb-3">
                <Target size={18} className="text-secondary-fixed-dim" />
              </div>
              <h3 className="font-sans font-semibold text-white mb-1.5">Matching haute-fidélité</h3>
              <p className="text-xs text-inverse-on-surface/70 leading-relaxed">
                Au-delà des mots-clés : adéquation des savoir-être pour une réussite durable.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal "Mot de passe oublié" */}
      {showForgot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !forgotLoading && setShowForgot(false)}
        >
          <div
            className="w-full max-w-md bg-surface-container-lowest rounded-xl p-6 shadow-[0px_10px_25px_rgba(15,23,42,0.15)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sans text-lg font-semibold text-on-surface">Mot de passe oublié</h3>
              <button
                type="button"
                onClick={() => !forgotLoading && setShowForgot(false)}
                className="text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-40"
                disabled={forgotLoading}
              >
                <X size={20} />
              </button>
            </div>

            {forgotDone ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-tertiary-container/60 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={26} className="text-secondary" />
                </div>
                <p className="text-sm text-on-surface mb-1 font-semibold">Vérifiez votre boîte mail</p>
                <p className="text-sm text-on-surface-variant">
                  Si un compte est associé à <strong>{forgotEmail}</strong>, un lien de réinitialisation vient d'être envoyé. Il expire dans 1 heure.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="mt-5 w-full bg-secondary text-white py-2.5 rounded-lg font-bold text-sm hover:brightness-110 transition-all"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={submitForgot} className="space-y-4">
                <p className="text-sm text-on-surface-variant">
                  Saisissez votre email professionnel. Nous vous enverrons un lien pour définir un nouveau mot de passe.
                </p>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="email"
                    required
                    autoFocus
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary-container transition-all"
                  />
                </div>
                {forgotError && (
                  <p className="text-sm text-error bg-error-container/40 border border-error-container rounded-lg px-3 py-2">{forgotError}</p>
                )}
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-secondary text-white py-3 rounded-lg font-bold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {forgotLoading && <Loader2 size={16} className="animate-spin" />}
                  {forgotLoading ? "Envoi…" : "Envoyer le lien"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Bouton fournisseur (Google / SSO). Désactivé et étiqueté "Bientôt" tant que le
// serveur ne renvoie pas ce fournisseur comme configuré.
function ProviderButton({ label, enabled, onClick, icon }: { label: string; enabled: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={enabled ? onClick : undefined}
      disabled={!enabled}
      title={enabled ? `Se connecter avec ${label}` : `${label} — bientôt disponible (non configuré)`}
      className={`relative border rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-all ${
        enabled
          ? "border-outline-variant text-on-surface hover:bg-surface-container-low cursor-pointer"
          : "border-outline-variant/60 text-on-surface-variant/50 cursor-not-allowed"
      }`}
    >
      <span className={enabled ? "" : "opacity-40"}>{icon}</span>
      {label}
      {!enabled && (
        <span className="absolute -top-2 -right-2 bg-surface-container-high text-on-surface-variant font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-outline-variant">
          Bientôt
        </span>
      )}
    </button>
  );
}

// Logo Google multicolore (SVG inline, pas de dépendance).
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}
