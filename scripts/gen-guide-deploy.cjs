/* Génère "Guide-Deploiement-Gratuit-Render-Neon.docx" : déployer l'app en ligne
   gratuitement (Render pour le serveur Node + Neon pour PostgreSQL). */
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
b.push(title("Guide — Mettre l'application en ligne gratuitement (Render + Neon)"));
b.push(p([{ t: "Pour tester ", b: true }, { t: "votre application sur Internet, sans frais. Render héberge le serveur (Node), Neon fournit la base PostgreSQL. Les deux se connectent à votre dépôt GitHub. Généré le " }, { t: new Date().toLocaleDateString("fr-FR") }]));
b.push(spacer());

b.push(h1("Pourquoi deux services ?"));
b.push(bullet([{ t: "Render ", b: true }, { t: "= exécute votre serveur Node et sert l'interface. (GitHub Pages ne convient PAS : il ne fait que du statique, sans serveur ni base.)" }]));
b.push(bullet([{ t: "Neon ", b: true }, { t: "= héberge la base de données PostgreSQL (gratuit, sans carte bancaire)." }]));
b.push(spacer());

b.push(h1("Étape 0 — Prérequis"));
b.push(bullet("Un compte GitHub (vous en avez déjà un) avec le code poussé sur le dépôt."));
b.push(bullet([{ t: "Le fichier " }, { t: "render.yaml", code: true }, { t: " doit être présent à la racine et poussé (il configure tout le déploiement). Il est déjà créé." }]));
b.push(p([{ t: "Poussez d'abord le code (le déploiement se fait depuis GitHub) :" }]));
b.push(code("git push origin main"));
b.push(spacer());

b.push(h1("Étape 1 — Créer la base de données (Neon)"));
b.push(p([{ t: "1. ", b: true }, { t: "Allez sur " }, { t: "https://neon.tech", code: true }, { t: " et créez un compte (bouton « Sign up », connexion avec GitHub possible)." }]));
b.push(p([{ t: "2. ", b: true }, { t: "Créez un projet (« Create project »). Laissez les options par défaut, choisissez une région proche (ex. Europe)." }]));
b.push(p([{ t: "3. ", b: true }, { t: "Sur le tableau de bord du projet, cliquez « Connect » : Neon affiche une chaîne de connexion qui ressemble à :" }]));
b.push(code("postgresql://user:motdepasse@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"));
b.push(p([{ t: "4. ", b: true }, { t: "Copiez cette chaîne : ce sera la variable " }, { t: "DATABASE_URL", code: true }, { t: " sur Render. Gardez-la de côté." }]));
b.push(spacer());

b.push(h1("Étape 2 — Déployer sur Render (via Blueprint)"));
b.push(p([{ t: "1. ", b: true }, { t: "Allez sur " }, { t: "https://render.com", code: true }, { t: " et créez un compte (« Get Started », connexion avec GitHub — aucune carte bancaire requise pour le plan gratuit)." }]));
b.push(p([{ t: "2. ", b: true }, { t: "Autorisez Render à accéder à votre dépôt GitHub " }, { t: "nexus-talent-system", code: true }, { t: "." }]));
b.push(p([{ t: "3. ", b: true }, { t: "Cliquez « New + » → « Blueprint ». Sélectionnez votre dépôt. Render détecte automatiquement " }, { t: "render.yaml", code: true }, { t: "." }]));
b.push(p([{ t: "4. ", b: true }, { t: "Render vous demande de renseigner les variables marquées « à définir ». Remplissez :" }]));
b.push(bullet([{ t: "DATABASE_URL", code: true }, { t: " → collez la chaîne Neon de l'étape 1." }]));
b.push(bullet([{ t: "FRONTEND_URL", code: true }, { t: " → laissez vide pour l'instant (on la remplit à l'étape 3), OU mettez l'URL prévue " }, { t: "https://nexus-talent.onrender.com", code: true }, { t: "." }]));
b.push(bullet([{ t: "GEMINI_API_KEY", code: true }, { t: " → votre clé Gemini (optionnel : sans elle, l'analyse IA ne marche pas, mais la connexion et le reste oui)." }]));
b.push(bullet([{ t: "RESEND_API_KEY", code: true }, { t: " → optionnel (emails)." }]));
b.push(p([{ t: "(Les secrets JWT sont générés automatiquement par Render, vous n'avez rien à faire.)" }]));
b.push(p([{ t: "5. ", b: true }, { t: "Cliquez « Apply ». Render installe, applique les migrations, crée le compte de démo et construit l'app. Comptez quelques minutes (suivez les logs)." }]));
b.push(spacer());

