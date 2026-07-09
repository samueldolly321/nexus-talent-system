/* Génère "info-serveur.docx" : tout sur l'hébergement gratuit actuel
   (Render + Neon), ses limites, et la marche à suivre pour passer en payant. */
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
b.push(title("Infos serveur — hébergement gratuit & passage en payant"));
b.push(p([{ t: "Tout sur l'hébergement actuel de l'application, ses limites, et comment évoluer vers une offre payante. Généré le " }, { t: new Date().toLocaleDateString("fr-FR") }, { t: "." }]));
b.push(p([{ t: "Note : ", b: true }, { t: "les prix et quotas des plans gratuits/payants évoluent régulièrement — vérifiez toujours les valeurs à jour sur render.com/pricing et neon.tech/pricing." }]));
b.push(spacer());

// 1. Hébergement actuel
b.push(h1("1. Hébergement actuel (gratuit)"));
b.push(bullet([{ t: "Application (serveur Node + interface) : ", b: true }, { t: "Render — plan Free." }]));
b.push(bullet([{ t: "Base de données PostgreSQL : ", b: true }, { t: "Neon — plan Free." }]));
b.push(bullet([{ t: "URL de production : ", b: true }, { t: "https://nexus-talent-zk0a.onrender.com" }]));
b.push(bullet([{ t: "Régions : ", b: true }, { t: "serveur Render à Oregon (USA), base Neon à Francfort (Europe). Les deux ne sont pas au même endroit → un peu de latence (voir §3)." }]));
b.push(bullet([{ t: "Coût actuel : ", b: true }, { t: "0 € / mois, sans carte bancaire." }]));
b.push(spacer());

// 2. Plan gratuit : inclus et limites
b.push(h1("2. Plan gratuit : ce qui est inclus et les limites"));
b.push(h2("Render (serveur) — Free"));
b.push(bullet([{ t: "Mise en veille : ", b: true }, { t: "le serveur s'endort après ~15 min sans visite. Réveil de 30 à 60 s au premier accès suivant." }]));
b.push(bullet([{ t: "Quota : ", b: true }, { t: "~750 heures-instance / mois (largement suffisant grâce à la veille)." }]));
b.push(bullet([{ t: "Ressources modestes : ", b: true }, { t: "~512 Mo de RAM, CPU partagé." }]));
b.push(bullet([{ t: "Disque éphémère : ", b: true }, { t: "les fichiers écrits sur le serveur (ex. photos de profil uploadées) sont PERDUS à chaque redéploiement. Les données en base (Neon) sont conservées." }]));
b.push(bullet([{ t: "HTTPS : ", b: true }, { t: "certificat SSL fourni automatiquement (inclus même en gratuit)." }]));
b.push(h2("Neon (base de données) — Free"));
b.push(bullet([{ t: "Stockage : ", b: true }, { t: "~0,5 Go (votre base fait actuellement ~30 Mo, donc large marge)." }]));
b.push(bullet([{ t: "Mise en veille : ", b: true }, { t: "le calcul (compute) se met en pause après inactivité, réveil en quelques secondes." }]));
b.push(bullet([{ t: "Quota de calcul : ", b: true }, { t: "limité par mois (suffisant pour une démo)." }]));
b.push(h2("Connexion Google (OAuth) — mode Test"));
b.push(bullet([{ t: "Mode « Testing » : ", b: true }, { t: "seuls les comptes ajoutés comme « test users » dans Google Cloud Console peuvent se connecter via Google. Pas de limite de durée pour eux, mais accès restreint." }]));
b.push(spacer());

// 3. Conséquences concrètes
b.push(h1("3. Conséquences concrètes (à connaître)"));
b.push(bullet([{ t: "Première visite lente : ", b: true }, { t: "après une pause, la page peut mettre 30-60 s à charger (réveil du serveur ET de la base). Ensuite c'est fluide." }]));
b.push(bullet([{ t: "Recherche / analyse IA : ", b: true }, { t: "appelle Google Gemini en direct → quelques secondes, c'est normal (indépendant de l'hébergement)." }]));
b.push(bullet([{ t: "Latence base : ", b: true }, { t: "le serveur (USA) et la base (Europe) étant éloignés, chaque opération à plusieurs requêtes est un peu ralentie. Corrigible en rapprochant les régions (voir §4)." }]));
b.push(bullet([{ t: "Photos non persistantes : ", b: true }, { t: "les photos uploadées disparaissent aux redéploiements (disque éphémère)." }]));
b.push(spacer());

// 4. Passer en payant
b.push(h1("4. Passer en payant — que faire"));
b.push(p([{ t: "Selon le besoin, on peut améliorer un ou plusieurs éléments. Chaque point est indépendant." }]));

b.push(h2("A. Supprimer la mise en veille + plus de puissance (Render)"));
b.push(bullet([{ t: "Effet : ", b: true }, { t: "plus de réveil de 30-60 s, plus de RAM/CPU, service toujours actif." }]));
b.push(p([{ t: "Marche à suivre : ", b: true }, { t: "Render → votre service nexus-talent → onglet Settings → « Instance Type » → choisir un plan payant (ex. Starter, ~7 $/mois) → confirmer. Aucun changement de code." }]));

