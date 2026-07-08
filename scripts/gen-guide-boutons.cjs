/* Génère un guide .docx (Word) expliquant comment activer les boutons de
   connexion Google / SSO et le flux "mot de passe oublié". Utilise jszip
   (déjà présent dans node_modules) pour assembler un OOXML valide. */
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Un "run" = morceau de texte avec attributs. b=gras, code=police mono + fond gris.
function run(r) {
  const t = typeof r === "string" ? { t: r } : r;
  const rpr = [];
  if (t.b) rpr.push("<w:b/>");
  if (t.code) rpr.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:shd w:val="clear" w:fill="EEF2F7"/>');
  if (t.color) rpr.push(`<w:color w:val="${t.color}"/>`);
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
const p = (runs) => para("Body", runs);
const bullet = (runs) => para("Bullet", runs);
const code = (t) => para("Code", { t, code: true });
const spacer = () => para("Body", "");

const appName = "Nexus Talent";
const blocks = [];

blocks.push(title(`Guide — Activer les connexions Google, SSO et « Mot de passe oublié »`));
blocks.push(p([{ t: `${appName} — Espace Recruteur`, b: true }, { t: "  •  Document généré le " + new Date().toLocaleDateString("fr-FR") }]));
blocks.push(spacer());

blocks.push(p("Ce guide explique, étape par étape, comment rendre pleinement fonctionnels les trois mécanismes de connexion ajoutés à l'écran de login : la réinitialisation de mot de passe par email, le bouton Google et le bouton SSO. Aucune compétence de développement n'est requise : il s'agit uniquement de créer des identifiants chez des fournisseurs, puis de les coller dans le fichier de configuration."));
blocks.push(spacer());

// --- Comprendre ---
blocks.push(h1("1. Comment ça marche (à lire une fois)"));
blocks.push(bullet([{ t: "Boutons désactivés par défaut : ", b: true }, { t: "tant que les identifiants ne sont pas fournis, les boutons Google et SSO s'affichent grisés avec l'étiquette « Bientôt ». Dès que vous ajoutez les identifiants et redémarrez le serveur, ils s'activent automatiquement." }]));
blocks.push(bullet([{ t: "Liaison de compte : ", b: true }, { t: "un utilisateur ne peut se connecter avec Google ou SSO que si son adresse email existe déjà dans l'application (créée par un administrateur). Il n'y a pas d'inscription automatique." }]));
blocks.push(bullet([{ t: "Fichier de configuration : ", b: true }, { t: "toutes les valeurs se collent dans un fichier nommé " }, { t: ".env", code: true }, { t: " situé à la racine du projet. Un modèle commenté est fourni : " }, { t: ".env.example", code: true }, { t: "." }]));
blocks.push(bullet([{ t: "Après CHAQUE modification du fichier " }, { t: ".env", code: true }, { t: ", il faut redémarrer le serveur pour qu'elle soit prise en compte." }]));
blocks.push(spacer());

// --- Prérequis ---
blocks.push(h1("2. Prérequis"));
blocks.push(bullet("Avoir accès au fichier .env du projet (racine de l'application)."));
blocks.push(bullet([{ t: "Définir l'adresse publique de l'application dans " }, { t: "FRONTEND_URL", code: true }, { t: ". En développement local, laissez vide (l'application utilise alors " }, { t: "http://localhost:3000", code: true }, { t: "). En production, mettez votre domaine, ex. " }, { t: "https://recrutement.mon-entreprise.com", code: true }, { t: "." }]));
blocks.push(p([{ t: "Important : ", b: true }, { t: "l'adresse " }, { t: "FRONTEND_URL", code: true }, { t: " sert à construire les « URI de redirection » que vous déclarerez chez Google et votre fournisseur SSO. Elle doit correspondre exactement à l'adresse par laquelle vos utilisateurs accèdent à l'application." }]));
blocks.push(spacer());

// --- Etape A : mot de passe oublié ---
blocks.push(h1("3. Mot de passe oublié (envoi d'email)"));
blocks.push(p("Le lien « Mot de passe oublié ? » fonctionne déjà. Pour que l'email soit réellement envoyé (et pas seulement affiché dans les logs du serveur), configurez le service d'envoi Resend :"));
blocks.push(p([{ t: "Étape 1. ", b: true }, { t: "Créez un compte gratuit sur " }, { t: "https://resend.com", code: true }, { t: "." }]));
blocks.push(p([{ t: "Étape 2. ", b: true }, { t: "Générez une clé API sur " }, { t: "https://resend.com/api-keys", code: true }, { t: "." }]));
blocks.push(p([{ t: "Étape 3. ", b: true }, { t: "Dans le fichier " }, { t: ".env", code: true }, { t: ", renseignez :" }]));
blocks.push(code('RESEND_API_KEY=re_votre_cle_ici'));
blocks.push(code('EMAIL_FROM="onboarding@resend.dev"'));
blocks.push(p([{ t: "Note : " }, { t: "onboarding@resend.dev", code: true }, { t: " fonctionne immédiatement pour des tests. En production, utilisez une adresse d'un domaine que vous aurez vérifié dans Resend." }]));
blocks.push(p([{ t: "Sans clé Resend, le flux reste utilisable : le lien de réinitialisation apparaît dans les logs du serveur (ligne commençant par " }, { t: "[email]", code: true }, { t: "), vous pouvez le copier-coller dans un navigateur." }]));
blocks.push(spacer());

// --- Etape B : Google ---
blocks.push(h1("4. Activer le bouton Google"));
blocks.push(p([{ t: "Étape 1. ", b: true }, { t: "Ouvrez la console Google Cloud : " }, { t: "https://console.cloud.google.com/apis/credentials", code: true }, { t: "." }]));
blocks.push(p([{ t: "Étape 2. ", b: true }, { t: "Créez un projet (ou sélectionnez-en un existant) en haut de la page." }]));
blocks.push(p([{ t: "Étape 3. ", b: true }, { t: "Configurez l'« écran de consentement OAuth » (OAuth consent screen) si ce n'est pas déjà fait : type « Externe », renseignez le nom de l'application et votre email de support." }]));
blocks.push(p([{ t: "Étape 4. ", b: true }, { t: "Cliquez « Créer des identifiants » → « ID client OAuth » → type d'application « Application Web »." }]));
blocks.push(p([{ t: "Étape 5. ", b: true }, { t: "Dans « URI de redirection autorisés », ajoutez EXACTEMENT :" }]));
blocks.push(code('http://localhost:3000/api/auth/google/callback'));
blocks.push(p([{ t: "En production, ajoutez aussi la version avec votre domaine, ex. " }, { t: "https://votre-domaine.com/api/auth/google/callback", code: true }, { t: "." }]));
blocks.push(p([{ t: "Étape 6. ", b: true }, { t: "Validez. Google affiche un « ID client » et un « Code secret du client ». Copiez-les dans " }, { t: ".env", code: true }, { t: " :" }]));
blocks.push(code('GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com'));
blocks.push(code('GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx'));
blocks.push(p([{ t: "Étape 7. ", b: true }, { t: "Redémarrez le serveur. Le bouton Google devient actif." }]));
blocks.push(p([{ t: "Rappel : ", b: true }, { t: "l'utilisateur Google doit avoir la même adresse email qu'un compte déjà créé dans l'application, sinon la connexion est refusée avec le message « Aucun compte n'est associé à cette adresse »." }]));
blocks.push(spacer());

// --- Etape C : SSO ---
blocks.push(h1("5. Activer le bouton SSO (entreprise)"));
blocks.push(p("Le SSO fonctionne avec tout fournisseur d'identité compatible OpenID Connect (Okta, Microsoft Entra ID / Azure AD, Auth0, Keycloak, Google Workspace, etc.)."));
blocks.push(p([{ t: "Étape 1. ", b: true }, { t: "Chez votre fournisseur d'identité, créez une application « OIDC / Web »." }]));
blocks.push(p([{ t: "Étape 2. ", b: true }, { t: "Déclarez l'URI de redirection (Redirect URI / Callback URL) :" }]));
blocks.push(code('http://localhost:3000/api/auth/sso/callback'));
blocks.push(p([{ t: "(en production : " }, { t: "https://votre-domaine.com/api/auth/sso/callback", code: true }, { t: ")." }]));
blocks.push(p([{ t: "Étape 3. ", b: true }, { t: "Le fournisseur vous donne trois informations. Reportez-les dans " }, { t: ".env", code: true }, { t: " :" }]));
blocks.push(code('SSO_ISSUER=https://votre-tenant.okta.com'));
blocks.push(code('SSO_CLIENT_ID=votre_client_id'));
blocks.push(code('SSO_CLIENT_SECRET=votre_client_secret'));
blocks.push(p([{ t: "L'« Issuer » est l'URL de base du fournisseur. L'application lit automatiquement " }, { t: "<Issuer>/.well-known/openid-configuration", code: true }, { t: " pour découvrir les points d'accès — vous n'avez rien d'autre à configurer." }]));
blocks.push(p([{ t: "Exemples d'Issuer : " }, { t: "Okta ", b: true }, { t: "→ https://xxx.okta.com  |  " }, { t: "Azure AD ", b: true }, { t: "→ https://login.microsoftonline.com/<tenant-id>/v2.0  |  " }, { t: "Auth0 ", b: true }, { t: "→ https://xxx.eu.auth0.com" }]));
blocks.push(p([{ t: "Étape 4. ", b: true }, { t: "Redémarrez le serveur. Le bouton SSO devient actif." }]));
blocks.push(spacer());

// --- Redémarrage ---
blocks.push(h1("6. Redémarrer le serveur"));
blocks.push(p("Après avoir enregistré le fichier .env, arrêtez puis relancez le serveur :"));
blocks.push(code('npm run dev'));
blocks.push(spacer());

// --- Dépannage ---
blocks.push(h1("7. Dépannage (messages d'erreur)"));
blocks.push(p("Si la connexion échoue, un message s'affiche sous le formulaire. Voici la signification des cas les plus courants :"));
blocks.push(bullet([{ t: "« Aucun compte n'est associé à cette adresse » : ", b: true }, { t: "l'email du compte Google/SSO n'existe pas encore dans l'application. Demandez à un administrateur de créer l'utilisateur (vue Utilisateurs) avec cette adresse." }]));
blocks.push(bullet([{ t: "« La connexion Google/SSO n'est pas configurée » : ", b: true }, { t: "les variables correspondantes sont absentes du .env, ou le serveur n'a pas été redémarré." }]));
blocks.push(bullet([{ t: "Erreur « redirect_uri_mismatch » côté Google : ", b: true }, { t: "l'URI de redirection déclarée ne correspond pas exactement (attention à http vs https, au port, et au chemin /api/auth/google/callback)." }]));
blocks.push(bullet([{ t: "« Configuration SSO invalide » : ", b: true }, { t: "l'Issuer est incorrect ou injoignable. Vérifiez que l'adresse <Issuer>/.well-known/openid-configuration s'ouvre bien dans un navigateur." }]));
blocks.push(spacer());

// --- Sécurité ---
blocks.push(h1("8. Sécurité — à ne pas oublier"));
blocks.push(bullet([{ t: "Ne partagez jamais et ne versionnez jamais le fichier " }, { t: ".env", code: true }, { t: " (il contient des secrets)." }]));
blocks.push(bullet("Régénérez immédiatement un secret client s'il a été exposé."));
blocks.push(bullet([{ t: "En production, définissez des valeurs aléatoires pour " }, { t: "JWT_ACCESS_SECRET", code: true }, { t: " et " }, { t: "JWT_REFRESH_SECRET", code: true }, { t: "." }]));

// ---- Assemblage OOXML ----
const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
${blocks.join("\n")}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>
</w:body></w:document>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Body"><w:name w:val="Body"/><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:color w:val="1E3A8A"/><w:sz w:val="40"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="240" w:after="120"/><w:keepNext/></w:pPr><w:rPr><w:b/><w:color w:val="2563EB"/><w:sz w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:spacing w:before="160" w:after="80"/><w:keepNext/></w:pPr><w:rPr><w:b/><w:color w:val="334155"/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Bullet"><w:name w:val="Bullet"/><w:pPr><w:spacing w:after="80"/><w:ind w:left="360" w:hanging="360"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:pPr><w:spacing w:after="120"/><w:ind w:left="240"/><w:shd w:val="clear" w:fill="EEF2F7"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/></w:rPr></w:style>
</w:styles>`;

// Puce visuelle : les paragraphes "Bullet" reçoivent un tiret en préfixe simple.
const documentWithBullets = documentXml.replace(/(<w:pStyle w:val="Bullet"\/><\/w:pPr>)(<w:r>)/g, '$1<w:r><w:t xml:space="preserve">•  </w:t></w:r>$2');

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const zip = new JSZip();
zip.file("[Content_Types].xml", contentTypes);
zip.folder("_rels").file(".rels", rels);
const word = zip.folder("word");
word.file("document.xml", documentWithBullets);
word.file("styles.xml", stylesXml);
word.folder("_rels").file("document.xml.rels", docRels);

const outPath = path.join(process.cwd(), "Guide-Activer-Boutons-Login.docx");
zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("Écrit :", outPath, "(" + buf.length + " octets)");
});
