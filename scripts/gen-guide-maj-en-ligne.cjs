/* Génère "Guide-Mettre-A-Jour-Le-Site-En-Ligne.docx" : procédure complète, de A
   à Z, pour qu'un dev junior mette lui-même à jour le site Nexus en production
   (Render + Neon) quand il y a des changements de fonctionnalité. */
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
b.push(title("Guide — Mettre à jour le site Nexus en ligne (de A à Z)"));
b.push(p([{ t: "Procédure complète pour publier vous-même une modification de fonctionnalité sur le site en production. Pensé pour un dev junior : chaque étape est expliquée. Généré le " }, { t: new Date().toLocaleDateString("fr-FR") }, { t: "." }]));
b.push(spacer());

// 0. Le principe
b.push(h1("0. Le principe (à comprendre une fois pour toutes)"));
b.push(p([{ t: "Le site est hébergé sur ", b: false }, { t: "Render", b: true }, { t: " (le serveur + le site) et ", }, { t: "Neon", b: true }, { t: " (la base de données PostgreSQL). Render surveille en permanence la branche " }, { t: "main", code: true }, { t: " du dépôt GitHub." }]));
b.push(p([{ t: "Conséquence très importante : ", b: true }, { t: "« mettre à jour le site en ligne » = « pousser (push) son code sur la branche main ». Dès que vous poussez, Render reconstruit et redéploie tout seul le site. Vous n'avez rien à installer manuellement sur le serveur." }]));
b.push(p([{ t: "La base de données (Neon) est séparée et permanente : elle ne se remet pas à zéro à chaque déploiement." }]));
b.push(bullet([{ t: "URL du site : " }, { t: "https://nexus-talent-zk0a.onrender.com", code: true }]));
b.push(bullet([{ t: "Tableau de bord Render : " }, { t: "https://dashboard.render.com", code: true }]));
b.push(bullet([{ t: "Dépôt GitHub : " }, { t: "https://github.com/samueldolly321/nexus-talent-system", code: true }, { t: " (privé)" }]));
b.push(spacer());

// 1. Préparation (une seule fois)
b.push(h1("1. Vérifier son environnement (à faire une seule fois)"));
b.push(p([{ t: "Avant de pouvoir modifier le site, votre machine doit être prête :" }]));
b.push(bullet([{ t: "Node.js 20 LTS", b: true }, { t: " installé (vérifier avec " }, { t: "node -v", code: true }, { t: ")." }]));
b.push(bullet([{ t: "Git", b: true }, { t: " installé (" }, { t: "git --version", code: true }, { t: ")." }]));
b.push(bullet([{ t: "Le projet cloné", b: true }, { t: " et à jour (" }, { t: "git pull origin main", code: true }, { t: ")." }]));
b.push(bullet([{ t: "Le fichier .env rempli", b: true }, { t: " (base locale, clés). Il n'est jamais poussé sur Git." }]));
b.push(bullet([{ t: "Les dépendances installées", b: true }, { t: " (" }, { t: "npm install", code: true }, { t: ")." }]));
b.push(spacer());

// 2. Le cycle de modification
b.push(h1("2. Le cycle complet d'une modification"));
b.push(p([{ t: "À chaque fois que vous voulez changer quelque chose, suivez toujours ces étapes dans l'ordre." }]));
b.push(h2("Étape 1 — Récupérer la dernière version"));
b.push(p([{ t: "Toujours commencer par se synchroniser, pour éviter les conflits :" }]));
b.push(code("git pull origin main"));
b.push(h2("Étape 2 — Modifier le code"));
b.push(p([{ t: "Ouvrez le projet dans votre éditeur (VS Code) et faites vos changements. Le front est dans " }, { t: "src/", code: true }, { t: ", le serveur dans " }, { t: "server.ts", code: true }, { t: "." }]));
b.push(h2("Étape 3 — Tester en local"));
b.push(p([{ t: "Lancez l'application sur votre machine et vérifiez visuellement que ça marche :" }]));
b.push(code("npm run dev"));
b.push(p([{ t: "Ouvrez " }, { t: "http://localhost:3000", code: true }, { t: " dans le navigateur, puis faites " }, { t: "Ctrl+F5", code: true }, { t: " (vide le cache). Testez votre nouvelle fonctionnalité." }]));
b.push(h2("Étape 4 — Vérifier que le projet compile"));
b.push(p([{ t: "TRÈS IMPORTANT : ", b: true }, { t: "si cette commande affiche une erreur, le déploiement Render ÉCHOUERA. Corrigez avant de pousser." }]));
b.push(code("npm run lint"));
b.push(p([{ t: "Aucune sortie = tout va bien. Des lignes d'erreur = à corriger." }]));
b.push(h2("Étape 5 — (Recommandé) Simuler le build de production"));
b.push(p([{ t: "Pour être sûr que Render réussira, reproduisez son build en local :" }]));
b.push(code("npm run build"));
b.push(p([{ t: "S'il se termine sans erreur (front + dist/server.cjs), vous pouvez pousser en confiance." }]));
b.push(spacer());

