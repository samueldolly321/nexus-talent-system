/* Génère "Guide-Sync-Maison-2026-07-20-au-23.docx" : un SEUL document qui réunit
   les guides de synchro maison des sessions du 20, 21 et 23/07/2026.
   Point clé : la session du 23/07 ajoute UNE migration de base → si l'on
   synchronise les trois d'un coup, il faut lancer les commandes Prisma (partie 3).
   Regroupe le contenu de gen-guide-sync-maison-2026-07-{20,21,23}.cjs. */
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
b.push(title("Guide — Synchroniser les mises à jour du 20, 21 et 23/07 vers le dossier maison"));
b.push(p([{ t: "Document unique regroupant les trois guides de synchro maison. Comment récupérer chez vous les changements des 20, 21 et 23/07, et les commandes à lancer. Généré le " }, { t: new Date().toLocaleDateString("fr-FR") }, { t: "." }]));
b.push(p([{ t: "Si vous synchronisez les trois d'un coup : ", b: true }, { t: "récupérez le code (partie 2), lancez les commandes consolidées (partie 3), puis vérifiez (partie 7). Les parties 4 à 6 détaillent chaque session si besoin." }]));
b.push(p([{ t: "Le point qui change des sessions précédentes : ", b: true }, { t: "la mise à jour du 23/07 AJOUTE une petite migration de base (nouvelle table des permissions). Il y a donc des commandes Prisma à lancer (partie 3). En revanche, toujours AUCUNE nouvelle dépendance npm sur les trois sessions." }]));
b.push(spacer());

// 1. Vue d'ensemble
b.push(h1("1. Vue d'ensemble — ce qui a changé sur les trois sessions"));
b.push(bullet([{ t: "20/07 — Fix « Erreur base de données » à la publication d'une offre : ", b: true }, { t: "publier (ou éditer) une offre ne tombe plus en erreur quand la base sort de veille « à froid ». Code seul (server.ts). Commit c2ea370." }]));
b.push(bullet([{ t: "21/07 — Détail d'offre sur mobile + première grille Rôles & permissions : ", b: true }, { t: "sur téléphone, le détail d'une offre s'ouvre juste sous la carte cliquée ; et une grille des droits par rôle apparaît dans les Paramètres (à l'époque : en lecture seule). Code seul (JobsView.tsx, SettingsView.tsx). Commit 2d935e7." }]));
b.push(bullet([{ t: "23/07 — La grille Rôles & permissions devient MODIFIABLE et réellement appliquée : ", b: true }, { t: "un admin coche/décoche les droits par rôle et ça change l'accès pour de vrai (menu + serveur). Ajoute une migration de base. Fichiers : server.ts, src/App.tsx, Sidebar.tsx, SettingsView.tsx, types.ts + prisma/." }]));
b.push(bullet([{ t: "Prod déjà à jour : ", b: true }, { t: "les trois sont poussées et déployées automatiquement sur Render (la migration du 23/07 y est déjà appliquée). Rien à faire côté site en ligne." }]));
b.push(spacer());

// 2. Récupérer le code
b.push(h1("2. Récupérer le code chez vous"));
b.push(h2("Méthode recommandée — git pull (le plus simple)"));
b.push(p([{ t: "Si votre dossier maison est un clone Git du dépôt, une seule commande récupère TOUT (code des trois sessions + migration + docs). Dans un terminal ouvert DANS le dossier du projet :" }]));
b.push(code("git status"));
b.push(p([{ t: "Vérifiez qu'il n'y a pas de modifications locales non enregistrées. Si tout est propre :" }]));
b.push(code("git pull origin main"));
b.push(p([{ t: "En cas de modifications locales gênantes : " }, { t: "git stash", code: true }, { t: " puis " }, { t: "git pull origin main", code: true }, { t: " (et " }, { t: "git stash pop", code: true }, { t: " pour les récupérer)." }]));
b.push(h2("Méthode alternative — copie manuelle (liste consolidée des fichiers)"));
b.push(p([{ t: "Si vous copiez à la main, reportez ces fichiers en respectant l'arborescence. Cette liste couvre les trois sessions." }]));
b.push(code("server.ts"));
b.push(code("src/App.tsx"));
b.push(code("src/components/JobsView.tsx"));
b.push(code("src/components/Sidebar.tsx"));
b.push(code("src/components/SettingsView.tsx"));
b.push(code("src/types.ts"));
b.push(p([{ t: "Base de données (INDISPENSABLE — la migration du 23/07) :", b: true }]));
b.push(code("prisma/schema.prisma"));
b.push(code("prisma/seed.ts"));
b.push(code("prisma/migrations/20260723063822_add_role_permissions/   (tout le dossier)"));
b.push(p([{ t: "Documentation (facultatif — regénérable) : RECAP-PROJET-NEXUS.md, les scripts scripts/gen-guide-sync-maison-*.cjs et les .docx correspondants." }]));
b.push(spacer());

