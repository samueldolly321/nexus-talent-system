/* Génère "Guide-Sync-Maison-2026-07-20.docx" : comment reporter la mise à jour
   du 20/07/2026 (fix « Erreur base de données » à la publication d'une offre —
   réveil à froid Neon) vers le dossier « maison ». Session code-only : AUCUNE
   migration, AUCUNE dépendance, AUCUNE régénération Prisma. */
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
b.push(title("Guide — Synchroniser la mise à jour du 20/07 vers le dossier maison"));
b.push(p([{ t: "Ce qui a changé aujourd'hui, comment le récupérer chez vous (2 méthodes) et les commandes à lancer. Généré le " }, { t: new Date().toLocaleDateString("fr-FR") }, { t: "." }]));
b.push(p([{ t: "Bonne nouvelle : ", b: true }, { t: "c'est une mise à jour légère — changement de code sur un seul fichier (server.ts). AUCUNE migration de base, AUCUNE nouvelle dépendance, AUCUNE régénération Prisma." }]));
b.push(spacer());

// 1. Résumé des changements
b.push(h1("1. Ce qui a changé aujourd'hui (20/07)"));
b.push(bullet([{ t: "Correctif « Erreur base de données » à la publication d'une offre : ", b: true }, { t: "en publiant une offre (constaté sur une offre « Développeur Java » générée par l'IA), un message « La création de l'offre a échoué : Erreur base de données. Réessayez dans un instant. » pouvait apparaître, et l'offre n'était pas créée." }]));
b.push(bullet([{ t: "Cause : ", b: true }, { t: "l'enregistrement d'une offre inscrit ses compétences en base une par une (beaucoup d'allers-retours) dans une opération limitée à 5 secondes. Quand la base d'hébergement (Neon, plan gratuit) sortait de veille « à froid », ces allers-retours dépassaient les 5 secondes → erreur." }]));
b.push(bullet([{ t: "Correctif : ", b: true }, { t: "les compétences sont désormais enregistrées « en un bloc » (3 opérations au lieu de 2 par compétence), et le délai autorisé est passé de 5 à 20 secondes (comme l'analyse IA). Résultat : la publication d'une offre ne tombe plus en erreur au réveil de la base." }]));
b.push(bullet([{ t: "Concerne aussi l'édition d'offre : ", b: true }, { t: "la modification d'une offre (qui met à jour les compétences) bénéficie du même correctif." }]));
b.push(bullet([{ t: "Prod déjà à jour : ", b: true }, { t: "commit c2ea370 poussé et déployé automatiquement sur Render, vérifié en ligne (publication d'offre IA OK)." }]));
b.push(spacer());

// 2. Méthode A : git pull
b.push(h1("2. Méthode recommandée — git pull (le plus simple)"));
b.push(p([{ t: "Si votre dossier maison est un clone Git du dépôt, une seule commande récupère TOUT (code + docs). Ouvrez un terminal DANS le dossier du projet :" }]));
b.push(code("git status"));
b.push(p([{ t: "Vérifiez qu'il n'y a pas de modifications locales non enregistrées. Si tout est propre :" }]));
b.push(code("git pull origin main"));
b.push(p([{ t: "En cas de modifications locales gênantes, mettez-les de côté avant : " }, { t: "git stash", code: true }, { t: " puis " }, { t: "git pull origin main", code: true }, { t: " (et " }, { t: "git stash pop", code: true }, { t: " pour les récupérer)." }]));
b.push(p([{ t: "Puis passez directement à la partie 4 (commandes)." }]));
b.push(spacer());

// 3. Méthode B : copie manuelle
b.push(h1("3. Méthode alternative — copie manuelle des fichiers"));
b.push(p([{ t: "Si vous copiez à la main (clé USB, etc.), reportez ces fichiers en respectant l'arborescence." }]));
b.push(h2("Code de l'application (le seul indispensable)"));
b.push(code("server.ts"));
b.push(h2("Documentation (facultatif — regénérable via le script)"));
b.push(code("RECAP-PROJET-NEXUS.md"));
b.push(code("scripts/gen-guide-sync-maison-2026-07-20.cjs  (génère ce document)"));
b.push(code("Guide-Sync-Maison-2026-07-20.docx"));
b.push(p([{ t: "Le fichier .docx peut être copié tel quel, ou regénéré avec le script gen-*.cjs (voir partie 4, étape 4)." }]));
b.push(spacer());

