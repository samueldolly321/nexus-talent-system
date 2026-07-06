import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";

const appName = localStorage.getItem("nexus-app-name") || "Nexus Talent";
// Slug pour un domaine d'email valide (le nom peut contenir des espaces/accents).
const appDomain = appName.toLowerCase().replace(/[^a-z0-9]/g, "") || "nexustalent";
const lastUpdate = new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });

const sections = [
  {
    title: "1. Collecte des données",
    body: "Nous collectons les informations que vous nous fournissez directement : nom, email, téléphone, CV, lettre de motivation.",
  },
  {
    title: "2. Utilisation des données",
    body: "Vos données sont utilisées uniquement dans le cadre du processus de recrutement par les entreprises utilisant notre plateforme.",
  },
  {
    title: "3. Conservation",
    body: "Les données sont conservées pendant la durée du processus de recrutement, et au maximum 2 ans après votre dernière activité.",
  },
  {
    title: "4. Vos droits",
    body: `Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Contactez-nous à privacy@${appDomain}.com`,
  },
  {
    title: "5. Sécurité",
    body: "Vos données sont protégées par chiffrement SSL/TLS et stockées sur des serveurs sécurisés.",
  },
];

export default function PrivacyView() {
  useEffect(() => {
    document.title = `Confidentialité — ${appName}`;
  }, []);

  return (
    <div className="w-screen min-h-screen bg-background overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 sm:px-8 py-12">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-secondary hover:underline mb-8">
          <ArrowLeft size={16} /> Retour
        </a>

        <h1 className="font-sans text-3xl font-bold text-on-surface tracking-tight mb-1">Politique de Confidentialité</h1>
        <p className="text-sm text-on-surface-variant mb-10">{appName} — Dernière mise à jour : {lastUpdate}</p>

        <div className="space-y-8">
          {sections.map(s => (
            <section key={s.title}>
              <h2 className="font-sans text-lg font-semibold text-on-surface mb-2">{s.title}</h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
