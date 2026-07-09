/* Génère "Compte-Rendu-Nexus-2026-07-09.docx" : récapitulatif des changements
   du 09/07/2026 (compte démo + bouton SSO), avec la liste des fichiers à copier
   chez soi et les commandes à relancer. Même mise en forme que les guides. */
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
const h2 = (t) => para("Body", { t, b: true });
const p = (r) => para("Body", r);
const bullet = (r) => para("Bullet", r);
const code = (t) => para("Code", { t, code: true });
const spacer = () => para("Body", "");

const b = [];
b.push(title("Compte rendu — Modifications du 09/07/2026"));
b.push(p([{ t: "Objet : ", b: true }, { t: "changements apportés à la page de connexion et au compte de démonstration. Ce document liste ce qui a changé et les fichiers à copier chez vous pour mettre votre installation à jour. Généré le " }, { t: new Date().toLocaleDateString("fr-FR") }, { t: "." }]));
b.push(spacer());

b.push(h1("1. Ce qui a changé (en clair)"));
b.push(bullet([{ t: "Compte de démo renommé : ", b: true }, { t: "l'identifiant affiché et fonctionnel devient " }, { t: "samuel@test.io", code: true }, { t: " / " }, { t: "password123", code: true }, { t: " (à la place de sarah.j@techcorp.io). L'ancien compte Sarah reste valide, il n'est pas supprimé." }]));
b.push(bullet([{ t: "Bouton « SSO » retiré : ", b: true }, { t: "la page de connexion ne propose plus que le bouton " }, { t: "Google", code: true }, { t: " (déjà fonctionnel). Le bouton Google occupe désormais toute la largeur." }]));
b.push(bullet([{ t: "Nouveau compte en base : ", b: true }, { t: "l'utilisateur samuel@test.io (rôle RH, société TechCorp) est ajouté par le seed avec le mot de passe password123." }]));
b.push(bullet([{ t: "Documents et guides mis à jour : ", b: true }, { t: "toutes les références au compte démo pointent vers le nouvel identifiant ; les .docx / .xlsx ont été régénérés." }]));
b.push(bullet([{ t: "Ménage : ", b: true }, { t: "les anciens guides d'installation (Guide-Installation-Nexus-Talent.docx et sa v2) ont été supprimés." }]));
b.push(spacer());

b.push(h1("2. Fichiers modifiés à copier chez vous"));
b.push(p([{ t: "Copiez ces fichiers depuis la version à jour vers votre dossier local (en respectant l'arborescence) :" }]));
b.push(code("src/components/LoginView.tsx"));
b.push(code("prisma/seed.ts"));
b.push(code("README.md"));
b.push(code("COMPTE-RENDU-2026-07-08.md"));
b.push(code("scripts/gen-compte-rendu.cjs"));
b.push(code("scripts/gen-guide-deploy.cjs"));
b.push(code("scripts/gen-compte-rendu-2026-07-09.cjs"));
b.push(p([{ t: "Détail des deux fichiers importants : " }]));
b.push(bullet([{ t: "LoginView.tsx", code: true }, { t: " : texte de démo + suppression du bouton SSO (et nettoyage de l'import inutilisé)." }]));
b.push(bullet([{ t: "seed.ts", code: true }, { t: " : ajout de l'utilisateur samuel@test.io." }]));
b.push(spacer());

b.push(h1("3. Commandes à lancer après la copie"));
b.push(p([{ t: "1. ", b: true }, { t: "Créer le compte démo dans votre base (le seed n'ajoute que ce qui manque, il n'écrase rien) :" }]));
b.push(code("npx prisma db seed"));
b.push(p([{ t: "2. ", b: true }, { t: "Vérifier que le projet compile toujours :" }]));
b.push(code("npm run lint"));
b.push(p([{ t: "3. ", b: true }, { t: "(Optionnel) Régénérer les documents Word / Excel :" }]));
b.push(code("node scripts/gen-compte-rendu.cjs"));
b.push(code("node scripts/gen-guide-deploy.cjs"));
b.push(code("node scripts/gen-compte-rendu-2026-07-09.cjs"));
b.push(p([{ t: "Astuce : ", b: true }, { t: "si le serveur de dev tourne, arrêtez-le avant un prisma generate / migrate (il verrouille le moteur sous Windows). Pour un simple db seed, ce n'est pas nécessaire." }]));
b.push(spacer());

