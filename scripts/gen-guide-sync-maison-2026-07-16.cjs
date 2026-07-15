/* Génère "Guide-Sync-Maison-2026-07-16.docx" : comment reporter les mises à jour
   du 16/07/2026 (photo de profil sur /postuler + CV en image lue par OCR) vers le
   dossier « maison », avec la liste des fichiers, les deux méthodes et les commandes. */
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
b.push(title("Guide — Synchroniser les mises à jour du 16/07 vers le dossier maison"));
b.push(p([{ t: "Tout ce qui a changé aujourd'hui, comment le récupérer chez vous (2 méthodes) et les commandes à lancer. Généré le " }, { t: new Date().toLocaleDateString("fr-FR") }, { t: "." }]));
b.push(spacer());

// 1. Résumé des changements
b.push(h1("1. Ce qui a changé aujourd'hui"));
b.push(bullet([{ t: "Page /postuler — Photo de profil : ", b: true }, { t: "nouveau champ (optionnel) pour joindre une photo, avec un aperçu. La photo s'affiche ensuite dans la fiche du candidat." }]));
b.push(bullet([{ t: "CV en image (JPG/PNG) : ", b: true }, { t: "le champ CV de /postuler ET le bouton « Importer un CV » de la fiche candidat acceptent désormais aussi les images (photo ou scan d'un CV). Le texte est extrait automatiquement par OCR." }]));
b.push(bullet([{ t: "OCR via l'IA Gemini : ", b: true }, { t: "l'extraction du texte d'une image réutilise Gemini (déjà utilisé pour l'analyse) — aucune nouvelle bibliothèque à installer." }]));
b.push(bullet([{ t: "Photo côté recruteur corrigée : ", b: true }, { t: "le bouton « Changer la photo » de la fiche candidat enregistre maintenant la photo dans la base (en base64), ce qui la fait s'afficher correctement en ligne (avant, elle disparaissait en prod)." }]));
b.push(bullet([{ t: "Aucune nouvelle dépendance : ", b: true }, { t: "aucun paquet npm ajouté." }]));
b.push(bullet([{ t: "Aucun changement de base : ", b: true }, { t: "pas de nouvelle migration, le seed n'est pas modifié (le champ avatarUrl existait déjà)." }]));
b.push(bullet([{ t: "Prod déjà à jour : ", b: true }, { t: "commit 350310c poussé et déployé sur Render. Vérifié en ligne (nouveau bundle index-ATTSTaMD.js actif)." }]));
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
b.push(code("src/components/ApplyView.tsx"));
b.push(code("src/components/CandidateProfileView.tsx"));
b.push(h2("Scripts (facultatif — génèrent les documents)"));
b.push(code("scripts/gen-guide-sync-maison-2026-07-16.cjs"));
b.push(h2("Documentation (facultatif — regénérable via le script)"));
b.push(code("Guide-Sync-Maison-2026-07-16.docx"));
b.push(code("RECAP-PROJET-NEXUS.md"));
b.push(p([{ t: "Le fichier .docx peut être copié tel quel, ou regénéré avec le script gen-*.cjs (voir partie 4)." }]));
b.push(spacer());

// 4. Commandes
b.push(h1("4. Commandes à lancer après la synchro"));
b.push(p([{ t: "Bonne nouvelle : aujourd'hui, pas de migration ni de re-seed. ", b: true }, { t: "Les changements sont uniquement du code (front + serveur)." }]));
b.push(p([{ t: "1. ", b: true }, { t: "Installer les dépendances (aucune nouvelle aujourd'hui, mais la commande reste sans risque) :" }]));
b.push(code("npm install"));
b.push(p([{ t: "2. ", b: true }, { t: "Vérifier que le projet compile :" }]));
b.push(code("npm run lint"));
b.push(p([{ t: "3. ", b: true }, { t: "(Optionnel) Regénérer le guide Word du jour :" }]));
b.push(code("node scripts/gen-guide-sync-maison-2026-07-16.cjs"));
b.push(p([{ t: "4. ", b: true }, { t: "Relancer le serveur de dev, puis Ctrl+F5 dans le navigateur :" }]));
b.push(code("npm run dev"));
b.push(spacer());

// 5. Important pour tester l'OCR en local
b.push(h1("5. Important — tester l'OCR d'un CV en image en local"));
b.push(p([{ t: "L'OCR (lecture du texte d'une image) passe par l'IA Gemini. Pour qu'il fonctionne en local, votre fichier ", b: false }, { t: ".env", code: true }, { t: " doit contenir une clé " }, { t: "GEMINI_API_KEY", code: true }, { t: " valide (la même qui sert déjà à l'analyse des CV)." }]));
b.push(bullet([{ t: "Si la clé est absente : ", b: true }, { t: "l'import d'un CV en PDF ou Word continue de marcher ; seule la lecture des images (JPG/PNG) échouera." }]));
b.push(bullet([{ t: "En production : ", b: true }, { t: "la clé est déjà configurée dans Render (Environment), rien à faire." }]));
b.push(spacer());

// 6. Ce dont vous n'avez PAS besoin
b.push(h1("6. Ce dont vous n'avez PAS besoin"));
b.push(bullet([{ t: "Pas de prisma migrate / db seed : ", b: true }, { t: "aucun champ de base ajouté (avatarUrl existait déjà)." }]));
b.push(bullet([{ t: "Pas de nouvelle dépendance : ", b: true }, { t: "l'OCR réutilise Gemini, déjà installé." }]));
b.push(bullet([{ t: "Rien à faire côté production : ", b: true }, { t: "Render est déjà déployé et vérifié." }]));
b.push(spacer());

// 7. Vérifier que tout marche
b.push(h1("7. Vérifier que tout marche"));
b.push(bullet([{ t: "Page /postuler : ", b: true }, { t: "un champ « Photo de profil » (optionnel) apparaît, avec un aperçu rond quand on choisit une image." }]));
b.push(bullet([{ t: "Candidature avec CV en image : ", b: true }, { t: "sur /postuler, joindre une photo/scan de CV (JPG/PNG) → la candidature passe et le texte du CV est bien rempli dans la fiche." }]));
b.push(bullet([{ t: "Import CV image (recruteur) : ", b: true }, { t: "fiche candidat → onglet « Expérience & CV » → « Importer un CV » accepte PDF, Word et image ; le texte apparaît ensuite." }]));
b.push(bullet([{ t: "Photo affichée : ", b: true }, { t: "la photo (candidat ou recruteur) s'affiche dans la fiche et reste visible après un redéploiement." }]));
b.push(spacer());

// 8. À noter
b.push(h1("8. À noter"));
b.push(bullet([{ t: "Formats CV acceptés : ", b: true }, { t: "PDF, Word .docx et images JPG / PNG / WebP. Les autres formats sont refusés avec un message d'erreur." }]));
b.push(bullet([{ t: "Photo — 2 Mo maximum : ", b: true }, { t: "elle est stockée en base (en base64) pour rester visible en ligne malgré le disque éphémère de Render." }]));
b.push(bullet([{ t: "OCR d'image : ", b: true }, { t: "ajoute quelques secondes au traitement (~10-15 s) et consomme du quota Gemini ; une image nette donne une meilleure extraction." }]));
b.push(bullet([{ t: "Uploads : ", b: true }, { t: "les fichiers reçus sont traités en mémoire (plus d'écriture sur le disque) : CV/lettre extraits en texte, photo encodée en base64." }]));
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
const outPath = path.join(process.cwd(), "Guide-Sync-Maison-2026-07-16.docx");
zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("Écrit :", outPath, "(" + buf.length + " octets)");
});