b.push(h2("B. Rapprocher le serveur de la base (région Europe)"));
b.push(bullet([{ t: "Effet : ", b: true }, { t: "supprime la latence USA↔Europe → modifications d'offres et chargements nettement plus rapides." }]));
b.push(p([{ t: "Marche à suivre : ", b: true }, { t: "la région d'un service Render n'est PAS modifiable après création → il faut RECRÉER le service en région Frankfurt (EU Central). Concrètement : ajouter « region: frankfurt » dans render.yaml, créer un nouveau service Blueprint, reporter les variables d'environnement, puis mettre à jour FRONTEND_URL avec la nouvelle URL. (Je peux vous guider pas à pas le moment venu.)" }]));

b.push(h2("C. Rendre les photos persistantes"));
b.push(bullet([{ t: "Option 1 : ", b: true }, { t: "ajouter un « Disk » persistant Render (payant) monté sur le dossier des uploads." }]));
b.push(bullet([{ t: "Option 2 (recommandée production) : ", b: true }, { t: "stocker les fichiers sur un service externe (Amazon S3, Cloudflare R2, Cloudinary…). Nécessite une petite évolution du code d'upload." }]));

b.push(h2("D. Base de données plus robuste (Neon)"));
b.push(bullet([{ t: "Effet : ", b: true }, { t: "plus de stockage, pas de mise en veille, sauvegardes/branches avancées." }]));
b.push(p([{ t: "Marche à suivre : ", b: true }, { t: "Neon → Billing → passer à un plan payant (ex. Launch). Rien à changer côté code (même DATABASE_URL)." }]));

b.push(h2("E. Ouvrir la connexion Google à tous"));
b.push(bullet([{ t: "Effet : ", b: true }, { t: "n'importe quel compte Google (dont l'email existe comme utilisateur) peut se connecter, plus seulement les « test users »." }]));
b.push(p([{ t: "Marche à suivre : ", b: true }, { t: "Google Cloud Console → OAuth consent screen → « Publish app » (passage en Production). Selon les autorisations demandées, Google peut exiger une vérification. (Rappel : l'app ne crée pas de compte automatiquement — l'email doit exister comme utilisateur.)" }]));

b.push(h2("F. Nom de domaine personnalisé"));
b.push(bullet([{ t: "Effet : ", b: true }, { t: "adresse du type https://votre-domaine.com au lieu de …onrender.com." }]));
b.push(p([{ t: "Marche à suivre : ", b: true }, { t: "acheter un domaine (OVH, Namecheap…), puis Render → service → Settings → Custom Domains → ajouter le domaine et suivre les instructions DNS. Penser à mettre à jour FRONTEND_URL et l'URL de redirection Google." }]));
b.push(spacer());

// 5. Estimation des coûts
b.push(h1("5. Estimation des coûts (indicatif)"));
b.push(p([{ t: "Ordres de grandeur — À VÉRIFIER sur les sites officiels, les tarifs changent :", b: true }]));
b.push(bullet([{ t: "Render — service web payant : ", b: true }, { t: "à partir d'environ 7 $/mois (plan Starter, sans veille)." }]));
b.push(bullet([{ t: "Render — disque persistant : ", b: true }, { t: "quelques $/mois selon la taille." }]));
b.push(bullet([{ t: "Neon — plan payant : ", b: true }, { t: "à partir d'environ 19 $/mois (le plan gratuit suffit souvent au début)." }]));
b.push(bullet([{ t: "Domaine : ", b: true }, { t: "~10-15 €/an." }]));
b.push(bullet([{ t: "Total « usage réel léger » : ", b: true }, { t: "~7 $/mois (Render payant + Neon gratuit) peut suffire pour démarrer." }]));
b.push(spacer());

// 6. Recommandations
b.push(h1("6. Recommandations selon l'usage"));
b.push(bullet([{ t: "Démo / tests : ", b: true }, { t: "le gratuit actuel suffit (accepter le réveil de 30-60 s)." }]));
b.push(bullet([{ t: "Usage réel léger : ", b: true }, { t: "Render Starter (supprime la veille) + Neon gratuit. Éventuellement recréer en région Europe pour la vitesse." }]));
b.push(bullet([{ t: "Production sérieuse : ", b: true }, { t: "Render payant en Europe + Neon payant + stockage fichiers externe (S3/R2) + domaine personnalisé + Google en production." }]));
b.push(spacer());
b.push(p([{ t: "Besoin d'aide pour l'une de ces étapes ? Je peux vous guider (notamment la recréation en région Europe et le stockage des photos), le moment venu." }]));

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
const outPath = path.join(process.cwd(), "info-serveur.docx");
zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("Écrit :", outPath, "(" + buf.length + " octets)");
});