b.push(h1("4. Vérifier que tout marche"));
b.push(bullet([{ t: "Ouvrez la page de connexion : le texte affiche " }, { t: "Démo : samuel@test.io / password123", code: true }, { t: " et seul le bouton Google est présent." }]));
b.push(bullet([{ t: "Connectez-vous avec " }, { t: "samuel@test.io", code: true }, { t: " / " }, { t: "password123", code: true }, { t: " : l'accès à l'espace recruteur doit fonctionner." }]));
b.push(spacer());

b.push(h1("5. Mise en ligne — FAIT le 09/07/2026"));
b.push(p([{ t: "L'application est désormais déployée et fonctionnelle en ligne." }]));
b.push(bullet([{ t: "URL de production : ", b: true }, { t: "https://nexus-talent-zk0a.onrender.com" }]));
b.push(bullet([{ t: "Connexion démo : ", b: true }, { t: "samuel@test.io / password123 (testée, HTTP 200)." }]));
b.push(bullet([{ t: "Hébergement : ", b: true }, { t: "Render (serveur Node + front) + Neon (PostgreSQL). Migrations + seed appliqués au build." }]));
b.push(p([{ t: "Correctifs apportés pendant le déploiement (commités et poussés) :" }]));
b.push(bullet([{ t: "3923fd7", code: true }, { t: " — CORS tolère FRONTEND_URL avec ou sans slash final." }]));
b.push(bullet([{ t: "b56654f", code: true }, { t: " — CORS : normalisation agressive (trim espaces + slash + minuscules) et log de diagnostic des origines autorisées." }]));
b.push(p([{ t: "Cause racine du blocage de connexion : ", b: true }, { t: "une faute de frappe dans la variable FRONTEND_URL sur Render (.con au lieu de .com). Le log « [CORS] Origines autorisées » au démarrage permet de la repérer." }]));
b.push(spacer());

b.push(h1("6. Compléments du 09/07 — données, Google, permissions, sécurité"));
b.push(h2("Données"));
b.push(bullet([{ t: "Utilisateurs de démo Sarah Jenkins et Marc Antoine supprimés (local + prod)." }]));
b.push(bullet([{ t: "Salaires des offres uniformisés à « 3 000 000 Ariary » (réconciliation ciblée intégrée au seed)." }]));
b.push(h2("Connexion Google"));
b.push(bullet([{ t: "Activée en production : variables GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET sur Render + URL de redirection de prod ajoutée + email autorisé (liaison de compte, pas d'auto-inscription)." }]));
b.push(h2("Navigation par rôle"));
b.push(bullet([{ t: "Onglets « Utilisateurs » et « Paramètres » masqués pour le rôle RH ; visibles pour Admin et Manager." }]));
b.push(h2("Sécurité — verrouillage côté serveur"));
b.push(bullet([{ t: "GET /api/users : ", b: true }, { t: "réservé aux admins/managers (403 pour RH) + filtre par entreprise (corrige une fuite multi-entreprise : renvoyait tous les users de toutes les sociétés)." }]));
b.push(bullet([{ t: "GET /api/context : ", b: true }, { t: "la liste des utilisateurs n'est exposée qu'aux rôles de gestion (RH → liste vide)." }]));
b.push(bullet([{ t: "Déjà protégé : ", b: true }, { t: "création d'utilisateur, paramètres société et changement de contexte (admins) ; changement de mot de passe (self-only)." }]));
b.push(bullet([{ t: "Vérifié en prod : ", b: true }, { t: "RH → 403, Admin → 200. Le masquage des onglets est devenu une vraie barrière serveur." }]));
b.push(spacer());

b.push(h1("7. À noter"));
b.push(bullet([{ t: "Re-seed en prod : ", b: true }, { t: "si vous recréez la base, relancez le seed pour que samuel@test.io existe." }]));
b.push(bullet([{ t: "Bouton Google : ", b: true }, { t: "activé en prod ; il n'apparaît grisé que si GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET ne sont pas renseignés (ex. sur une autre installation)." }]));
b.push(bullet([{ t: "Plan gratuit : ", b: true }, { t: "le serveur s'endort après 15 min d'inactivité (réveil ~30-60 s au 1er accès) ; photos uploadées non persistantes." }]));
b.push(bullet([{ t: "SSO côté serveur : ", b: true }, { t: "seule l'interface a changé. La route serveur /api/auth/sso et la config SSO_* de .env.example existent toujours (inutilisées). À supprimer plus tard si souhaité." }]));
b.push(bullet([{ t: "Sécurité : ", b: true }, { t: "révoquer l'ancien token GitHub exposé (ghp_JLBr…) s'il ne l'est pas déjà." }]));

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
const outPath = path.join(process.cwd(), "Compte-Rendu-Nexus-2026-07-09.docx");
zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("Écrit :", outPath, "(" + buf.length + " octets)");
});
