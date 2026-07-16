/* Génère "Guide-Sync-Maison-2026-07-17.docx" : comment reporter la mise à jour
   du 17/07/2026 (import de fichier CV/lettre à l'ajout d'un candidat) vers le
   dossier « maison », avec la liste des fichiers, les deux méthodes et les commandes. */
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
b.push(title("Guide — Synchroniser la mise à jour du 17/07 vers le dossier maison"));
b.push(p([{ t: "Ce qui a changé aujourd'hui, comment le récupérer chez vous (2 méthodes) et les commandes à lancer. Généré le " }, { t: new Date().toLocaleDateString("fr-FR") }, { t: "." }]));
b.push(spacer());

// 1. Résumé des changements
b.push(h1("1. Ce qui a changé aujourd'hui (17/07)"));
b.push(bullet([{ t: "Import CV / lettre à l'ajout d'un candidat : ", b: true }, { t: "dans « Candidats » → « Ajouter un candidat », un bouton « Importer » au-dessus des champs CV (PDF ou image) et Lettre (PDF ou Word) extrait le texte automatiquement, comme sur /postuler. Le texte reste éditable." }]));
b.push(bullet([{ t: "Soft skills sur les offres : ", b: true }, { t: "nouveau champ « Soft skills souhaités » à la création/édition d'une offre. Affichés dans la liste des offres (badges fond noir / texte blanc) et dans le détail. Ils sont aussi transmis à l'analyse IA (le score « savoir-être » est évalué en regard des attentes du poste)." }]));
b.push(bullet([{ t: "Soft skills sur la fiche candidat : ", b: true }, { t: "nouveau bloc « Savoir-être (soft skills) » dans l'onglet Analyse IA, en badges fond noir / texte blanc (ces compétences étaient extraites par l'IA mais jamais affichées)." }]));
b.push(bullet([{ t: "Recherche candidats côté serveur : ", b: true }, { t: "la barre de recherche porte désormais sur TOUTE la base (nom / email / téléphone / localisation), plus seulement sur la page affichée." }]));
b.push(bullet([{ t: "Composant Button réutilisable : ", b: true }, { t: "nouveau src/components/Button.tsx (un seul endroit pour le style des boutons). Premier écran migré : « Candidats »." }]));
b.push(bullet([{ t: "Tableau de bord plus rapide (Niveau 0) : ", b: true }, { t: "il ne charge plus toute la base avec les CV/lettres ; chargement nettement allégé." }]));
b.push(bullet([{ t: "Nouvelle colonne experienceYears (Niveau 1) : ", b: true }, { t: "années d'expérience stockées dans une vraie colonne indexée (renseignée à l'analyse). → nécessite une migration (voir partie 4)." }]));
b.push(bullet([{ t: "Tableau de bord encore plus efficace (Niveau 2) : ", b: true }, { t: "il ne « charge plus toute la base » ; le top compétences et la répartition par expérience sont calculés directement par la base de données (SQL). À l'analyse, les compétences sont enregistrées dans une table dédiée. Aucune migration, aucune nouvelle dépendance." }]));
b.push(bullet([{ t: "Filet de sécurité anti-crash : ", b: true }, { t: "le serveur logue désormais les erreurs imprévues sans s'arrêter (avant, une seule erreur non gérée pouvait faire tomber tout le serveur). Aucun impact visible, juste plus robuste." }]));
b.push(bullet([{ t: "Base de données — 2 migrations : ", b: true }, { t: "add_candidate_experience_years et add_job_soft_skills_required. Additives (colonnes ajoutées), sans perte de données. AUCUNE nouvelle dépendance npm." }]));
b.push(bullet([{ t: "Prod déjà à jour : ", b: true }, { t: "dernier commit b0182b5 poussé et déployé automatiquement sur Render (migrations appliquées via migrate deploy)." }]));
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
b.push(code("src/App.tsx"));
b.push(code("src/types.ts"));
b.push(code("src/lib/mappers.ts"));
b.push(code("src/components/Button.tsx  (nouveau)"));
b.push(code("src/components/CandidatesView.tsx"));
b.push(code("src/components/JobsView.tsx"));
b.push(code("src/components/CandidateProfileView.tsx"));
b.push(h2("Base de données (indispensable)"));
b.push(code("prisma/schema.prisma"));
b.push(code("prisma/seed.ts  (backfills automatiques Niveau 1 + 2)"));
b.push(code("prisma/migrations/20260717120000_add_candidate_experience_years/"));
b.push(code("prisma/migrations/20260716165929_add_job_soft_skills_required/"));
b.push(h2("Scripts (facultatif)"));
b.push(code("scripts/backfill-experience-years.cjs  (backfill experienceYears)"));
b.push(code("scripts/backfill-candidate-skills.cjs  (backfill compétences)"));
b.push(code("scripts/gen-guide-sync-maison-2026-07-17.cjs  (génère ce document)"));
b.push(h2("Documentation (facultatif — regénérable via le script)"));
b.push(code("Guide-Sync-Maison-2026-07-17.docx"));
b.push(code("RECAP-PROJET-NEXUS.md"));
b.push(p([{ t: "Le fichier .docx peut être copié tel quel, ou regénéré avec le script gen-*.cjs (voir partie 4)." }]));
b.push(spacer());

