/* Génère "Guide-Mise-En-Ligne-De-A-a-Z.docx" : guide complet pour préparer le
   projet Git et déployer l'application en ligne (Render + Neon), de zéro,
   avec dépannage. Même mise en forme que les autres guides. */
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
b.push(title("Guide complet — Mettre le projet en ligne, de A à Z"));
b.push(p([{ t: "De la préparation du dépôt Git jusqu'à l'application en ligne (Render + Neon), avec dépannage. Suivez les parties dans l'ordre. Généré le " }, { t: new Date().toLocaleDateString("fr-FR") }, { t: "." }]));
b.push(spacer());

// -- Vue d'ensemble --
b.push(h1("Vue d'ensemble"));
b.push(bullet([{ t: "Render ", b: true }, { t: "héberge le serveur Node et sert l'interface (l'app complète)." }]));
b.push(bullet([{ t: "Neon ", b: true }, { t: "héberge la base de données PostgreSQL (gratuit, sans carte bancaire)." }]));
b.push(bullet([{ t: "GitHub ", b: true }, { t: "stocke le code ; Render y lit le fichier render.yaml et redéploie à chaque git push." }]));
b.push(p([{ t: "Durée : ", b: true }, { t: "~20-30 minutes la première fois. Aucune carte bancaire requise." }]));
b.push(spacer());

// -- Partie 0 --
b.push(h1("Partie 0 — Prérequis (une seule fois)"));
b.push(bullet("Un compte GitHub."));
b.push(bullet([{ t: "Git installé sur votre PC. Vérifiez avec " }, { t: "git --version", code: true }, { t: "." }]));
b.push(bullet([{ t: "Node.js installé (pour lancer/tester en local). Vérifiez avec " }, { t: "node --version", code: true }, { t: "." }]));
b.push(spacer());

// -- Partie 1 : préparer le projet Git --
b.push(h1("Partie 1 — Préparer le projet Git"));

b.push(h2("1.1 — Vérifier les fichiers indispensables au déploiement"));
b.push(bullet([{ t: "render.yaml", code: true }, { t: " à la racine (décrit le service Render : build, migrations, seed, démarrage). Déjà présent dans ce projet." }]));
b.push(bullet([{ t: ".gitignore", code: true }, { t: " doit contenir " }, { t: "node_modules", code: true }, { t: " et " }, { t: ".env", code: true }, { t: " (à NE JAMAIS versionner)." }]));
b.push(bullet([{ t: "prisma/migrations/", code: true }, { t: " doit être présent et versionné (Render applique ces migrations sur Neon)." }]));
b.push(bullet([{ t: ".env.example", code: true }, { t: " documente les variables attendues (sans valeurs secrètes)." }]));

b.push(h2("1.2 — Protéger les secrets"));
b.push(p([{ t: "Ne committez JAMAIS le fichier ", b: true }, { t: ".env", code: true }, { t: " ni une chaîne de connexion : toutes les valeurs sensibles vont dans les variables d'environnement de Render. Si un token/clé a déjà été exposé, révoquez-le." }]));

b.push(h2("1.3 — Vérifier que le projet compile"));
b.push(code("npm install"));
b.push(code("npm run lint"));
b.push(p([{ t: "Corrigez toute erreur avant de continuer : un projet qui ne compile pas ne se déploiera pas." }]));

b.push(h2("1.4 — Créer le dépôt et pousser sur GitHub"));
b.push(p([{ t: "Si ce n'est pas déjà un dépôt Git :" }]));
b.push(code("git init"));
b.push(code("git add ."));
b.push(code('git commit -m "Version initiale prête à déployer"'));
b.push(p([{ t: "Créez un dépôt (privé de préférence) sur github.com, puis reliez-le et poussez :" }]));
b.push(code("git remote add origin https://github.com/VOTRE-COMPTE/VOTRE-DEPOT.git"));
b.push(code("git branch -M main"));
b.push(code("git push -u origin main"));
b.push(p([{ t: "Note : ", b: true }, { t: "pour un dépôt privé, GitHub demandera vos identifiants (une fenêtre s'ouvre, ou un token personnel). Une fois mémorisés, les push suivants sont automatiques." }]));
b.push(spacer());