// 3. Les 3 questions
b.push(h1("3. Les 3 questions à se poser AVANT de pousser"));
b.push(p([{ t: "Elles déterminent si votre changement est « juste du code » ou s'il faut aussi committer d'autres fichiers. C'est le point qui fait le plus trébucher les débutants." }]));
b.push(bullet([{ t: "Q1 — Ai-je modifié ", b: true }, { t: "prisma/schema.prisma", code: true }, { t: " (ajout/suppression d'un champ ou d'une table) ? ", }, { t: "→ il faut créer une MIGRATION (voir Cas B).", b: true }]));
b.push(bullet([{ t: "Q2 — Ai-je installé une nouvelle dépendance ", b: true }, { t: "(npm install <paquet>)", code: true }, { t: " ? ", }, { t: "→ il faut committer package.json ET package-lock.json (voir Cas C).", b: true }]));
b.push(bullet([{ t: "Q3 — Ai-je changé les données de démo ", b: true }, { t: "(prisma/seed.ts)", code: true }, { t: " ? ", }, { t: "→ rien de spécial : Render relance le seed à chaque déploiement (il est idempotent).", b: true }]));
b.push(p([{ t: "Si vous répondez NON à Q1 et Q2 : vous êtes dans le cas le plus simple (Cas A)." }]));
b.push(spacer());

// 4. Cas A
b.push(h1("4. Cas A — Modification de code simple (le plus fréquent)"));
b.push(p([{ t: "Vous avez changé du code front et/ou serveur, sans toucher au schéma ni ajouter de dépendance. Trois commandes suffisent :" }]));
b.push(code("git add ."));
b.push(code('git commit -m "feat: description courte de ce que vous avez changé"'));
b.push(code("git push origin main"));
b.push(p([{ t: "C'est tout. ", b: true }, { t: "Render détecte le push et redéploie automatiquement. Passez à la partie 8 (suivre le déploiement)." }]));
b.push(spacer());

// 5. Cas B
b.push(h1("5. Cas B — Modification avec changement de base (schema.prisma)"));
b.push(p([{ t: "Si vous avez modifié " }, { t: "prisma/schema.prisma", code: true }, { t: ", vous devez créer une migration EN LOCAL, puis la committer. Render l'appliquera tout seul à la base Neon." }]));
b.push(p([{ t: "1. Arrêtez d'abord le serveur de dev ", b: true }, { t: "(Ctrl+C). Sous Windows il verrouille Prisma (erreur EPERM sinon)." }]));
b.push(p([{ t: "2. ", b: true }, { t: "Créez la migration (remplacez le nom par quelque chose de parlant) :" }]));
b.push(code("npx prisma migrate dev --name ajout_champ_xyz"));
b.push(p([{ t: "Cela crée un dossier dans " }, { t: "prisma/migrations/", code: true }, { t: " ET met à jour votre base locale." }]));
b.push(p([{ t: "3. ", b: true }, { t: "Committez le schéma ET le nouveau dossier de migration :" }]));
b.push(code("git add prisma/schema.prisma prisma/migrations"));
b.push(code('git commit -m "feat(db): ajout du champ xyz + migration"'));
b.push(code("git push origin main"));
b.push(p([{ t: "Comment Render applique la migration : ", b: true }, { t: "son script de build lance automatiquement " }, { t: "prisma migrate deploy", code: true }, { t: " (puis " }, { t: "prisma db seed", code: true }, { t: "). Vous n'avez rien à faire de plus sur Neon." }]));
b.push(p([{ t: "Piège à éviter : ", b: true }, { t: "ne JAMAIS oublier de committer le dossier prisma/migrations. Sans lui, Render ne saura pas mettre la base à jour et l'app plantera." }]));
b.push(spacer());

