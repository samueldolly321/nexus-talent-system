/* Génère "Guide-Mise-A-Jour-Maison.docx" : liste des fichiers à copier et
   commandes à lancer pour répliquer le commit sur une autre machine. */
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
const p = (r) => para("Body", r);
const bullet = (r) => para("Bullet", r);
const code = (t) => para("Code", { t, code: true });
const spacer = () => para("Body", "");
const fileItem = (pathStr, note) => para("Bullet", [{ t: pathStr, code: true }, ...(note ? [{ t: "  — " + note }] : [])]);

const blocks = [];

blocks.push(title("Guide — Répliquer les changements sur votre machine"));
blocks.push(p([{ t: "Objectif : ", b: true }, { t: "obtenir, sur votre installation à la maison, exactement la même application (reset mot de passe, boutons Google/SSO, refonte du login). Généré le " }, { t: new Date().toLocaleDateString("fr-FR") }]));
blocks.push(p([{ t: "Bonne nouvelle : ", b: true }, { t: "aucune nouvelle dépendance npm n'a été ajoutée. Vous n'avez donc PAS besoin de lancer npm install." }]));
blocks.push(spacer());

blocks.push(h1("Méthode recommandée : git (le plus simple)"));
blocks.push(p("Si votre machine à la maison utilise le même dépôt git, tout est déjà dans le commit. Il suffit de récupérer et d'appliquer la migration :"));
blocks.push(code("git pull origin main"));
blocks.push(p("Puis passez directement à la section « Commandes à exécuter » plus bas (arrêt du serveur, migration, redémarrage). La copie manuelle de fichiers ci-dessous n'est utile QUE si vous ne passez pas par git."));
blocks.push(spacer());

blocks.push(h1("Méthode manuelle : fichiers à copier-coller"));
blocks.push(p("Copiez ces fichiers depuis cette machine vers le même emplacement (même chemin) sur votre machine à la maison. Écrasez les versions existantes."));

blocks.push(para("Heading2", "A. Fichiers modifiés (à remplacer)"));
fileItemsModified().forEach((f) => blocks.push(fileItem(f[0], f[1])));

blocks.push(para("Heading2", "B. Fichiers nouveaux (à créer)"));
fileItemsNew().forEach((f) => blocks.push(fileItem(f[0], f[1])));

blocks.push(para("Heading2", "C. Fichiers optionnels (livrables, pas nécessaires au fonctionnement)"));
fileItemsOptional().forEach((f) => blocks.push(fileItem(f[0], f[1])));
blocks.push(spacer());

blocks.push(h1("Le fichier .env (secrets — à NE PAS copier tel quel)"));
blocks.push(p([{ t: "Le fichier " }, { t: ".env", code: true }, { t: " contient vos secrets et n'est pas dans le dépôt. Ne le copiez pas d'une machine à l'autre. À la place, sur la machine à la maison, ouvrez votre " }, { t: ".env", code: true }, { t: " et ajoutez (si vous voulez activer les fonctions) les mêmes clés que le modèle " }, { t: ".env.example", code: true }, { t: " :" }]));
blocks.push(code("RESEND_API_KEY=..."));
blocks.push(code("EMAIL_FROM=\"onboarding@resend.dev\""));
blocks.push(code("GOOGLE_CLIENT_ID=       (optionnel — bouton Google)"));
blocks.push(code("GOOGLE_CLIENT_SECRET=   (optionnel — bouton Google)"));
blocks.push(code("SSO_ISSUER=             (optionnel — bouton SSO)"));
blocks.push(code("SSO_CLIENT_ID=          (optionnel — bouton SSO)"));
blocks.push(code("SSO_CLIENT_SECRET=      (optionnel — bouton SSO)"));
blocks.push(p([{ t: "Sans ces clés, l'application fonctionne : les boutons Google/SSO restent grisés (« Bientôt ») et le lien de reset affiche le lien dans les logs du serveur." }]));
blocks.push(spacer());