// -- Partie 2 : Neon --
b.push(h1("Partie 2 — Créer la base de données (Neon)"));
b.push(p([{ t: "1. ", b: true }, { t: "Allez sur " }, { t: "https://neon.tech", code: true }, { t: " → Sign up (connexion avec GitHub possible)." }]));
b.push(p([{ t: "2. ", b: true }, { t: "Create project → région Europe (ex. Frankfurt) → options par défaut." }]));
b.push(p([{ t: "3. ", b: true }, { t: "Bouton Connect → copiez la Connection string. Elle ressemble à :" }]));
b.push(code("postgresql://user:MOT_DE_PASSE@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"));
b.push(bullet([{ t: "Choisissez la connexion « Direct » ", b: true }, { t: "(non « Pooled ») : le pooling peut faire échouer les migrations." }]));
b.push(bullet([{ t: "Activez « Show password » ", b: true }, { t: "sinon la chaîne contient des étoiles (inutilisable). Si raté : Roles → Reset password." }]));
b.push(p([{ t: "4. ", b: true }, { t: "Gardez cette chaîne de côté : ce sera la variable " }, { t: "DATABASE_URL", code: true }, { t: " sur Render." }]));
b.push(spacer());

// -- Partie 3 : Render --
b.push(h1("Partie 3 — Déployer sur Render"));
b.push(p([{ t: "1. ", b: true }, { t: "Allez sur " }, { t: "https://render.com", code: true }, { t: " → Get Started (connexion GitHub, pas de carte bancaire pour le plan gratuit)." }]));
b.push(p([{ t: "2. ", b: true }, { t: "Créez un workspace (nom au choix, plan Individual/Free)." }]));
b.push(p([{ t: "3. ", b: true }, { t: "New + → Blueprint → autorisez l'accès à votre dépôt GitHub → sélectionnez-le. Render détecte " }, { t: "render.yaml", code: true }, { t: "." }]));
b.push(p([{ t: "4. ", b: true }, { t: "Champs du Blueprint :" }]));
b.push(bullet([{ t: "Blueprint Name : ", b: true }, { t: "un libellé au choix." }]));
b.push(bullet([{ t: "Blueprint Path : ", b: true }, { t: "laisser VIDE (render.yaml est à la racine)." }]));
b.push(p([{ t: "5. ", b: true }, { t: "Renseignez les variables demandées :" }]));
b.push(bullet([{ t: "DATABASE_URL", code: true }, { t: " → la chaîne Neon de la Partie 2." }]));
b.push(bullet([{ t: "FRONTEND_URL", code: true }, { t: " → laisser VIDE pour l'instant (Partie 4)." }]));
b.push(bullet([{ t: "GEMINI_API_KEY", code: true }, { t: " → clé Gemini (optionnel : sans elle l'analyse IA est inactive, le reste marche)." }]));
b.push(bullet([{ t: "RESEND_API_KEY", code: true }, { t: " → optionnel (emails)." }]));
b.push(p([{ t: "(Les secrets JWT sont générés automatiquement par Render.)" }]));
b.push(p([{ t: "6. ", b: true }, { t: "Apply. Render installe, applique les migrations, exécute le seed (crée le compte démo), puis build. Suivez l'onglet Logs." }]));
b.push(p([{ t: "7. ", b: true }, { t: "À la fin, Render affiche l'URL publique, ex. " }, { t: "https://nexus-talent-xxxx.onrender.com", code: true }, { t: "." }]));
b.push(spacer());

// -- Partie 4 : FRONTEND_URL --
b.push(h1("Partie 4 — Renseigner FRONTEND_URL (ÉTAPE CRITIQUE)"));
b.push(p([{ t: "C'est l'étape qui fait échouer 9 déploiements sur 10. Prenez-la au sérieux.", b: true }]));
b.push(p([{ t: "1. ", b: true }, { t: "Copiez l'URL EXACTE affichée par Render (Partie 3, point 7)." }]));
b.push(p([{ t: "2. ", b: true }, { t: "Render → votre service → Environment → variable " }, { t: "FRONTEND_URL", code: true }, { t: " → collez l'URL → Save Changes." }]));
b.push(p([{ t: "3. ", b: true }, { t: "Render redéploie. Attendez le statut « Deploy live » avant de tester." }]));
b.push(h2("Les 3 pièges à éviter absolument"));
b.push(bullet([{ t: "Le slash final : ", b: true }, { t: "…onrender.com et non …onrender.com/. (Ce projet tolère désormais le slash, mais restez propre.)" }]));
b.push(bullet([{ t: "La faute de frappe : ", b: true }, { t: "vérifiez lettre par lettre. Un « .con » au lieu de « .com » suffit à tout bloquer." }]));
b.push(bullet([{ t: "http vs https / espace parasite : ", b: true }, { t: "toujours https, aucun espace avant/après." }]));
b.push(p([{ t: "Vérification : ", b: true }, { t: "au démarrage, les logs affichent « [CORS] Origines autorisées : [...] ». La valeur affichée DOIT être identique à votre URL Render. Si elle diffère (typo, slash, localhost), corrigez FRONTEND_URL." }]));
b.push(spacer());