// 6. Cas C
b.push(h1("6. Cas C — Nouvelle dépendance npm"));
b.push(p([{ t: "Si vous avez fait un " }, { t: "npm install <paquet>", code: true }, { t: ", deux fichiers ont changé : " }, { t: "package.json", code: true }, { t: " et " }, { t: "package-lock.json", code: true }, { t: ". Les DEUX doivent être committés." }]));
b.push(code("git add package.json package-lock.json"));
b.push(code('git commit -m "chore: ajout de la dépendance <paquet>"'));
b.push(code("git push origin main"));
b.push(p([{ t: "Render réinstalle tout avec " }, { t: "npm ci --include=dev", code: true }, { t: " au moment du build. Si vous oubliez package-lock.json, le build échoue." }]));
b.push(spacer());

// 7. Les commandes git en détail
b.push(h1("7. Les commandes git, expliquées"));
b.push(bullet([{ t: "git status", code: true }, { t: " — voir ce qui a changé (fichiers modifiés/ajoutés)." }]));
b.push(bullet([{ t: "git add .", code: true }, { t: " — préparer TOUS les changements pour le prochain commit (le point = tout)." }]));
b.push(bullet([{ t: 'git commit -m "message"', code: true }, { t: " — enregistrer les changements avec une description." }]));
b.push(bullet([{ t: "git push origin main", code: true }, { t: " — envoyer les commits sur GitHub → déclenche le déploiement Render." }]));
b.push(bullet([{ t: "git pull origin main", code: true }, { t: " — récupérer les derniers changements des autres avant de travailler." }]));
b.push(p([{ t: "Note connexion : ", b: true }, { t: "si Git demande une authentification au push, c'est le compte GitHub propriétaire du dépôt (samueldolly321) et un token personnel (PAT), pas le mot de passe du compte." }]));
b.push(spacer());

// 8. Suivre le déploiement
b.push(h1("8. Suivre le déploiement sur Render"));
b.push(p([{ t: "Après le push, allez voir Render travailler :" }]));
b.push(bullet([{ t: "Ouvrez " }, { t: "https://dashboard.render.com", code: true }, { t: " → service " }, { t: "nexus-talent", code: true }, { t: "." }]));
b.push(bullet([{ t: "Onglet " }, { t: "Logs", code: true }, { t: " (ou Events) : vous voyez le build en cours." }]));
b.push(bullet([{ t: "Le statut passe de " }, { t: "Deploying", b: true }, { t: " à " }, { t: "Live", b: true }, { t: "." }]));
b.push(bullet([{ t: "Durée : ", b: true }, { t: "environ 3 à 5 minutes (plan gratuit)." }]));
b.push(p([{ t: "Si le statut devient « Failed » : ouvrez les logs, la dernière ligne rouge indique la cause (souvent une erreur TypeScript ou un fichier oublié)." }]));
b.push(spacer());

// 9. Vérifier
b.push(h1("9. Vérifier que la mise à jour est bien en ligne"));
b.push(bullet([{ t: "Attendez le statut " }, { t: "Live", b: true }, { t: " sur Render." }]));
b.push(bullet([{ t: "Ouvrez " }, { t: "https://nexus-talent-zk0a.onrender.com", code: true }, { t: "." }]));
b.push(bullet([{ t: "Faites " }, { t: "Ctrl+F5", code: true }, { t: " (obligatoire — vide le cache du navigateur, sinon vous voyez l'ancienne version)." }]));
b.push(bullet([{ t: "Connectez-vous : " }, { t: "samuel@test.io / password123", code: true }, { t: "." }]));
b.push(bullet([{ t: "Testez votre nouvelle fonctionnalité." }]));
b.push(p([{ t: "Astuce : ", b: true }, { t: "le 1er accès après une longue inactivité peut prendre 30-60 s (le serveur gratuit se réveille). C'est normal." }]));
b.push(spacer());

// 10. Dépannage
b.push(h1("10. En cas de problème (dépannage)"));
b.push(bullet([{ t: "Le build échoue sur Render → ", b: true }, { t: "lisez les logs. Causes fréquentes : erreur TypeScript (relancez npm run lint en local), ou package-lock.json / dossier de migration oublié au commit." }]));
b.push(bullet([{ t: "Le site montre l'ancienne version → ", b: true }, { t: "cache du navigateur : faites Ctrl+F5, ou testez en navigation privée." }]));
b.push(bullet([{ t: "Connexion refusée après déploiement → ", b: true }, { t: "problème CORS : la variable FRONTEND_URL sur Render doit valoir EXACTEMENT l'URL du site (https, sans / final). Une faute de frappe (.con au lieu de .com) suffit à tout bloquer." }]));
b.push(bullet([{ t: "Erreur EPERM sous Windows pendant prisma → ", b: true }, { t: "vous avez laissé npm run dev tourner. Arrêtez-le (Ctrl+C) puis relancez la commande." }]));
b.push(bullet([{ t: "Les photos de candidats ont disparu → ", b: true }, { t: "normal sur le plan gratuit : le disque de Render est éphémère. Les autres données (dans Neon) sont conservées." }]));
b.push(bullet([{ t: "Le serveur est très lent au 1er accès → ", b: true }, { t: "il s'était endormi (15 min d'inactivité). Le réveil prend 30-60 s." }]));
b.push(spacer());