b.push(h1("Étape 3 — Renseigner l'URL publique (IMPORTANT)"));
b.push(p([{ t: "Une fois le premier déploiement terminé, Render affiche l'URL de votre app en haut (ex. " }, { t: "https://nexus-talent.onrender.com", code: true }, { t: ")." }]));
b.push(p([{ t: "1. ", b: true }, { t: "Copiez cette URL exacte." }]));
b.push(p([{ t: "2. ", b: true }, { t: "Dans Render : votre service → onglet « Environment » → variable " }, { t: "FRONTEND_URL", code: true }, { t: " → collez l'URL → « Save Changes »." }]));
b.push(p([{ t: "3. ", b: true }, { t: "Render redéploie automatiquement. " }, { t: "Sans cette étape, la connexion échoue", b: true }, { t: " (le serveur refuse les requêtes d'une origine inconnue)." }]));
b.push(spacer());

b.push(h1("Étape 4 — Tester"));
b.push(p([{ t: "Ouvrez l'URL de l'app. La page de connexion s'affiche. Connectez-vous avec le compte de démo créé par le seed :" }]));
b.push(code("Email : samuel@test.io"));
b.push(code("Mot de passe : password123"));
b.push(p([{ t: "Astuce : ", b: true }, { t: "au tout premier accès (ou après 15 min d'inactivité), le serveur gratuit « se réveille » — la page peut mettre 30 à 60 secondes à charger. C'est normal." }]));
b.push(spacer());

b.push(h1("Limitations du plan gratuit (à connaître)"));
b.push(bullet([{ t: "Mise en veille : ", b: true }, { t: "le serveur Render s'endort après 15 min sans visite ; le réveil prend ~30-60 s. Parfait pour une démo, pas pour de la production." }]));
b.push(bullet([{ t: "Photos non persistantes : ", b: true }, { t: "les photos de profil uploadées sont stockées sur le disque du serveur, qui est réinitialisé à chaque redéploiement. Elles disparaîtront (le reste des données est dans Neon, donc conservé)." }]));
b.push(bullet([{ t: "Neon : ", b: true }, { t: "la base se met aussi en veille après inactivité et se réveille en quelques secondes." }]));
b.push(spacer());

b.push(h1("Dépannage"));
b.push(bullet([{ t: "Build échoue « esbuild/prisma introuvable » : ", b: true }, { t: "la commande de build doit contenir --include=dev. C'est déjà le cas dans render.yaml ; vérifiez qu'il a bien été poussé." }]));
b.push(bullet([{ t: "Connexion refusée / « Origine non autorisée » : ", b: true }, { t: "la variable FRONTEND_URL ne correspond pas exactement à l'URL Render (attention à https et à l'absence de / final). Corrigez et sauvegardez." }]));
b.push(bullet([{ t: "Erreur de migration liée au pooling Neon : ", b: true }, { t: "dans Neon, prenez la chaîne de connexion « direct » (non-pooled) pour DATABASE_URL, ou ajoutez sslmode=require." }]));
b.push(bullet([{ t: "Base vide / impossible de se connecter : ", b: true }, { t: "le seed n'a pas tourné. Relancez un déploiement (Manual Deploy → Clear build cache & deploy)." }]));
b.push(spacer());

b.push(h1("Sécurité — à faire absolument"));
b.push(bullet([{ t: "Révoquez le token GitHub exposé dans l'URL du dépôt ", b: true }, { t: "(GitHub → Settings → Developer settings → Personal access tokens), puis reconfigurez le remote sans token." }]));
b.push(bullet([{ t: "Ne committez jamais le fichier " }, { t: ".env", code: true }, { t: " ni la chaîne Neon : toutes les valeurs sensibles se mettent uniquement dans les variables d'environnement Render." }]));

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
const outPath = path.join(process.cwd(), "Guide-Deploiement-Gratuit-Render-Neon.docx");
zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("Écrit :", outPath, "(" + buf.length + " octets)");
});
