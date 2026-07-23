/* Génère "Guide-Sync-Maison-2026-07-23.docx" : comment reporter la mise à jour
   du 23/07/2026 (grille « Rôles & permissions » ÉDITABLE et réellement appliquée)
   vers le dossier « maison ». Cette session ajoute 1 MIGRATION de base (additive,
   sans perte) ; AUCUNE nouvelle dépendance npm. */
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
b.push(title("Guide — Synchroniser la mise à jour du 23/07 vers le dossier maison"));
b.push(p([{ t: "Ce qui a changé aujourd'hui, comment le récupérer chez vous (2 méthodes) et les commandes à lancer. Généré le " }, { t: new Date().toLocaleDateString("fr-FR") }, { t: "." }]));
b.push(p([{ t: "À retenir : ", b: true }, { t: "cette mise à jour AJOUTE une petite migration de base de données (une nouvelle table pour les permissions). Il y a donc DEUX commandes Prisma à lancer chez vous (voir partie 4). En revanche : AUCUNE nouvelle dépendance npm." }]));
b.push(spacer());

// 1. Résumé des changements
b.push(h1("1. Ce qui a changé aujourd'hui (23/07)"));
b.push(bullet([{ t: "La grille « Rôles & permissions » devient MODIFIABLE : ", b: true }, { t: "dans « Paramètres », le tableau des droits n'est plus une simple grille d'information : on peut maintenant cocher / décocher chaque droit pour chaque rôle, puis cliquer sur « Enregistrer les permissions »." }]));
b.push(bullet([{ t: "Les droits s'appliquent pour de vrai : ", b: true }, { t: "quand on décoche un droit pour un rôle, les personnes de ce rôle perdent aussitôt l'accès correspondant : l'onglet disparaît de leur menu ET le serveur refuse l'action (impossible de la contourner)." }]));
b.push(bullet([{ t: "Réservé au Super admin et à l'Admin : ", b: true }, { t: "seuls ces deux rôles voient et peuvent modifier la grille. Un RH, Manager ou Consultant ne peut ni la voir ni la changer." }]));
b.push(bullet([{ t: "Grille GLOBALE : ", b: true }, { t: "il y a une seule grille pour toute la plateforme (elle s'applique à toutes les entreprises). C'est un choix assumé ; on pourra un jour la rendre propre à chaque entreprise si besoin." }]));
b.push(bullet([{ t: "Sécurités anti-blocage : ", b: true }, { t: "la colonne « Super admin » est toujours cochée et verrouillée (il garde tous les droits) ; et l'accès à l'éditeur de permissions lui-même ne dépend PAS de la grille : un admin ne peut donc jamais se bloquer dehors en décochant ses propres droits." }]));
b.push(bullet([{ t: "Prod déjà à jour : ", b: true }, { t: "le code est poussé et Render a redéployé automatiquement (migration + démarrage). Rien à faire côté site en ligne." }]));
b.push(spacer());

// 2. Méthode A : git pull
b.push(h1("2. Méthode recommandée — git pull (le plus simple)"));
b.push(p([{ t: "Si votre dossier maison est un clone Git du dépôt, une seule commande récupère TOUT (code + migration + docs). Ouvrez un terminal DANS le dossier du projet :" }]));
b.push(code("git status"));
b.push(p([{ t: "Vérifiez qu'il n'y a pas de modifications locales non enregistrées. Si tout est propre :" }]));
b.push(code("git pull origin main"));
b.push(p([{ t: "En cas de modifications locales gênantes, mettez-les de côté avant : " }, { t: "git stash", code: true }, { t: " puis " }, { t: "git pull origin main", code: true }, { t: " (et " }, { t: "git stash pop", code: true }, { t: " pour les récupérer)." }]));
b.push(p([{ t: "Puis passez à la partie 4 (commandes) — IMPORTANT cette fois, à cause de la migration." }]));
b.push(spacer());

// 3. Méthode B : copie manuelle
b.push(h1("3. Méthode alternative — copie manuelle des fichiers"));
b.push(p([{ t: "Si vous copiez à la main (clé USB, etc.), reportez ces fichiers en respectant l'arborescence." }]));
b.push(h2("Code de l'application"));
b.push(code("server.ts"));
b.push(code("src/App.tsx"));
b.push(code("src/components/Sidebar.tsx"));
b.push(code("src/components/SettingsView.tsx"));
b.push(code("src/types.ts"));
b.push(h2("Base de données (INDISPENSABLE — c'est la migration)"));
b.push(code("prisma/schema.prisma"));
b.push(code("prisma/seed.ts"));
b.push(code("prisma/migrations/20260723063822_add_role_permissions/   (tout le dossier)"));
b.push(p([{ t: "Sans ce dossier de migration, la commande de la partie 4 ne saura pas quoi appliquer et la nouvelle table de permissions n'existera pas." }]));
b.push(h2("Documentation (facultatif — regénérable via le script)"));
b.push(code("RECAP-PROJET-NEXUS.md"));
b.push(code("scripts/gen-guide-sync-maison-2026-07-23.cjs  (génère ce document)"));
b.push(code("Guide-Sync-Maison-2026-07-23.docx"));
b.push(spacer());