blocks.push(h1("Commandes à exécuter (dans l'ordre)"));
blocks.push(p([{ t: "1. Arrêtez le serveur de développement s'il tourne ", b: true }, { t: "(Ctrl+C). Sous Windows, la génération Prisma échoue en « EPERM » si le serveur verrouille encore le moteur." }]));
blocks.push(p([{ t: "2. Appliquez la migration de base de données et régénérez le client Prisma :", b: true }]));
blocks.push(code("npx prisma migrate dev --name add_password_reset_tokens"));
blocks.push(p([{ t: "Cette commande crée/applique la migration (2 colonnes ajoutées à la table User) ET régénère le client. Si vous avez déjà copié le dossier de migration, elle détecte qu'il est présent et l'applique sans rien recréer." }]));
blocks.push(p([{ t: "Variante si la base est déjà à jour ailleurs : ", b: true }, { t: "npx prisma migrate deploy", code: true }, { t: " puis " }, { t: "npx prisma generate", code: true }, { t: "." }]));
blocks.push(p([{ t: "3. Redémarrez le serveur :", b: true }]));
blocks.push(code("npm run dev"));
blocks.push(spacer());

blocks.push(h1("Vérification"));
blocks.push(bullet("La page de connexion affiche le formulaire en pleine largeur et un panneau de droite enrichi (photo + cartes de stats)."));
blocks.push(bullet("« Mot de passe oublié ? » ouvre une fenêtre de demande d'email."));
blocks.push(bullet("Les boutons Google et SSO apparaissent (grisés « Bientôt » tant que non configurés)."));
blocks.push(bullet([{ t: "Contrôle technique (optionnel) : " }, { t: "npx tsc --noEmit", code: true }, { t: " ne doit renvoyer aucune erreur." }]));
blocks.push(spacer());

blocks.push(h1("Il reste : configurer le SSO (et Google)"));
blocks.push(p([{ t: "L'activation réelle des boutons Google et SSO se fait en renseignant les identifiants dans " }, { t: ".env", code: true }, { t: ". La marche à suivre détaillée (console Google Cloud, fournisseur OIDC Okta/Azure/Auth0, URI de redirection) est dans le document " }, { t: "Guide-Activer-Boutons-Login.docx", code: true }, { t: "." }]));
blocks.push(p([{ t: "Rappel URI de redirection à déclarer : " }, { t: ".../api/auth/google/callback", code: true }, { t: " et " }, { t: ".../api/auth/sso/callback", code: true }, { t: "." }]));

function fileItemsModified() {
  return [
    ["server.ts", "routes auth (reset, Google, SSO, providers)"],
    ["prisma/schema.prisma", "colonnes resetTokenHash / resetTokenExpiry"],
    ["src/App.tsx", "gestion des retours OAuth (?auth / ?authError)"],
    ["src/main.tsx", "route publique /reset-password"],
    ["src/components/LoginView.tsx", "formulaire pleine largeur, panneau enrichi, boutons câblés, modal reset"],
    ["src/components/SupportView.tsx", "FAQ mot de passe mise à jour"],
    [".env.example", "variables Google/SSO documentées"],
  ];
}
function fileItemsNew() {
  return [
    ["src/components/ResetPasswordView.tsx", "page de définition du nouveau mot de passe"],
    ["prisma/migrations/20260708125800_add_password_reset_tokens/migration.sql", "migration base de données"],
  ];
}
function fileItemsOptional() {
  return [
    ["Guide-Activer-Boutons-Login.docx", "guide de configuration Google/SSO"],
    ["scripts/gen-guide-boutons.cjs", "script qui régénère le guide ci-dessus"],
    ["scripts/gen-guide-sync.cjs", "script qui régénère CE document"],
  ];
}

// ---- Assemblage OOXML (identique au générateur du guide boutons) ----
const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
${blocks.join("\n")}
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

const outPath = path.join(process.cwd(), "Guide-Mise-A-Jour-Maison.docx");
zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("Écrit :", outPath, "(" + buf.length + " octets)");
});