// 3. Commandes consolidées
b.push(h1("3. Commandes à lancer après la synchro (pour les trois d'un coup)"));
b.push(p([{ t: "À cause de la migration du 23/07, suivez cet ordre. Piège Windows : ", b: true }, { t: "toujours ARRÊTER le serveur de dev avant les commandes Prisma (sinon erreur EPERM, le moteur est verrouillé)." }]));
b.push(p([{ t: "1. ", b: true }, { t: "Arrêter le serveur de dev s'il tourne (Ctrl+C dans le terminal " }, { t: "npm run dev", code: true }, { t: "), puis récupérer le code (partie 2)." }]));
b.push(p([{ t: "2. ", b: true }, { t: "(Sans risque) installer les dépendances — aucune nouvelle sur les trois sessions :" }]));
b.push(code("npm install"));
b.push(p([{ t: "3. ", b: true }, { t: "Appliquer la migration à votre base locale (crée la table des permissions) :" }]));
b.push(code("npx prisma migrate deploy"));
b.push(p([{ t: "4. ", b: true }, { t: "Régénérer le client Prisma :" }]));
b.push(code("npx prisma generate"));
b.push(p([{ t: "5. ", b: true }, { t: "(Recommandé) poser les droits par défaut en local — idempotent, n'écrase JAMAIS des droits déjà modifiés :" }]));
b.push(code("npx prisma db seed"));
b.push(p([{ t: "6. ", b: true }, { t: "Vérifier que le projet compile :" }]));
b.push(code("npm run lint"));
b.push(p([{ t: "Remarque : ", b: true }, { t: "si npm run lint remonte des erreurs pointant vers un dossier maj-2026-07-10\\ (modules introuvables), c'est un ancien dossier de sauvegarde déposé dans le projet — SANS rapport avec ces mises à jour. Sortez-le du dossier pour retrouver un lint propre." }]));
b.push(p([{ t: "7. ", b: true }, { t: "Relancer le serveur de dev, puis Ctrl+F5 dans le navigateur :" }]));
b.push(code("npm run dev"));
b.push(p([{ t: "Rien à faire côté production : ", b: true }, { t: "Render a déjà tout appliqué (migration + seed + build) aux déploiements automatiques." }]));
b.push(p([{ t: "Note : ", b: true }, { t: "si vous aviez déjà synchronisé le 20 et le 21 et qu'il ne reste que le 23/07, ce sont exactement les mêmes commandes (elles sont sans effet si déjà à jour, sauf la migration/seed qui posent la nouveauté)." }]));
b.push(spacer());

// 4. Détail 20/07
b.push(h1("4. Détail — mise à jour du 20/07 (fix Erreur base de données à la publication d'offre)"));
b.push(bullet([{ t: "Le symptôme : ", b: true }, { t: "en publiant une offre (constaté sur une offre « Développeur Java » générée par l'IA), un message « La création de l'offre a échoué : Erreur base de données. Réessayez dans un instant. » pouvait apparaître, et l'offre n'était pas créée." }]));
b.push(bullet([{ t: "La cause : ", b: true }, { t: "l'enregistrement d'une offre inscrivait ses compétences une par une (beaucoup d'allers-retours) dans une opération limitée à 5 secondes. Au réveil « à froid » de la base (Neon, plan gratuit), ces allers-retours dépassaient 5 secondes → erreur." }]));
b.push(bullet([{ t: "Le correctif : ", b: true }, { t: "les compétences sont enregistrées « en un bloc » (3 opérations au lieu de 2 par compétence) et le délai autorisé passe de 5 à 20 secondes. L'édition d'offre en profite aussi. Code seul (server.ts)." }]));
b.push(bullet([{ t: "À noter : ", b: true }, { t: "publier une offre ne consomme PAS de quota IA (seules génération / analyse / recherche IA utilisent Gemini). Cette erreur n'avait rien à voir avec un quota." }]));
b.push(spacer());

// 5. Détail 21/07
b.push(h1("5. Détail — mise à jour du 21/07 (détail d'offre sur mobile + grille de référence)"));
b.push(bullet([{ t: "Détail d'une offre sur mobile : ", b: true }, { t: "dans « Offres », sur téléphone (ou fenêtre étroite), cliquer sur une offre ouvre désormais ses détails JUSTE SOUS l'offre cliquée. Avant, le détail apparaissait tout en bas de la liste." }]));
b.push(bullet([{ t: "Sur grand écran : rien ne change : ", b: true }, { t: "le détail reste dans le panneau latéral collant à droite de la liste." }]));
b.push(bullet([{ t: "Première grille « Rôles & permissions » : ", b: true }, { t: "une section apparaît en bas des Paramètres, montrant pour chaque rôle quelles actions sont autorisées. À cette date, c'était une grille de RÉFÉRENCE en lecture seule (visible seulement par le Super admin et l'Admin). Le 23/07 l'a rendue modifiable — voir partie 6." }]));
b.push(bullet([{ t: "Code seul : ", b: true }, { t: "JobsView.tsx et SettingsView.tsx (pas de migration ce jour-là)." }]));
b.push(spacer());

