/* Génère "Guide-Sync-Maison-2026-07-09.docx" : comment reporter TOUTES les mises
   à jour du 09/07/2026 vers le dossier « maison », avec la liste des fichiers,
   les deux méthodes (git pull ou copie manuelle) et les commandes à lancer. */
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
b.push(title("Guide — Synchroniser les mises à jour du 09/07 vers le dossier maison"));
b.push(p([{ t: "Tout ce qui a changé aujourd'hui, comment le récupérer chez vous (2 méthodes) et les commandes à lancer. Généré le " }, { t: new Date().toLocaleDateString("fr-FR") }, { t: "." }]));
b.push(spacer());

// 1. Résumé des changements
b.push(h1("1. Ce qui a changé aujourd'hui"));
b.push(bullet([{ t: "Connexion : ", b: true }, { t: "compte démo samuel@test.io / password123 ; bouton SSO retiré (Google seul)." }]));
b.push(bullet([{ t: "Connexion Google : ", b: true }, { t: "activée en prod (variables sur Render + email autorisé)." }]));
b.push(bullet([{ t: "CORS : ", b: true }, { t: "le serveur tolère FRONTEND_URL avec/sans slash + espaces, et loggue les origines autorisées." }]));
b.push(bullet([{ t: "Données : ", b: true }, { t: "utilisateurs Sarah Jenkins et Marc Antoine supprimés ; salaires des offres à « 3 000 000 Ariary »." }]));
b.push(bullet([{ t: "Navigation : ", b: true }, { t: "onglets « Utilisateurs » et « Paramètres » masqués pour le rôle RH (visibles pour Admin et Manager)." }]));
b.push(bullet([{ t: "Sécurité : ", b: true }, { t: "lecture des utilisateurs verrouillée côté serveur (RH → 403) + correction d'une fuite multi-entreprise sur GET /api/users. Vérifié en prod." }]));
b.push(bullet([{ t: "Traçabilité des connexions : ", b: true }, { t: "IP + navigateur enregistrés à chaque connexion (nouveaux champs AuditLog + migration). Nouvel onglet « Connexions » (table + recherche) réservé aux Admins entreprise/plateforme ; IP masquée côté API pour les autres rôles." }]));
b.push(bullet([{ t: "Correctif candidat : ", b: true }, { t: "le bouton « Télécharger le CV » de la fiche candidat est désormais fonctionnel (export du CV en fichier .txt)." }]));
b.push(bullet([{ t: "Docs : ", b: true }, { t: "compte-rendu du 09/07 + guide de mise en ligne de A à Z + ce guide de synchro." }]));
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
b.push(code("prisma/seed.ts"));
b.push(code("prisma/schema.prisma"));
b.push(code("prisma/migrations/20260709125953_add_audit_ip_useragent/  (dossier complet)"));
b.push(code("src/App.tsx"));
b.push(code("src/types.ts"));
b.push(code("src/lib/mappers.ts"));
b.push(code("src/components/LoginView.tsx"));
b.push(code("src/components/Sidebar.tsx"));
b.push(code("src/components/ConnectionsView.tsx  (nouveau)"));
b.push(code("src/components/CandidateProfileView.tsx"));
b.push(h2("Scripts"));
b.push(code("scripts/apply-data-changes.cjs"));
b.push(code("scripts/gen-compte-rendu.cjs"));
b.push(code("scripts/gen-compte-rendu-2026-07-09.cjs"));
b.push(code("scripts/gen-guide-deploy.cjs"));
b.push(code("scripts/gen-guide-mise-en-ligne.cjs"));
b.push(code("scripts/gen-guide-sync-maison-2026-07-09.cjs"));
b.push(h2("Documentation (facultatif — regénérable via les scripts)"));
b.push(code("README.md"));
b.push(code("COMPTE-RENDU-2026-07-08.md"));
b.push(p([{ t: "Les fichiers .docx / .xlsx peuvent être copiés tels quels, ou regénérés avec les scripts gen-*.cjs (voir partie 4)." }]));
b.push(spacer());

// 4. Commandes
b.push(h1("4. Commandes à lancer après la synchro"));
b.push(p([{ t: "Important : arrêtez d'abord le serveur de dev (Ctrl+C). ", b: true }, { t: "Sous Windows il verrouille le moteur Prisma, ce qui ferait échouer generate/migrate." }]));
b.push(p([{ t: "1. ", b: true }, { t: "Régénérer le client Prisma (nouveaux champs ip / userAgent du journal) :" }]));
b.push(code("npx prisma generate"));
b.push(p([{ t: "2. ", b: true }, { t: "Appliquer la nouvelle migration à votre base maison (ajoute les colonnes ip / userAgent) — NÉCESSAIRE aujourd'hui :" }]));
b.push(code("npx prisma migrate deploy"));
b.push(p([{ t: "3. ", b: true }, { t: "Mettre les données à jour (idempotent : ajoute samuel@test.io, retire Sarah/Marc, aligne les salaires des offres de démo sur 3 000 000 Ariary) :" }]));
b.push(code("npx prisma db seed"));
b.push(p([{ t: "4. ", b: true }, { t: "(Optionnel) Forcer TOUTES les offres — y compris celles créées chez vous — à 3 000 000 Ariary :" }]));
b.push(code("node scripts/apply-data-changes.cjs"));
b.push(p([{ t: "5. ", b: true }, { t: "Vérifier que le projet compile :" }]));
b.push(code("npm run lint"));
b.push(p([{ t: "6. ", b: true }, { t: "Relancer le serveur de dev, puis Ctrl+F5 dans le navigateur :" }]));
b.push(code("npm run dev"));
b.push(spacer());

// 5. Pas besoin de
b.push(h1("5. Ce dont vous n'avez PAS besoin"));
b.push(bullet([{ t: "Pas de npm install : ", b: true }, { t: "aucune dépendance ajoutée aujourd'hui (package.json inchangé)." }]));
b.push(bullet([{ t: "Prod déjà à jour : ", b: true }, { t: "la migration et les données ont déjà été appliquées à Neon via le déploiement (rien à faire côté production)." }]));
b.push(spacer());

// 6. Notes
b.push(h1("6. À noter"));
b.push(bullet([{ t: "Connexion Google en local : ", b: true }, { t: "vos identifiants sont déjà dans votre fichier .env local, rien à refaire. Le .env n'est jamais synchronisé par Git (normal, il contient des secrets)." }]));
b.push(bullet([{ t: "Production : ", b: true }, { t: "déjà à jour (Neon). La réconciliation des données se ré-applique à chaque déploiement via le seed." }]));
b.push(bullet([{ t: "Salaires : ", b: true }, { t: "la mise à jour cible les offres de démo par identifiant ; elle ne touche pas les offres que vous créez vous-même (sauf si vous lancez apply-data-changes.cjs, qui les force toutes)." }]));

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
const outPath = path.join(process.cwd(), "Guide-Sync-Maison-2026-07-09.docx");
zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("Écrit :", outPath, "(" + buf.length + " octets)");
});
