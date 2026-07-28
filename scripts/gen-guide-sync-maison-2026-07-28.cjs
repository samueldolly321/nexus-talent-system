/* Génère "Guide-Sync-Maison-2026-07-28.docx" : comment récupérer chez soi les
   changements de la session du 28/07/2026 (compte démo administrable depuis
   Paramètres + image de fond « filigrane » sur les onglets).
   Point clé : cette session AJOUTE une migration de base (table DemoCredential)
   → il faut lancer les commandes Prisma (partie 3). Aucune nouvelle dépendance. */
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function run(r) {
  const t = typeof r === "string" ? { t: r } : r;
  const rpr = [];
  if (t.b) rpr.push("<w:b/>");
  if (t.code) rpr.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:shd w:val="clear" w:fill="EEF2F7"/>');
  const rprXml = rpr.length ? `<w:rPr>${rpr.join("")}</w:rPr>` : "";
  return `<w:r>${rprXml}<w:t xml:space="preserve">${esc(t.t)}</w:t></w:r>`;
}
function para(styleId, runs) {
  const arr = Array.isArray(runs) ? runs : [runs];
  const pPr = styleId ? `<w:pPr><w:pStyle w:val="${styleId}"/></w:pPr>` : "";
  return `<w:p>${pPr}${arr.map(run).join("")}</w:p>`;
}
const title = (t) => para("Title", t);
const h1 = (t) => para("Heading1", t);
const h2 = (t) => para("Heading2", t);
const p = (r) => para("Body", r);
const bullet = (r) => para("Bullet", r);
const code = (t) => para("Code", { t, code: true });
const spacer = () => para("Body", "");

const b = [];
b.push(title("Guide — Synchroniser la mise à jour du 28/07 vers le dossier maison"));
b.push(p([{ t: "Comment récupérer chez vous les changements du 28/07 et les commandes à lancer. Généré le " }, { t: new Date().toLocaleDateString("fr-FR") }, { t: "." }]));
b.push(p([{ t: "En bref : ", b: true }, { t: "récupérez le code (partie 2), lancez les commandes (partie 3), puis vérifiez (partie 6). Les parties 4 et 5 détaillent chaque nouveauté." }]));
b.push(p([{ t: "Le point qui change : ", b: true }, { t: "cette mise à jour AJOUTE une petite migration de base (nouvelle table du compte de démonstration). Il y a donc des commandes Prisma à lancer (partie 3). En revanche, AUCUNE nouvelle dépendance npm." }]));
b.push(spacer());

// 1. Vue d'ensemble
b.push(h1("1. Vue d'ensemble — ce qui a changé"));
b.push(bullet([{ t: "Compte de démonstration administrable : ", b: true }, { t: "dans « Paramètres », le Super admin et l'Admin peuvent désormais modifier l'email ET le mot de passe du compte de démonstration. Cela change le vrai compte (la connexion réelle) et le texte affiché sur la page de connexion. Une case permet aussi de masquer ces identifiants sur le login." }]));
b.push(bullet([{ t: "Image de fond (filigrane) sur les onglets : ", b: true }, { t: "une image discrète apparaît en filigrane derrière le contenu (tableau de bord et autres onglets), en mode clair comme sombre. Les cartes restent opaques : la lisibilité est intacte. Le filigrane reste continu quand on fait défiler la page." }]));
b.push(bullet([{ t: "Prod déjà à jour : ", b: true }, { t: "les deux nouveautés sont poussées et déployées automatiquement sur Render (la migration y est déjà appliquée et les identifiants démo par défaut posés). Rien à faire côté site en ligne." }]));
b.push(spacer());

