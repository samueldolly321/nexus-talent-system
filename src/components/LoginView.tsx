import React, { useState } from "react";
import { Mail, Lock, ArrowRight, Radar, TrendingUp, Users2, Sparkles, Target, MailWarning } from "lucide-react";

interface LoginViewProps {
  onLogin: (email: string, password: string) => void;
  loading: boolean;
  error?: string | null;
}

export default function LoginView({ onLogin, loading, error }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="w-screen h-screen flex bg-surface-container-lowest overflow-hidden">
      {/* Left: form */}
      <div className="w-full md:w-1/2 flex flex-col px-8 sm:px-16 py-10 overflow-y-auto">
        <div className="flex items-center gap-3 mb-16">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center shrink-0">
            <span className="font-mono text-on-primary text-xs font-bold">NT</span>
          </div>
          <div>
            <h1 className="font-sans font-bold text-lg text-on-surface leading-tight">Nexus Talent</h1>
            <p className="font-mono text-[10px] text-on-surface-variant tracking-widest uppercase">Espace Recruteur</p>
          </div>
        </div>

        <div className="max-w-sm w-full mx-auto md:mx-0 flex-1 flex flex-col justify-center">
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
                <a href="#" className="font-mono text-[10px] uppercase tracking-wider text-secondary font-semibold hover:underline">Mot de passe oublié ?</a>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary-container transition-all"
                />
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

          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="border border-outline-variant rounded-lg py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-low transition-all flex items-center justify-center gap-2">
              Google
            </button>
            <button type="button" className="border border-outline-variant rounded-lg py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-low transition-all flex items-center justify-center gap-2">
              SSO
            </button>
          </div>

          <p className="mt-6 text-center font-mono text-[10px] text-on-surface-variant bg-surface-container-low rounded-lg py-2 px-3">
            Démo : sarah.j@techcorp.io / password123
          </p>

          <a
            href="/postuler"
            className="mt-4 block text-center text-sm font-bold text-secondary hover:underline"
          >
            Vous êtes candidat ? Postulez ici →
          </a>
        </div>

        <div className="pt-8 mt-8 border-t border-outline-variant flex justify-between items-center max-w-sm w-full mx-auto md:mx-0">
          <p className="font-mono text-[10px] text-on-surface-variant">© 2026 Nexus Talent. v1.0.0</p>
          <div className="flex gap-4">
            <a href="#" className="font-mono text-[10px] text-on-surface-variant hover:text-secondary">Confidentialité</a>
            <a href="#" className="font-mono text-[10px] text-on-surface-variant hover:text-secondary">Support</a>
          </div>
        </div>
      </div>

      {/* Right: visual panel */}
      <div className="hidden md:flex md:w-1/2 bg-primary-container relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(76,215,246,0.25), transparent 40%), radial-gradient(circle at 80% 70%, rgba(76,215,246,0.2), transparent 40%)" }} />

        <div className="relative z-10 px-12 max-w-lg">
          <div className="relative h-56 mb-8 flex items-center justify-center">
            <div className="absolute w-44 h-44 rounded-full border border-secondary-fixed-dim/30" />
            <div className="absolute top-2 right-4 glass-ai rounded-xl px-4 py-2 flex items-center gap-2">
              <Target size={16} className="text-secondary-fixed-dim" />
              <span className="font-mono text-[10px] text-white font-bold">FIT MATCH</span>
            </div>
            <div className="absolute top-16 right-0 glass-ai rounded-xl px-4 py-2 flex items-center gap-2">
              <TrendingUp size={16} className="text-secondary-fixed-dim" />
              <span className="font-mono text-xs text-white font-bold">98% Fit</span>
            </div>
            <div className="w-20 h-20 rounded-full bg-secondary-fixed-dim/20 border border-secondary-fixed-dim/40 flex items-center justify-center">
              <Sparkles size={28} className="text-secondary-fixed-dim" />
            </div>
            <div className="absolute bottom-2 left-0 glass-ai rounded-xl px-4 py-2 flex items-center gap-2">
              <Users2 size={16} className="text-secondary-fixed-dim" />
              <span className="font-mono text-xs text-white font-bold">Synchro Pipeline</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-xl p-5">
              <div className="w-9 h-9 rounded-lg bg-secondary-fixed-dim/20 flex items-center justify-center mb-3">
                <Radar size={18} className="text-secondary-fixed-dim" />
              </div>
              <h3 className="font-sans font-semibold text-white mb-1.5">Sourcing prédictif</h3>
              <p className="text-xs text-inverse-on-surface/70 leading-relaxed">
                Notre IA presciente identifie les meilleurs candidats avant même leur arrivée sur le marché, grâce à une analyse comportementale multi-signaux.
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-5">
              <div className="w-9 h-9 rounded-lg bg-secondary-fixed-dim/20 flex items-center justify-center mb-3">
                <Target size={18} className="text-secondary-fixed-dim" />
              </div>
              <h3 className="font-sans font-semibold text-white mb-1.5">Matching haute-fidélité</h3>
              <p className="text-xs text-inverse-on-surface/70 leading-relaxed">
                Au-delà des mots-clés. Nous analysons les données psychographiques et l'adéquation des savoir-être pour une réussite durable de l'organisation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
