/* Génère "Guide-Sync-Maison-2026-07-10.docx" : comment reporter les mises à jour
   du 10/07/2026 (dashboard, import CV, export PDF) vers le dossier « maison »,
   avec la liste des fichiers, les deux méthodes et les commandes à lancer. */
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
b.push(title("Guide — Synchroniser les mises à jour du 10/07 vers le dossier maison"));
b.push(p([{ t: "Tout ce qui a changé aujourd'hui, comment le récupérer chez vous (2 méthodes) et les commandes à lancer. Généré le " }, { t: new Date().toLocaleDateString("fr-FR") }, { t: "." }]));
b.push(spacer());

// 1. Résumé des changements
b.push(h1("1. Ce qui a changé aujourd'hui"));
b.push(bullet([{ t: "Tableau de bord : ", b: true }, { t: "la barre de recherche en haut a été retirée (elle n'avait pas d'usage sur cette page)." }]));
b.push(bullet([{ t: "Fiche candidat — Importer un CV : ", b: true }, { t: "nouveau bouton dans l'onglet « Expérience & CV » pour importer un CV au format PDF ou Word (.docx). Le serveur extrait le texte et remplit la fiche." }]));
b.push(bullet([{ t: "Fiche candidat — Export PDF : ", b: true }, { t: "le bouton « Télécharger le CV » produit désormais une fiche PDF soignée : coordonnées, évaluation IA, expériences, formation et compétences en tableaux, puis le texte du CV en paragraphes, avec un pied de page paginé." }]));
b.push(bullet([{ t: "Serveur : ", b: true }, { t: "nouvel endpoint POST /api/candidates/:id/cv (authentifié) qui extrait le texte d'un CV PDF (pdf-parse) ou Word .docx (mammoth)." }]));
b.push(bullet([{ t: "Aucune nouvelle dépendance : ", b: true }, { t: "jspdf, pdf-parse et mammoth étaient déjà présents." }]));
b.push(bullet([{ t: "Aucun changement de base : ", b: true }, { t: "pas de nouvelle migration, le seed n'est pas modifié." }]));
b.push(bullet([{ t: "Prod déjà à jour : ", b: true }, { t: "les deux commits (852bc80, 58f155e) sont poussés et déployés sur Render. Vérifié en ligne." }]));
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
b.push(h2("Code de l'application (indispensable)"));
b.push(code("server.ts"));
b.push(code("src/App.tsx"));
b.push(code("src/components/TopBar.tsx"));
b.push(code("src/components/DashboardView.tsx"));
b.push(code("src/components/CandidateProfileView.tsx"));
b.push(h2("Scripts (facultatif — génèrent les documents)"));
b.push(code("scripts/gen-compte-rendu-2026-07-10.cjs"));
b.push(code("scripts/gen-guide-sync-maison-2026-07-10.cjs"));
b.push(h2("Documentation (facultatif — regénérable via les scripts)"));
b.push(code("Compte-Rendu-Nexus-2026-07-10.xlsx"));
b.push(code("Guide-Sync-Maison-2026-07-10.docx"));
b.push(p([{ t: "Les fichiers .docx / .xlsx peuvent être copiés tels quels, ou regénérés avec les scripts gen-*.cjs (voir partie 4)." }]));
b.push(spacer());

// 4. Commandes
b.push(h1("4. Commandes à lancer après la synchro"));
b.push(p([{ t: "Bonne nouvelle : aujourd'hui, pas de migration ni de re-seed. ", b: true }, { t: "Les changements sont uniquement du code (front + serveur)." }]));
b.push(p([{ t: "1. ", b: true }, { t: "Installer les dépendances (aucune nouvelle aujourd'hui, mais la commande reste sans risque) :" }]));
b.push(code("npm install"));
b.push(p([{ t: "2. ", b: true }, { t: "Vérifier que le projet compile :" }]));
b.push(code("npm run lint"));
b.push(p([{ t: "3. ", b: true }, { t: "(Optionnel) Regénérer les documents Word / Excel du jour :" }]));
b.push(code("node scripts/gen-compte-rendu-2026-07-10.cjs"));
b.push(code("node scripts/gen-guide-sync-maison-2026-07-10.cjs"));
b.push(p([{ t: "4. ", b: true }, { t: "Relancer le serveur de dev, puis Ctrl+F5 dans le navigateur :" }]));
b.push(code("npm run dev"));
b.push(spacer());

// 5. Pas besoin de
b.push(h1("5. Ce dont vous n'avez PAS besoin"));
b.push(bullet([{ t: "Pas de prisma migrate / db seed : ", b: true }, { t: "aucun champ de base n'a été ajouté aujourd'hui." }]));
b.push(bullet([{ t: "Pas de nouvelle dépendance : ", b: true }, { t: "l'export PDF et le parsing CV réutilisent des bibliothèques déjà installées." }]));
b.push(bullet([{ t: "Rien à faire côté production : ", b: true }, { t: "Render est déjà déployé et vérifié." }]));
b.push(spacer());

// 6. Vérifier que tout marche
b.push(h1("6. Vérifier que tout marche"));
b.push(bullet([{ t: "Tableau de bord : ", b: true }, { t: "il n'y a plus de barre de recherche en haut de la page." }]));
b.push(bullet([{ t: "Fiche candidat sans CV : ", b: true }, { t: "onglet « Expérience & CV » → le bouton « Importer un CV » permet de charger un PDF ou un .docx ; le texte apparaît ensuite dans la fiche." }]));
b.push(bullet([{ t: "Télécharger le CV : ", b: true }, { t: "le PDF exporté affiche des tableaux (coordonnées, évaluation IA, expériences, formation, compétences), des paragraphes aérés et un pied de page paginé." }]));
b.push(spacer());

// 7. Notes
b.push(h1("7. À noter"));
b.push(bullet([{ t: "Formats acceptés à l'import : ", b: true }, { t: "PDF et Word .docx uniquement (les autres sont refusés avec un message d'erreur)." }]));
b.push(bullet([{ t: "Uploads non persistants en prod : ", b: true }, { t: "le fichier importé ne sert qu'à extraire le texte (stocké en base) ; le disque Render est éphémère." }]));
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
const outPath = path.join(process.cwd(), "Guide-Sync-Maison-2026-07-10.docx");
zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("Écrit :", outPath, "(" + buf.length + " octets)");
});