// -- Partie 5 : Tester --
b.push(h1("Partie 5 — Tester"));
b.push(p([{ t: "1. ", b: true }, { t: "Ouvrez l'URL de l'app. Au 1er accès, le serveur gratuit « se réveille » : 30-60 s de chargement, c'est normal." }]));
b.push(p([{ t: "2. ", b: true }, { t: "Connectez-vous avec le compte de démo créé par le seed :" }]));
b.push(code("Email : samuel@test.io"));
b.push(code("Mot de passe : password123"));
b.push(p([{ t: "3. ", b: true }, { t: "Si l'accès à l'espace recruteur fonctionne : c'est en ligne. Le bouton Google reste grisé tant que ses clés ne sont pas configurées (normal)." }]));
b.push(spacer());

// -- Partie 6 : Dépannage --
b.push(h1("Partie 6 — Dépannage"));
b.push(bullet([{ t: "« Impossible de joindre le serveur » au login : ", b: true }, { t: "problème CORS = FRONTEND_URL ne correspond pas à l'URL réelle. Ouvrez les Logs, lisez « [CORS] Origines autorisées », comparez à l'URL, corrigez la variable (slash, typo .con/.com, espace)." }]));
b.push(bullet([{ t: "« Identifiants invalides » : ", b: true }, { t: "le compte n'existe pas (seed non exécuté) ou mot de passe erroné. Relancez un déploiement (Manual Deploy → Clear build cache & deploy)." }]));
b.push(bullet([{ t: "Build échoue « esbuild/prisma introuvable » : ", b: true }, { t: "la commande de build doit contenir --include=dev (déjà dans render.yaml ; vérifiez qu'il est bien poussé)." }]));
b.push(bullet([{ t: "Erreur de migration liée au pooling : ", b: true }, { t: "utilisez la connexion Neon « Direct » (non-pooled) pour DATABASE_URL." }]));
b.push(bullet([{ t: "Page lente au 1er accès : ", b: true }, { t: "normal sur le plan gratuit (réveil du serveur endormi). Patientez 30-60 s." }]));
b.push(bullet([{ t: "Astuce diagnostic : ", b: true }, { t: "tester l'API sans navigateur avec curl permet d'isoler CORS vs login (une requête sans en-tête Origin contourne CORS)." }]));
b.push(spacer());

// -- Partie 7 : mises à jour --
b.push(h1("Partie 7 — Mettre à jour l'application plus tard"));
b.push(p([{ t: "Render redéploie automatiquement à chaque push sur la branche main :" }]));
b.push(code("git add ."));
b.push(code('git commit -m "Description du changement"'));
b.push(code("git push origin main"));
b.push(bullet([{ t: "Changement de code seul : ", b: true }, { t: "rien de plus à faire, Render rebuild." }]));
b.push(bullet([{ t: "Changement du schéma de base (schema.prisma) : ", b: true }, { t: "une nouvelle migration doit être créée en local (npx prisma migrate dev) et poussée ; le build Render applique migrate deploy automatiquement." }]));
b.push(bullet([{ t: "Nouvelles données de démo : ", b: true }, { t: "le seed est idempotent (n'écrase rien) et s'exécute à chaque build." }]));
b.push(spacer());

// -- Partie 8 : limitations & sécurité --
b.push(h1("Partie 8 — Limitations du plan gratuit & sécurité"));
b.push(bullet([{ t: "Mise en veille : ", b: true }, { t: "serveur et base s'endorment après ~15 min d'inactivité (réveil 30-60 s)." }]));
b.push(bullet([{ t: "Photos non persistantes : ", b: true }, { t: "le disque Render est réinitialisé à chaque redéploiement (les données restent dans Neon)." }]));
b.push(bullet([{ t: "Secrets : ", b: true }, { t: "jamais dans Git ; uniquement dans les variables Render. Révoquez tout token/clé exposé." }]));
b.push(bullet([{ t: "Dépôt privé : ", b: true }, { t: "recommandé pour éviter d'exposer le code et la configuration." }]));

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
const outPath = path.join(process.cwd(), "Guide-Mise-En-Ligne-De-A-a-Z.docx");
zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("Écrit :", outPath, "(" + buf.length + " octets)");
});