// 4. Commandes
b.push(h1("4. Commandes à lancer après la synchro (IMPORTANT)"));
b.push(p([{ t: "Cette fois il y a une migration : suivez l'ordre ci-dessous. Piège Windows classique : ", b: true }, { t: "toujours ARRÊTER le serveur de dev avant les commandes Prisma (sinon erreur EPERM, le moteur est verrouillé)." }]));
b.push(p([{ t: "1. ", b: true }, { t: "Arrêter le serveur de dev s'il tourne (Ctrl+C dans le terminal " }, { t: "npm run dev", code: true }, { t: "), puis récupérer le code (partie 2 ou 3)." }]));
b.push(p([{ t: "2. ", b: true }, { t: "(Sans risque) installer les dépendances — aucune nouvelle aujourd'hui, mais ça ne mange pas de pain :" }]));
b.push(code("npm install"));
b.push(p([{ t: "3. ", b: true }, { t: "Appliquer la migration à votre base locale (crée la table des permissions) :" }]));
b.push(code("npx prisma migrate deploy"));
b.push(p([{ t: "4. ", b: true }, { t: "Régénérer le client Prisma (pour que le code connaisse la nouvelle table) :" }]));
b.push(code("npx prisma generate"));
b.push(p([{ t: "5. ", b: true }, { t: "(Recommandé) poser les droits par défaut dans votre base locale. Le seed est idempotent et n'écrase JAMAIS des droits déjà modifiés :" }]));
b.push(code("npx prisma db seed"));
b.push(p([{ t: "6. ", b: true }, { t: "Vérifier que le projet compile :" }]));
b.push(code("npm run lint"));
b.push(p([{ t: "Remarque : ", b: true }, { t: "si npm run lint remonte des erreurs pointant vers un dossier maj-2026-07-10\\ (modules introuvables), c'est un ancien dossier de sauvegarde déposé dans le projet — SANS rapport avec cette mise à jour. Sortez-le du dossier pour retrouver un lint propre." }]));
b.push(p([{ t: "7. ", b: true }, { t: "(Facultatif) regénérer ce guide Word :" }]));
b.push(code("node scripts/gen-guide-sync-maison-2026-07-23.cjs"));
b.push(p([{ t: "8. ", b: true }, { t: "Relancer le serveur de dev, puis Ctrl+F5 dans le navigateur :" }]));
b.push(code("npm run dev"));
b.push(p([{ t: "Rien à faire côté production : ", b: true }, { t: "Render a déjà appliqué la migration (migrate deploy) et posé les droits par défaut (seed) au moment du déploiement automatique." }]));
b.push(spacer());

// 5. Ce dont vous avez / n'avez pas besoin
b.push(h1("5. Ce dont vous avez (et n'avez pas) besoin cette fois"));
b.push(bullet([{ t: "Migration OUI : ", b: true }, { t: "npx prisma migrate deploy (nouvelle table RolePermission). Additive : rien n'est supprimé, aucune donnée existante n'est touchée." }]));
b.push(bullet([{ t: "Régénération Prisma OUI : ", b: true }, { t: "npx prisma generate après la migration." }]));
b.push(bullet([{ t: "Seed recommandé : ", b: true }, { t: "npx prisma db seed pour poser les droits par défaut en local (n'écrase jamais vos réglages)." }]));
b.push(bullet([{ t: "Nouvelle dépendance NON : ", b: true }, { t: "aucun paquet ajouté ; npm install n'est pas strictement obligatoire." }]));
b.push(bullet([{ t: "Fichiers de code : ", b: true }, { t: "server.ts, src/App.tsx, src/components/Sidebar.tsx, src/components/SettingsView.tsx, src/types.ts (+ prisma/ pour la migration)." }]));
b.push(spacer());

// 6. Vérifier que tout marche
b.push(h1("6. Vérifier que tout marche"));
b.push(bullet([{ t: "La grille est éditable : ", b: true }, { t: "connecté en Super admin ou Admin, allez dans « Paramètres » → section « Rôles & permissions ». Les cases sont maintenant des cases à cocher, avec un bouton « Enregistrer les permissions »." }]));
b.push(bullet([{ t: "Un changement a un effet réel : ", b: true }, { t: "décochez par exemple « Gérer les utilisateurs » pour le rôle RH, enregistrez. Connectez-vous ensuite avec un compte RH (ex. samuel@test.io) : l'onglet « Utilisateurs » ne doit plus apparaître dans son menu. Recochez et enregistrez pour revenir en arrière." }]));
b.push(bullet([{ t: "La colonne Super admin est verrouillée : ", b: true }, { t: "ses cases sont toujours cochées et non cliquables (il garde tous les droits)." }]));
b.push(bullet([{ t: "Réservé aux admins : ", b: true }, { t: "connecté en RH, Manager ou Consultant, la section « Rôles & permissions » ne doit PAS apparaître." }]));
b.push(spacer());

// 7. À noter
b.push(h1("7. À noter"));
b.push(bullet([{ t: "Grille globale : ", b: true }, { t: "les droits valent pour toute la plateforme. Si vous gérez plusieurs entreprises, un changement fait par un Admin s'applique à toutes. On pourra la cloisonner par entreprise plus tard si le besoin apparaît." }]));
b.push(bullet([{ t: "Les droits par défaut = ceux d'avant : ", b: true }, { t: "au premier chargement, la grille reprend exactement les droits qui existaient déjà (rien ne change tant que vous ne touchez à rien)." }]));
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
const outPath = path.join(process.cwd(), "Guide-Sync-Maison-2026-07-23.docx");
zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("Écrit :", outPath, "(" + buf.length + " octets)");
});
