/* Génère "Guide-Sync-Maison-2026-08-05.docx" : comment récupérer chez soi les
   changements de la session du 05/08/2026 (mot de passe du compte de
   démonstration masqué sur la page de connexion → « contactez Samuel »).
   Point clé : CODE UNIQUEMENT. Aucune migration, aucune nouvelle dépendance
   → un simple git pull suffit. */
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
b.push(title("Guide — Synchroniser la mise à jour du 05/08 vers le dossier maison"));
b.push(p([{ t: "Comment récupérer chez vous les changements du 05/08. Généré le " }, { t: new Date().toLocaleDateString("fr-FR") }, { t: "." }]));
b.push(p([{ t: "En bref : ", b: true }, { t: "cette mise à jour ne touche que le code (page de connexion + serveur). AUCUNE migration de base, AUCUNE nouvelle dépendance. Un simple git pull suffit." }]));
b.push(spacer());

// 1. Vue d'ensemble
b.push(h1("1. Vue d'ensemble — ce qui a changé"));
b.push(bullet([{ t: "Nouveau mot de passe du compte de démonstration : ", b: true }, { t: "le mot de passe du compte démo (samuel@test.io) est désormais password123*** (modifié depuis « Paramètres » → « Compte de démonstration »)." }]));
b.push(bullet([{ t: "Mot de passe masqué sur la page de connexion : ", b: true }, { t: "la page de connexion n'affiche PLUS le mot de passe. La ligne indique maintenant « Démo : samuel@test.io — mot de passe : contactez Samuel ». L'email reste visible, le mot de passe non." }]));
b.push(bullet([{ t: "Mot de passe plus exposé côté serveur : ", b: true }, { t: "l'adresse publique qui alimente cette ligne (/api/auth/demo) ne renvoie plus le mot de passe. Il n'est donc plus visible dans les outils du navigateur. Il reste consultable et modifiable par un administrateur dans « Paramètres »." }]));
b.push(bullet([{ t: "Prod déjà à jour : ", b: true }, { t: "les changements sont poussés et déployés automatiquement sur Render. Rien à faire côté site en ligne." }]));
b.push(spacer());

// 2. Récupérer le code
b.push(h1("2. Récupérer le code chez vous"));
b.push(h2("Méthode recommandée — git pull (le plus simple)"));
b.push(p([{ t: "Si votre dossier maison est un clone Git du dépôt, une seule commande récupère TOUT (code + docs). Dans un terminal ouvert DANS le dossier du projet :" }]));
b.push(code("git status"));
b.push(p([{ t: "Vérifiez qu'il n'y a pas de modifications locales non enregistrées. Si tout est propre :" }]));
b.push(code("git pull origin main"));
b.push(p([{ t: "En cas de modifications locales gênantes : " }, { t: "git stash", code: true }, { t: " puis " }, { t: "git pull origin main", code: true }, { t: " (et " }, { t: "git stash pop", code: true }, { t: " pour les récupérer)." }]));
b.push(h2("Méthode alternative — copie manuelle (liste des fichiers)"));
b.push(p([{ t: "Si vous copiez à la main, reportez ces deux fichiers en respectant l'arborescence." }]));
b.push(code("server.ts"));
b.push(code("src/components/LoginView.tsx"));
b.push(p([{ t: "Documentation (facultatif — regénérable) : RECAP-PROJET-NEXUS.md et ce guide." }]));
b.push(spacer());

// 3. Commandes
b.push(h1("3. Commandes à lancer après la synchro"));
b.push(p([{ t: "Bonne nouvelle : ", b: true }, { t: "pas de migration ni de nouvelle dépendance cette fois. La procédure est minimale." }]));
b.push(p([{ t: "1. ", b: true }, { t: "Récupérer le code (partie 2)." }]));
b.push(p([{ t: "2. ", b: true }, { t: "(Sans risque) installer les dépendances — aucune nouvelle cette fois :" }]));
b.push(code("npm install"));
b.push(p([{ t: "3. ", b: true }, { t: "Vérifier que le projet compile :" }]));
b.push(code("npm run lint"));
b.push(p([{ t: "Remarque : ", b: true }, { t: "si npm run lint remonte des erreurs pointant vers un dossier maj-2026-07-10\\ (modules introuvables), c'est un ancien dossier de sauvegarde déposé dans le projet — SANS rapport avec cette mise à jour. Sortez-le du dossier pour retrouver un lint propre." }]));
b.push(p([{ t: "4. ", b: true }, { t: "Relancer le serveur de dev, puis Ctrl+F5 dans le navigateur :" }]));
b.push(code("npm run dev"));
b.push(p([{ t: "Rien à faire côté production : ", b: true }, { t: "Render a déjà tout déployé automatiquement." }]));
b.push(spacer());

// 4. Détail
b.push(h1("4. Détail — mot de passe démo masqué"));
b.push(bullet([{ t: "Nouveau mot de passe : ", b: true }, { t: "password123*** pour le compte samuel@test.io. À conserver en lieu sûr : il n'est plus affiché publiquement." }]));
b.push(bullet([{ t: "Sur la page de connexion : ", b: true }, { t: "la ligne « Démo : … » montre l'email mais remplace le mot de passe par « contactez Samuel ». Les personnes qui veulent tester doivent donc vous le demander." }]));
b.push(bullet([{ t: "Changer le mot de passe plus tard : ", b: true }, { t: "« Paramètres » → « Compte de démonstration » (réservé Super admin / Admin). Vous y saisissez le nouveau mot de passe et « Enregistrer » : cela met à jour le vrai compte." }]));
b.push(bullet([{ t: "Masquer entièrement la ligne démo : ", b: true }, { t: "toujours dans la même section, décochez « Afficher sur la page de connexion » : plus rien ne s'affiche (le compte continue de fonctionner)." }]));
b.push(bullet([{ t: "Pourquoi c'est plus sûr : ", b: true }, { t: "avant, le mot de passe partait jusqu'au navigateur et était lisible dans les outils de développement. Il n'est désormais plus envoyé sur la page de connexion." }]));
b.push(spacer());

// 5. Vérifier
b.push(h1("5. Vérifier que tout marche"));
b.push(bullet([{ t: "Page de connexion : ", b: true }, { t: "ouvrez la page de connexion (déconnecté) : la ligne démo affiche l'email suivi de « mot de passe : contactez Samuel », sans mot de passe visible." }]));
b.push(bullet([{ t: "Connexion démo : ", b: true }, { t: "connectez-vous avec samuel@test.io et password123*** : la connexion fonctionne." }]));
b.push(bullet([{ t: "Administration : ", b: true }, { t: "en admin (admin@techcorp.io / admin123), « Paramètres » → « Compte de démonstration » montre toujours le mot de passe et permet de le modifier." }]));
b.push(spacer());

// 6. À noter
b.push(h1("6. À noter (rappels)"));
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
const outPath = path.join(process.cwd(), "Guide-Sync-Maison-2026-08-05.docx");
zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("Écrit :", outPath, "(" + buf.length + " octets)");
});