// 2. Récupérer le code
b.push(h1("2. Récupérer le code chez vous"));
b.push(h2("Méthode recommandée — git pull (le plus simple)"));
b.push(p([{ t: "Si votre dossier maison est un clone Git du dépôt, une seule commande récupère TOUT (code + migration + docs). Dans un terminal ouvert DANS le dossier du projet :" }]));
b.push(code("git status"));
b.push(p([{ t: "Vérifiez qu'il n'y a pas de modifications locales non enregistrées. Si tout est propre :" }]));
b.push(code("git pull origin main"));
b.push(p([{ t: "En cas de modifications locales gênantes : " }, { t: "git stash", code: true }, { t: " puis " }, { t: "git pull origin main", code: true }, { t: " (et " }, { t: "git stash pop", code: true }, { t: " pour les récupérer)." }]));
b.push(h2("Méthode alternative — copie manuelle (liste des fichiers)"));
b.push(p([{ t: "Si vous copiez à la main, reportez ces fichiers en respectant l'arborescence." }]));
b.push(code("server.ts"));
b.push(code("src/App.tsx"));
b.push(code("src/types.ts"));
b.push(code("src/components/LoginView.tsx"));
b.push(code("src/components/SettingsView.tsx"));
b.push(p([{ t: "Les 13 autres vues passées en fond transparent (filigrane) :", b: true }]));
b.push(code("src/components/DashboardView.tsx, JobsView.tsx, CandidatesView.tsx, CandidateProfileView.tsx,"));
b.push(code("ReportsView.tsx, ConnectionsView.tsx, RecommendationView.tsx, CalendarView.tsx,"));
b.push(code("PipelineView.tsx, ArchivedJobsView.tsx, EmailInboxView.tsx, DevCenterView.tsx, AiSearchView.tsx"));
b.push(p([{ t: "Base de données (INDISPENSABLE — la migration du 28/07) :", b: true }]));
b.push(code("prisma/schema.prisma"));
b.push(code("prisma/seed.ts"));
b.push(code("prisma/migrations/20260728134105_add_demo_credential/   (tout le dossier)"));
b.push(p([{ t: "Documentation (facultatif — regénérable) : RECAP-PROJET-NEXUS.md et ce guide." }]));
b.push(spacer());

// 3. Commandes
b.push(h1("3. Commandes à lancer après la synchro"));
b.push(p([{ t: "À cause de la migration, suivez cet ordre. Piège Windows : ", b: true }, { t: "toujours ARRÊTER le serveur de dev avant les commandes Prisma (sinon erreur EPERM, le moteur est verrouillé)." }]));
b.push(p([{ t: "1. ", b: true }, { t: "Arrêter le serveur de dev s'il tourne (Ctrl+C dans le terminal " }, { t: "npm run dev", code: true }, { t: "), puis récupérer le code (partie 2)." }]));
b.push(p([{ t: "2. ", b: true }, { t: "(Sans risque) installer les dépendances — aucune nouvelle cette fois :" }]));
b.push(code("npm install"));
b.push(p([{ t: "3. ", b: true }, { t: "Appliquer la migration à votre base locale (crée la table du compte démo) :" }]));
b.push(code("npx prisma migrate deploy"));
b.push(p([{ t: "4. ", b: true }, { t: "Régénérer le client Prisma :" }]));
b.push(code("npx prisma generate"));
b.push(p([{ t: "5. ", b: true }, { t: "Poser les identifiants démo par défaut en local — idempotent, n'écrase JAMAIS un choix déjà enregistré :" }]));
b.push(code("npx prisma db seed"));
b.push(p([{ t: "6. ", b: true }, { t: "Vérifier que le projet compile :" }]));
b.push(code("npm run lint"));
b.push(p([{ t: "Remarque : ", b: true }, { t: "si npm run lint remonte des erreurs pointant vers un dossier maj-2026-07-10\\ (modules introuvables), c'est un ancien dossier de sauvegarde déposé dans le projet — SANS rapport avec cette mise à jour. Sortez-le du dossier pour retrouver un lint propre." }]));
b.push(p([{ t: "7. ", b: true }, { t: "Relancer le serveur de dev, puis Ctrl+F5 dans le navigateur :" }]));
b.push(code("npm run dev"));
b.push(p([{ t: "Rien à faire côté production : ", b: true }, { t: "Render a déjà tout appliqué (migration + seed + build) au déploiement automatique." }]));
b.push(spacer());

// 4. Détail compte démo
b.push(h1("4. Détail — compte de démonstration administrable"));
b.push(bullet([{ t: "Où : ", b: true }, { t: "« Paramètres » → section « Compte de démonstration » (visible uniquement par le Super admin et l'Admin)." }]));
b.push(bullet([{ t: "Ce que ça fait : ", b: true }, { t: "vous saisissez un email et un mot de passe, puis « Enregistrer ». Cela met à jour le VRAI compte de démonstration (on peut vraiment se connecter avec les nouveaux identifiants) ET le texte affiché sur la page de connexion." }]));
b.push(bullet([{ t: "Case « Afficher sur la page de connexion » : ", b: true }, { t: "cochée, l'astuce « Démo : … » apparaît sur le login ; décochée, elle disparaît (le compte continue de fonctionner, il n'est simplement plus affiché)." }]));
b.push(bullet([{ t: "Règles : ", b: true }, { t: "email valide, mot de passe d'au moins 6 caractères. Si l'email est déjà utilisé par un autre compte, un message clair le signale (aucun changement n'est fait)." }]));
b.push(bullet([{ t: "Sécurité : ", b: true }, { t: "réservé en dur au Super admin et à l'Admin. Le mot de passe démo est un identifiant public par nature (affiché sur le login) : c'est volontaire." }]));
b.push(bullet([{ t: "Par défaut : ", b: true }, { t: "samuel@test.io / password123 (posé par le seed). Vos modifications ne sont jamais écrasées par un redéploiement." }]));
b.push(spacer());