// 4. Commandes
b.push(h1("4. Commandes à lancer après la synchro"));
b.push(p([{ t: "IMPORTANT cette fois : il y a 2 migrations de base. ", b: true }, { t: "Sans elles, l'application plantera en local (colonnes manquantes). Suivez les étapes DANS L'ORDRE." }]));
b.push(p([{ t: "1. ", b: true }, { t: "ARRÊTER le serveur de dev s'il tourne (fermez le terminal " }, { t: "npm run dev", code: true }, { t: " ou Ctrl+C). Sous Windows, Prisma ne peut pas se régénérer tant que le serveur tient le moteur (erreur EPERM)." }]));
b.push(p([{ t: "2. ", b: true }, { t: "Installer les dépendances (aucune nouvelle aujourd'hui, mais sans risque) :" }]));
b.push(code("npm install"));
b.push(p([{ t: "3. ", b: true }, { t: "Appliquer les 2 migrations à votre base LOCALE (colonnes experienceYears + softSkillsRequired) :" }]));
b.push(code("npx prisma migrate deploy"));
b.push(p([{ t: "4. ", b: true }, { t: "Régénérer le client Prisma (pour que le code reconnaisse les nouvelles colonnes) :" }]));
b.push(code("npx prisma generate"));
b.push(p([{ t: "5. ", b: true }, { t: "Remplir les données des candidats DÉJÀ analysés (années d'expérience + compétences) — utile pour que les graphiques du tableau de bord soient corrects sur l'existant :" }]));
b.push(code("node scripts/backfill-experience-years.cjs"));
b.push(code("node scripts/backfill-candidate-skills.cjs"));
b.push(p([{ t: "En production, inutile de le faire à la main : ", b: true }, { t: "ces deux backfills sont intégrés au seed, que Render lance automatiquement à chaque déploiement (idempotents, sans risque à répéter)." }]));
b.push(p([{ t: "6. ", b: true }, { t: "Vérifier que le projet compile :" }]));
b.push(code("npm run lint"));
b.push(p([{ t: "7. ", b: true }, { t: "Relancer le serveur de dev, puis Ctrl+F5 dans le navigateur :" }]));
b.push(code("npm run dev"));
b.push(p([{ t: "Note : ", b: true }, { t: "en production, rien à faire manuellement — Render applique les migrations tout seul (migrate deploy) à chaque push. Ces commandes ne concernent que votre poste maison." }]));
b.push(spacer());

// 5. Important pour tester l'OCR en local
b.push(h1("5. Important — tester l'import d'un CV en image en local"));
b.push(p([{ t: "L'extraction du texte d'une image (OCR) passe par l'IA Gemini. Pour qu'elle fonctionne en local, votre fichier " }, { t: ".env", code: true }, { t: " doit contenir une clé " }, { t: "GEMINI_API_KEY", code: true }, { t: " valide (la même qui sert déjà à l'analyse des CV)." }]));
b.push(bullet([{ t: "Si la clé est absente : ", b: true }, { t: "l'import d'un CV en PDF ou d'une lettre en PDF/Word continue de marcher ; seule la lecture des images (JPG/PNG) échouera." }]));
b.push(bullet([{ t: "En production : ", b: true }, { t: "la clé est déjà configurée dans Render (Environment), rien à faire." }]));
b.push(spacer());

