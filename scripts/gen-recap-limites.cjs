/* Génère "recap-limites-serveur.docx" : synthèse des limites (uploads, données,
   cadence, stockage) et de la façon dont l'application peut évoluer. */
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
b.push(title("Récap — Limites serveur & évolution de l'application"));
b.push(p([{ t: "Synthèse des limites actuelles (uploads, données, cadence, stockage) et des leviers pour faire grandir l'application. Généré le " }, { t: new Date().toLocaleDateString("fr-FR") }, { t: "." }]));
b.push(spacer());

// 1. Limites actuelles
b.push(h1("1. Limites actuelles"));
b.push(h2("Taille par fichier (upload)"));
b.push(bullet([{ t: "CV : ", b: true }, { t: "10 Mo maximum — format PDF uniquement." }]));
b.push(bullet([{ t: "Lettre de motivation : ", b: true }, { t: "10 Mo maximum — PDF ou Word (.docx)." }]));
b.push(bullet([{ t: "Photo de profil : ", b: true }, { t: "5 Mo maximum — image." }]));
b.push(h2("Saisie / édition de texte (requête JSON)"));
b.push(bullet([{ t: "~100 Ko par requête ", b: true }, { t: "(valeur par défaut d'Express). Concerne l'ajout manuel et l'édition du texte d'un CV. Largement suffisant pour du texte (~15 000-20 000 mots)." }]));
b.push(h2("Cadence (anti-abus)"));
b.push(bullet([{ t: "Candidatures publiques : ", b: true }, { t: "5 par heure et par adresse IP (formulaire /postuler)." }]));
b.push(bullet([{ t: "API générale : ", b: true }, { t: "200 requêtes / 15 minutes." }]));
b.push(bullet([{ t: "Connexion : ", b: true }, { t: "10 tentatives / 15 minutes (anti-force brute)." }]));
b.push(h2("Import en masse"));
b.push(bullet([{ t: "Aucun import groupé (CSV/Excel) : ", b: true }, { t: "les candidats s'ajoutent un par un (formulaire public, import depuis un email, ou ajout manuel)." }]));
b.push(spacer());

// 2. Ce qui consomme le stockage
b.push(h1("2. Ce qui consomme le stockage"));
b.push(bullet([{ t: "Les CV sont stockés en TEXTE extrait, ", b: true }, { t: "pas en PDF d'origine. Le texte est petit (quelques dizaines de Ko par candidat)." }]));
b.push(bullet([{ t: "Le PDF d'origine n'est pas conservé durablement ", b: true }, { t: "(disque éphémère du plan gratuit Render) : seul le texte extrait reste en base." }]));
b.push(bullet([{ t: "Base de données Neon (plan gratuit) : ", b: true }, { t: "~0,5 Go au total. Utilisation actuelle : ~30 Mo." }]));
b.push(spacer());

// 3. Estimation de capacité
b.push(h1("3. Estimation de capacité (ordre de grandeur)"));
b.push(p([{ t: "Estimation indicative — dépend de la richesse des profils :", b: true }]));
b.push(bullet([{ t: "En comptant ~50-100 Ko de données par candidat (texte du CV + analyse IA + scores) : " }, { t: "~5 000 à 10 000 candidats" }, { t: " avant d'approcher la limite des 0,5 Go du plan gratuit Neon." }]));
b.push(bullet([{ t: "Autrement dit : ", b: true }, { t: "pour une démo ou un usage modéré, la capacité est très confortable." }]));
b.push(spacer());

// 4. Évolution
b.push(h1("4. Comment l'application va évoluer (leviers)"));
b.push(p([{ t: "Selon le besoin qui apparaît, voici quoi faire. Chaque levier est indépendant." }]));

b.push(h2("A. Plus de candidats / stockage (limite Neon atteinte)"));
b.push(bullet([{ t: "Passer Neon en plan payant ", b: true }, { t: "(plus de Go, pas de mise en veille). Aucun changement de code." }]));
b.push(bullet([{ t: "Ou archiver / purger ", b: true }, { t: "les anciens candidats pour libérer de l'espace." }]));

b.push(h2("B. Importer beaucoup de candidats d'un coup"));
b.push(bullet([{ t: "Ajouter un import en masse (CSV/Excel). ", b: true }, { t: "Évolution du code (nouvelle route + écran d'import). Réalisable." }]));

b.push(h2("C. Conserver les fichiers d'origine (PDF, photos)"));
b.push(bullet([{ t: "Stockage externe (Amazon S3, Cloudflare R2, Cloudinary). ", b: true }, { t: "Les fichiers survivent aux redéploiements et ne pèsent pas sur la base. Évolution du code d'upload." }]));
b.push(bullet([{ t: "Ou disque persistant Render ", b: true }, { t: "(payant, plus simple mais moins scalable)." }]));

b.push(h2("D. Fichiers plus volumineux"));
b.push(bullet([{ t: "Augmenter les limites d'upload ", b: true }, { t: "(actuellement 10 Mo CV / 5 Mo photo) — simple réglage côté serveur." }]));
b.push(bullet([{ t: "Augmenter la limite JSON ", b: true }, { t: "(actuellement ~100 Ko) si les CV texte deviennent très longs — simple réglage." }]));

b.push(h2("E. Plus de trafic / plus d'utilisateurs simultanés"));
b.push(bullet([{ t: "Render en plan payant ", b: true }, { t: "(plus de RAM/CPU, pas de mise en veille)." }]));
b.push(bullet([{ t: "Ajuster le rate limiting ", b: true }, { t: "si les plafonds anti-abus deviennent trop stricts — simple réglage." }]));
b.push(spacer());

// 5. Ajustable vs évolution
b.push(h1("5. Ce qui est un simple réglage vs une évolution du code"));
b.push(h2("Simples réglages (rapides)"));
b.push(bullet("Taille max des uploads (CV / lettre / photo)."));
b.push(bullet("Taille max des requêtes JSON."));
b.push(bullet("Plafonds de cadence (rate limiting)."));
b.push(h2("Évolutions (développement)"));
b.push(bullet("Import en masse CSV/Excel."));
b.push(bullet("Stockage externe des fichiers d'origine (S3/R2)."));
b.push(bullet("Export PDF enrichi, tableaux de bord avancés, etc."));
b.push(spacer());

// 6. Recommandations
b.push(h1("6. Recommandations"));
b.push(bullet([{ t: "Aujourd'hui (démo / usage modéré) : ", b: true }, { t: "aucune limite gênante — les plafonds actuels conviennent." }]));
b.push(bullet([{ t: "Montée en charge légère : ", b: true }, { t: "Render payant (supprime la veille) ; Neon gratuit suffit encore." }]));
b.push(bullet([{ t: "Usage intensif / production : ", b: true }, { t: "Neon payant + stockage fichiers externe + import en masse + limites relevées." }]));
b.push(spacer());
b.push(p([{ t: "Besoin d'activer l'un de ces leviers ? Chaque point ci-dessus peut être mis en place à la demande." }]));

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
const outPath = path.join(process.cwd(), "recap-limites-serveur.docx");
zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("Écrit :", outPath, "(" + buf.length + " octets)");
});