// 5. Détail filigrane
b.push(h1("5. Détail — image de fond (filigrane) des onglets"));
b.push(bullet([{ t: "Ce que vous voyez : ", b: true }, { t: "une image discrète en fond, derrière le contenu des onglets, en clair comme en sombre. Le voile s'adapte automatiquement au mode (clair/sombre)." }]));
b.push(bullet([{ t: "Lisibilité préservée : ", b: true }, { t: "les cartes (KPIs, listes, graphiques) restent opaques ; seule la marge autour laisse deviner l'image." }]));
b.push(bullet([{ t: "Continu au défilement : ", b: true }, { t: "le filigrane ne se coupe plus quand on scrolle (le voile est porté par la zone de défilement, pas par une vue à hauteur figée)." }]));
b.push(bullet([{ t: "Changer l'image : ", b: true }, { t: "l'URL est centralisée dans src/App.tsx (constante APP_BG_IMAGE) ; il suffit de la remplacer. Ajuster la discrétion se fait via l'opacité du voile (bg-background/90)." }]));
b.push(bullet([{ t: "Code seul pour cette partie : ", b: true }, { t: "App.tsx + les 15 vues (fond passé en transparent). Pas de migration liée au filigrane." }]));
b.push(spacer());

// 6. Vérifier
b.push(h1("6. Vérifier que tout marche"));
b.push(bullet([{ t: "Compte démo : ", b: true }, { t: "connectez-vous en admin (admin@techcorp.io / admin123), « Paramètres » → « Compte de démonstration » → changez le mot de passe, enregistrez. Déconnectez-vous : la page de connexion affiche les nouveaux identifiants, et la connexion démo fonctionne avec eux." }]));
b.push(bullet([{ t: "Masquage : ", b: true }, { t: "décochez « Afficher sur la page de connexion », enregistrez : l'astuce « Démo : … » disparaît du login." }]));
b.push(bullet([{ t: "Filigrane : ", b: true }, { t: "ouvrez le Tableau de bord, faites défiler de haut en bas : l'image de fond reste continue, sans ligne de coupure. Testez aussi en Mode sombre (bouton en bas de la barre latérale)." }]));
b.push(spacer());

// 7. À noter
b.push(h1("7. À noter (rappels)"));
b.push(bullet([{ t: "Piège Windows (rappel) : ", b: true }, { t: "toujours arrêter npm run dev avant prisma migrate deploy / generate (verrou du moteur, erreur EPERM)." }]));
b.push(bullet([{ t: "Réveil à froid de la base (rappel) : ", b: true }, { t: "sur le plan gratuit, le premier appel après une veille peut être lent (30-60 s). Ce n'est pas un bug." }]));
b.push(bullet([{ t: "Sécurité (rappel) : ", b: true }, { t: "révoquer l'ancien token GitHub exposé ghp_JLBr… s'il ne l'est pas déjà." }]));

// ---- OOXML ----
const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
${b.join("\n")}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>
</w:body></w:document>`;
const documentWithBullets = documentXml.replace(/(<w:pStyle w:val="Bullet"\/><\/w:pPr>)(<w:r>)/g, '$1<w:r><w:t xml:space="preserve">•  </w:t></w:r>$2');
const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Body"><w:name w:val="Body"/><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:color w:val="1E3A8A"/><w:sz w:val="40"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="240" w:after="120"/><w:keepNext/></w:pPr><w:rPr><w:b/><w:color w:val="2563EB"/><w:sz w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:spacing w:before="160" w:after="80"/><w:keepNext/></w:pPr><w:rPr><w:b/><w:color w:val="334155"/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Bullet"><w:name w:val="Bullet"/><w:pPr><w:spacing w:after="60"/><w:ind w:left="360" w:hanging="360"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:pPr><w:spacing w:after="120"/><w:ind w:left="240"/><w:shd w:val="clear" w:fill="EEF2F7"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/></w:rPr></w:style>
</w:styles>`;
const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;
const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

const zip = new JSZip();
zip.file("[Content_Types].xml", contentTypes);
zip.folder("_rels").file(".rels", rels);
const word = zip.folder("word");
word.file("document.xml", documentWithBullets);
word.file("styles.xml", stylesXml);
word.folder("_rels").file("document.xml.rels", docRels);
const outPath = path.join(process.cwd(), "Guide-Sync-Maison-2026-07-28.docx");
zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("Écrit :", outPath, "(" + buf.length + " octets)");
});