// 4. Commandes
b.push(h1("4. Commandes à lancer après la synchro"));
b.push(p([{ t: "Mise à jour légère : ", b: true }, { t: "pas de migration, pas de nouvelle dépendance, pas de régénération Prisma. En pratique, il suffit de récupérer le code et de relancer." }]));
b.push(p([{ t: "1. ", b: true }, { t: "Si le serveur de dev tourne, l'arrêter (Ctrl+C dans le terminal " }, { t: "npm run dev", code: true }, { t: "), récupérer le code (partie 2 ou 3), puis :" }]));
b.push(p([{ t: "2. ", b: true }, { t: "(Facultatif, sans risque) installer les dépendances — aucune nouvelle aujourd'hui :" }]));
b.push(code("npm install"));
b.push(p([{ t: "3. ", b: true }, { t: "Vérifier que le projet compile :" }]));
b.push(code("npm run lint"));
b.push(p([{ t: "Remarque : ", b: true }, { t: "si npm run lint remonte des erreurs pointant vers un dossier maj-2026-07-10\\ (modules introuvables), c'est un ancien dossier de sauvegarde déposé à la racine — SANS rapport avec cette mise à jour. Sortez-le du projet pour retrouver un lint propre." }]));
b.push(p([{ t: "4. ", b: true }, { t: "(Facultatif) regénérer ce guide Word :" }]));
b.push(code("node scripts/gen-guide-sync-maison-2026-07-20.cjs"));
b.push(p([{ t: "5. ", b: true }, { t: "Relancer le serveur de dev, puis Ctrl+F5 dans le navigateur :" }]));
b.push(code("npm run dev"));
b.push(p([{ t: "Rien à faire côté production : ", b: true }, { t: "Render a déjà redéployé automatiquement au push (build + start). Aucune migration à appliquer." }]));
b.push(spacer());

// 5. Ce dont vous avez / n'avez pas besoin
b.push(h1("5. Ce dont vous avez (et n'avez pas) besoin cette fois"));
b.push(bullet([{ t: "Pas de migration : ", b: true }, { t: "le schéma de base n'a pas changé ; ne lancez pas prisma migrate." }]));
b.push(bullet([{ t: "Pas de régénération Prisma : ", b: true }, { t: "aucune nouvelle colonne ; inutile de lancer prisma generate." }]));
b.push(bullet([{ t: "Pas de nouvelle dépendance : ", b: true }, { t: "npm install n'est pas strictement requis (aucun paquet ajouté)." }]));
b.push(bullet([{ t: "Pas de re-seed : ", b: true }, { t: "les données de démo ne changent pas ; ne lancez pas prisma db seed." }]));
b.push(bullet([{ t: "Un seul fichier de code : ", b: true }, { t: "server.ts. C'est tout ce qui est indispensable à reporter." }]));
b.push(spacer());

// 6. Vérifier que tout marche
b.push(h1("6. Vérifier que tout marche"));
b.push(bullet([{ t: "Publier une offre : ", b: true }, { t: "« Offres d'Emploi » → « Nouvelle Offre » → remplir (ou « Générer avec l'IA ») → Publier. L'offre se crée sans « Erreur base de données », même si la base sortait de veille (le tout premier chargement peut prendre 30-60 s, le temps du réveil, puis c'est bon)." }]));
b.push(bullet([{ t: "Compétences bien enregistrées : ", b: true }, { t: "l'offre publiée affiche bien toutes ses compétences (badges), et l'édition d'une offre pour changer ses compétences fonctionne aussi." }]));
b.push(bullet([{ t: "Si un message d'erreur revient quand même : ", b: true }, { t: "attendez quelques secondes et réessayez — la base peut être en train de se réveiller. Ce n'est plus censé se produire, mais un tout premier appel « à froid » reste possible." }]));
b.push(spacer());

// 7. À noter
b.push(h1("7. À noter"));
b.push(bullet([{ t: "Publier une offre ne consomme pas de quota IA : ", b: true }, { t: "seules la génération d'offre, l'analyse et la recherche par IA utilisent Gemini. Cette erreur n'avait rien à voir avec un quota IA." }]));
b.push(bullet([{ t: "Piège connu (rappel) : ", b: true }, { t: "les opérations base longues + réveil « à froid » de Neon peuvent dépasser le délai par défaut de Prisma (5 s). Parade appliquée : moins d'allers-retours + délai porté à 20 s." }]));
b.push(bullet([{ t: "Piège Windows (rappel) : ", b: true }, { t: "toujours arrêter npm run dev avant un éventuel prisma migrate / generate (verrou du moteur, erreur EPERM). Pas nécessaire aujourd'hui puisqu'il n'y a ni migration ni régénération." }]));
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
const outPath = path.join(process.cwd(), "Guide-Sync-Maison-2026-07-20.docx");
zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("Écrit :", outPath, "(" + buf.length + " octets)");
});