// 6. Ce dont vous avez / n'avez pas besoin
b.push(h1("6. Ce dont vous avez (et n'avez pas) besoin cette fois"));
b.push(bullet([{ t: "Migrations OBLIGATOIRES en local : ", b: true }, { t: "les 2 migrations doivent être appliquées (partie 4, étape 3), sinon l'app plante (colonnes manquantes)." }]));
b.push(bullet([{ t: "Régénération Prisma OBLIGATOIRE : ", b: true }, { t: "après les migrations (partie 4, étape 4), sinon le code ne « voit » pas les nouvelles colonnes." }]));
b.push(bullet([{ t: "Pas de re-seed : ", b: true }, { t: "les données de démo ne changent pas ; ne lancez pas prisma db seed (il réécrirait les données)." }]));
b.push(bullet([{ t: "Pas de nouvelle dépendance : ", b: true }, { t: "npm install n'est pas strictement requis (aucun paquet ajouté)." }]));
b.push(bullet([{ t: "Backfill facultatif : ", b: true }, { t: "experienceYears se remplit automatiquement aux prochaines analyses ; le script ne sert qu'à rattraper les candidats déjà analysés." }]));
b.push(bullet([{ t: "Rien à faire côté production : ", b: true }, { t: "Render redéploie et applique les migrations automatiquement à chaque push." }]));
b.push(spacer());

// 7. Vérifier que tout marche
b.push(h1("7. Vérifier que tout marche"));
b.push(bullet([{ t: "Listes non vides : ", b: true }, { t: "après les migrations et le redémarrage, les candidats et les offres s'affichent normalement (si vide, c'est souvent que les migrations n'ont pas été appliquées)." }]));
b.push(bullet([{ t: "Offre — soft skills : ", b: true }, { t: "créez/éditez une offre, ajoutez des soft skills (ex. « Communication, Rigueur ») → ils apparaissent en badges NOIRS dans la liste des offres et dans le détail." }]));
b.push(bullet([{ t: "Candidat — soft skills : ", b: true }, { t: "ouvrez une fiche déjà analysée → onglet Analyse IA → le bloc « Savoir-être (soft skills) » s'affiche en badges NOIRS (si le candidat en a)." }]));
b.push(bullet([{ t: "Recherche candidats : ", b: true }, { t: "tapez le nom d'un candidat situé sur une autre page → il est trouvé (recherche sur toute la base)." }]));
b.push(bullet([{ t: "Import CV / lettre : ", b: true }, { t: "« Ajouter un candidat » → boutons « Importer » au-dessus des champs CV et Lettre." }]));
b.push(bullet([{ t: "Tableau de bord : ", b: true }, { t: "se charge rapidement (plus de chargement de toute la base)." }]));
b.push(spacer());

// 8. À noter
b.push(h1("8. À noter"));
b.push(bullet([{ t: "Migrations additives : ", b: true }, { t: "les 2 migrations ne font qu'AJOUTER des colonnes (experienceYears sur les candidats, softSkillsRequired sur les offres) — aucune donnée existante n'est modifiée ou supprimée." }]));
b.push(bullet([{ t: "Soft skills des offres existantes : ", b: true }, { t: "elles démarrent sans soft skills (champ vide) ; éditez une offre pour en ajouter." }]));
b.push(bullet([{ t: "Soft skills du candidat : ", b: true }, { t: "s'affichent pour les fiches déjà analysées si l'IA en avait extrait ; sinon relancez « Analyser avec l'IA »." }]));
b.push(bullet([{ t: "experienceYears + compétences normalisées : ", b: true }, { t: "désormais utilisées par le tableau de bord (répartition expérience + top compétences calculés en base). D'où l'intérêt des backfills (partie 4, étape 5) pour l'existant." }]));
b.push(bullet([{ t: "Formats d'import : ", b: true }, { t: "CV = PDF ou image (JPG/PNG/WebP, OCR Gemini) ; Lettre = PDF ou Word (.docx). L'OCR image nécessite GEMINI_API_KEY (voir partie 5)." }]));
b.push(bullet([{ t: "Piège Windows (rappel) : ", b: true }, { t: "toujours arrêter npm run dev avant prisma migrate / generate (verrou du moteur, erreur EPERM)." }]));
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
const outPath = path.join(process.cwd(), "Guide-Sync-Maison-2026-07-17.docx");
zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("Écrit :", outPath, "(" + buf.length + " octets)");
});