// 6. Détail 23/07
b.push(h1("6. Détail — mise à jour du 23/07 (grille Rôles & permissions éditable et appliquée)"));
b.push(bullet([{ t: "La grille devient MODIFIABLE : ", b: true }, { t: "dans « Paramètres », le tableau des droits n'est plus une simple grille d'information : on coche / décoche chaque droit pour chaque rôle, puis « Enregistrer les permissions »." }]));
b.push(bullet([{ t: "Les droits s'appliquent pour de vrai : ", b: true }, { t: "décocher un droit retire aussitôt l'onglet du menu des personnes de ce rôle ET le serveur refuse l'action (impossible à contourner)." }]));
b.push(bullet([{ t: "Réservé au Super admin et à l'Admin : ", b: true }, { t: "seuls ces deux rôles voient et peuvent modifier la grille." }]));
b.push(bullet([{ t: "Grille GLOBALE : ", b: true }, { t: "une seule grille pour toute la plateforme (elle s'applique à toutes les entreprises)." }]));
b.push(bullet([{ t: "Sécurités anti-blocage : ", b: true }, { t: "la colonne « Super admin » est toujours cochée et verrouillée (il garde tous les droits) ; et l'accès à l'éditeur lui-même ne dépend PAS de la grille → un admin ne peut jamais se bloquer dehors en décochant ses propres droits." }]));
b.push(bullet([{ t: "Migration : ", b: true }, { t: "ajoute une table RolePermission (additive, aucune donnée existante touchée). C'est ce qui impose les commandes Prisma de la partie 3. Fichiers : server.ts, src/App.tsx, Sidebar.tsx, SettingsView.tsx, types.ts + prisma/." }]));
b.push(spacer());

// 7. Vérifier que tout marche
b.push(h1("7. Vérifier que tout marche"));
b.push(bullet([{ t: "Publier une offre (20/07) : ", b: true }, { t: "« Offres » → « Nouvelle Offre » → remplir (ou « Générer avec l'IA ») → Publier. L'offre se crée sans « Erreur base de données » (le tout premier chargement peut prendre 30-60 s le temps du réveil de la base, puis c'est bon)." }]));
b.push(bullet([{ t: "Détail d'offre sur mobile (21/07) : ", b: true }, { t: "réduisez la fenêtre (ou sur téléphone) → « Offres » → cliquez une offre : le détail s'ouvre juste sous la carte, pas en bas de la liste. En plein écran, il reste dans le panneau de droite." }]));
b.push(bullet([{ t: "Grille éditable (23/07) : ", b: true }, { t: "en Super admin/Admin, « Paramètres » → « Rôles & permissions » : cases à cocher + bouton « Enregistrer les permissions ». Décochez par ex. « Gérer les utilisateurs » pour RH, enregistrez, connectez-vous en RH (samuel@test.io) : l'onglet « Utilisateurs » disparaît de son menu. Recochez pour revenir en arrière." }]));
b.push(bullet([{ t: "Colonne Super admin verrouillée : ", b: true }, { t: "ses cases sont toujours cochées et non cliquables. En RH / Manager / Consultant, la section « Rôles & permissions » n'apparaît pas du tout." }]));
b.push(spacer());

// 8. À noter
b.push(h1("8. À noter (rappels)"));
b.push(bullet([{ t: "Grille globale : ", b: true }, { t: "les droits valent pour toute la plateforme ; un changement fait par un Admin s'applique à toutes les entreprises. On pourra la cloisonner par entreprise plus tard si besoin." }]));
b.push(bullet([{ t: "Réveil à froid de la base (rappel) : ", b: true }, { t: "sur le plan gratuit, le premier appel après une veille peut être lent (30-60 s). Ce n'est pas un bug." }]));
b.push(bullet([{ t: "Piège Windows (rappel) : ", b: true }, { t: "toujours arrêter npm run dev avant prisma migrate deploy / generate (verrou du moteur, erreur EPERM)." }]));
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
const outPath = path.join(process.cwd(), "Guide-Sync-Maison-2026-07-20-au-23.docx");
zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("Écrit :", outPath, "(" + buf.length + " octets)");
});
