/* Génère "Compte-Rendu-Nexus-2026-07-08.xlsx" : compte rendu de session
   multi-onglets, à relire demain pour reprendre le déploiement. */
const XLSX = require("xlsx");
const path = require("path");

const wb = XLSX.utils.book_new();

// Petit helper : crée une feuille à partir d'un tableau de lignes (array of arrays)
// et fixe des largeurs de colonnes lisibles.
function sheet(name, rows, widths) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  if (widths) ws["!cols"] = widths.map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, name);
}

// 1. Résumé
sheet("Résumé", [
  ["COMPTE RENDU — NEXUS TALENT"],
  ["Date", "2026-07-08"],
  ["But du document", "Reprendre demain le déploiement en ligne (Render + Neon)"],
  ["Point de reprise", "Étape 1 — Créer la base Neon (voir onglet Prochaines étapes)"],
  [""],
  ["Compte démo", "samuel@test.io / password123"],
  ["Dépôt GitHub", "https://github.com/samueldolly321/nexus-talent-system (privé)"],
  ["État Git", "Tout poussé (Everything up-to-date) — dernier commit 32ab150"],
  ["Plateformes visées", "Render (serveur Node) + Neon (PostgreSQL) — gratuit"],
], [22, 60]);

// 2. Travaux réalisés
sheet("Travaux réalisés", [
  ["Domaine", "Réalisation"],
  ["Login", "Formulaire en pleine largeur du bloc parent"],
  ["Login", "Panneau de droite enrichi (photo + cartes de stats / illustrations)"],
  ["Auth", "Mot de passe oublié : flux email complet via Resend + page /reset-password"],
  ["Auth", "Colonnes User.resetTokenHash / resetTokenExpiry (token SHA-256, exp. 1h)"],
  ["Auth", "Google OAuth + SSO OIDC (HTTP direct) — liaison de compte, gated par .env"],
  ["Auth", "Boutons Google/SSO désactivés 'Bientôt' tant que non configurés"],
  ["Base", "Migration Prisma add_password_reset_tokens appliquée"],
  ["Base", "Dump SQL : nexus_dump_2026-07-08_1603.sql (12 tables + données)"],
  ["Déploiement", "server.ts écoute sur process.env.PORT"],
  ["Déploiement", "render.yaml (blueprint Render) prêt"],
  ["Sécurité", "Token GitHub retiré de l'URL du remote (nettoyée + vérifiée)"],
  ["Git", "3 commits poussés (ce79028, 9a127aa, 32ab150)"],
], [16, 72]);

// 3. Prochaines étapes
sheet("Prochaines étapes", [
  ["Ordre", "Étape", "Statut", "Détail"],
  ["1", "Neon — créer la base", "À FAIRE (reprise)", "neon.tech > Create project > copier Connection string (postgresql://...?sslmode=require) = DATABASE_URL"],
  ["2", "Render — déployer", "À FAIRE", "render.com > New > Blueprint > choisir le dépôt (lit render.yaml) > coller DATABASE_URL > Apply"],
  ["3", "Renseigner FRONTEND_URL", "À FAIRE", "Copier l'URL Render > variable FRONTEND_URL > Save (redéploie). Sinon login refusé (CORS)"],
  ["4", "Tester", "À FAIRE", "Ouvrir l'URL > login samuel@test.io / password123"],
  ["-", "Révoquer ancien token GitHub", "À FAIRE", "GitHub > Settings > Developer settings > PAT > révoquer ghp_JLBr..."],
  ["-", "Activer Google / SSO", "Optionnel / plus tard", "Renseigner GOOGLE_* / SSO_* dans Render (voir Guide-Activer-Boutons-Login.docx)"],
], [7, 28, 20, 70]);

// 4. Points d'attention
sheet("Points d'attention", [
  ["Sujet", "À retenir"],
  ["FRONTEND_URL", "Doit correspondre EXACTEMENT à l'URL Render (https, sans / final) sinon login refusé (CORS)"],
  ["Build Render", "esbuild/prisma/tsx/vite en devDependencies -> build avec npm ci --include=dev (déjà dans render.yaml)"],
  ["Plan gratuit", "Le serveur s'endort après 15 min (réveil ~30-60s au 1er accès)"],
  ["Uploads", "Photos uploadées non persistantes (disque éphémère) ; autres données conservées dans Neon"],
  ["Migration Neon", "Si erreur de pooling, utiliser la connexion 'direct' de Neon pour DATABASE_URL"],
], [18, 78]);

// 5. Fichiers livrés
sheet("Fichiers livrés", [
  ["Fichier", "Rôle"],
  ["render.yaml", "Configuration de déploiement Render"],
  ["Guide-Deploiement-Gratuit-Render-Neon.docx", "Pas-à-pas déploiement Render + Neon"],
  ["Guide-Activer-Boutons-Login.docx", "Configurer Google / SSO / Resend"],
  ["Guide-Mise-A-Jour-Maison.docx", "Répliquer les changements sur une autre machine"],
  ["nexus_dump_2026-07-08_1603.sql", "Dump SQL de la base locale"],
  ["COMPTE-RENDU-2026-07-08.md", "Ce compte rendu, version Markdown"],
  ["src/components/ResetPasswordView.tsx", "Page publique de réinitialisation"],
], [46, 55]);

const outPath = path.join(process.cwd(), "Compte-Rendu-Nexus-2026-07-08.xlsx");
XLSX.writeFile(wb, outPath);
console.log("Écrit :", outPath);
