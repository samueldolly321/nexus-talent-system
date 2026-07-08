import { useEffect, useState } from "react";
import { ArrowLeft, Mail, Phone, MapPin, ChevronDown } from "lucide-react";

const appName = localStorage.getItem("nexus-app-name") || "Nexus Talent";
const appDomain = appName.toLowerCase().replace(/[^a-z0-9]/g, "") || "nexustalent";

const faq = [
  {
    q: "Comment postuler à une offre ?",
    a: "Rendez-vous sur la page /postuler, remplissez le formulaire et joignez votre CV en PDF.",
  },
  {
    q: "J'ai oublié mon mot de passe.",
    a: "Sur l'écran de connexion, cliquez sur « Mot de passe oublié ? », saisissez votre email professionnel et suivez le lien reçu par email pour en définir un nouveau.",
  },
  {
    q: "Comment modifier mon profil candidat ?",
    a: "Votre recruteur peut modifier votre profil depuis l'espace recruteur.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Oui, consultez notre politique de confidentialité.",
  },
];

export default function SupportView() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    document.title = `Support — ${appName}`;
  }, []);

  return (
    <div className="w-screen min-h-screen bg-background overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 sm:px-8 py-12">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-secondary hover:underline mb-8">
          <ArrowLeft size={16} /> Retour
        </a>

        <h1 className="font-sans text-3xl font-bold text-on-surface tracking-tight mb-1">Support &amp; Aide</h1>
        <p className="text-sm text-on-surface-variant mb-10">Comment pouvons-nous vous aider ?</p>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="font-sans text-lg font-semibold text-on-surface mb-4">Questions fréquentes</h2>
          <div className="space-y-2">
            {faq.map((item, i) => {
              const open = openIndex === i;
              return (
                <div key={item.q} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenIndex(open ? null : i)}
                    aria-expanded={open}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
                  >
                    {item.q}
                    <ChevronDown size={16} className={`shrink-0 text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && (
                    <p className="px-4 pb-4 text-sm text-on-surface-variant leading-relaxed">{item.a}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Contact */}
        <section className="mb-10">
          <h2 className="font-sans text-lg font-semibold text-on-surface mb-4">Contact</h2>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-sm text-on-surface">
              <Mail size={18} className="text-secondary shrink-0" />
              <a href={`mailto:support@${appDomain}.com`} className="hover:text-secondary hover:underline">support@{appDomain}.com</a>
            </div>
            <div className="flex items-center gap-3 text-sm text-on-surface-variant">
              <Phone size={18} className="text-secondary shrink-0" />
              <span>Disponible du lundi au vendredi, 9h-18h</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-on-surface-variant">
              <MapPin size={18} className="text-secondary shrink-0" />
              <span>Antananarivo, Madagascar</span>
            </div>
          </div>
        </section>

        {/* Documentation */}
        <section>
          <h2 className="font-sans text-lg font-semibold text-on-surface mb-4">Documentation rapide</h2>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 text-sm text-on-surface-variant leading-relaxed">
            <p>Consultez le Guide d'installation fourni avec votre déploiement.</p>
            <p className="mt-2">Pour toute question technique, contactez votre administrateur système.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