// 11. Rollback
b.push(h1("11. Revenir en arrière si une mise à jour casse tout"));
b.push(p([{ t: "Deux façons d'annuler une mauvaise mise à jour :" }]));
b.push(h2("Méthode simple — depuis Render"));
b.push(bullet([{ t: "Dashboard Render → service nexus-talent → onglet " }, { t: "Deploys", code: true }, { t: "." }]));
b.push(bullet([{ t: "Repérez le dernier déploiement qui marchait, cliquez " }, { t: "Rollback / Redeploy", code: true }, { t: "." }]));
b.push(p([{ t: "Cela remet le site dans son état précédent, sans toucher à votre code." }]));
b.push(h2("Méthode git — annuler le commit fautif"));
b.push(code("git revert HEAD"));
b.push(code("git push origin main"));
b.push(p([{ t: "git revert crée un nouveau commit qui annule le précédent (plus sûr que de supprimer). Le push relance un déploiement propre." }]));
b.push(spacer());

// 12. Aide-mémoire
b.push(h1("12. Aide-mémoire express"));
b.push(bullet([{ t: "Modif de code simple : ", b: true }, { t: "git add . → git commit -m \"...\" → git push origin main." }]));
b.push(bullet([{ t: "Modif du schéma : ", b: true }, { t: "npx prisma migrate dev --name xxx (serveur arrêté) → committer prisma/ → push." }]));
b.push(bullet([{ t: "Nouvelle dépendance : ", b: true }, { t: "npm install X → committer package.json + package-lock.json → push." }]));
b.push(bullet([{ t: "Toujours avant de pousser : ", b: true }, { t: "npm run lint (et idéalement npm run build)." }]));
b.push(bullet([{ t: "Toujours après le déploiement : ", b: true }, { t: "attendre « Live » → ouvrir le site → Ctrl+F5 → tester." }]));
b.push(spacer());

// 13. Cas particulier render.yaml
b.push(h1("13. Cas particulier — modifier la configuration de déploiement"));
b.push(p([{ t: "Le fichier " }, { t: "render.yaml", code: true }, { t: " décrit comment Render construit le site (commande de build, variables). ATTENTION : un simple push ne suffit PAS à appliquer un changement de render.yaml — Render garde en mémoire la commande de build initiale." }]));
b.push(bullet([{ t: "Pour changer une variable (ex. FRONTEND_URL, une clé API) : ", b: true }, { t: "faites-le directement dans le dashboard Render (onglet Environment), puis Save (cela redéploie)." }]));
b.push(bullet([{ t: "Pour changer la commande de build : ", b: true }, { t: "il faut resynchroniser le Blueprint dans Render (ou passer par un déploiement manuel « Clear build cache »). En cas de doute, demandez de l'aide avant." }]));
b.push(spacer());

// 14. Repères
b.push(h1("14. Repères & identifiants"));
b.push(bullet([{ t: "Site en ligne : " }, { t: "https://nexus-talent-zk0a.onrender.com", code: true }]));
b.push(bullet([{ t: "Compte démo : " }, { t: "samuel@test.io / password123", code: true }]));
b.push(bullet([{ t: "Render : " }, { t: "https://dashboard.render.com", code: true }, { t: " (service nexus-talent)" }]));
b.push(bullet([{ t: "Neon (base de données) : " }, { t: "https://console.neon.tech", code: true }]));
b.push(bullet([{ t: "GitHub : " }, { t: "https://github.com/samueldolly321/nexus-talent-system", code: true }]));
b.push(bullet([{ t: "Branche déployée : " }, { t: "main", code: true }]));

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
const outPath = path.join(process.cwd(), "Guide-Mettre-A-Jour-Le-Site-En-Ligne.docx");
zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("Écrit :", outPath, "(" + buf.length + " octets)");
});
