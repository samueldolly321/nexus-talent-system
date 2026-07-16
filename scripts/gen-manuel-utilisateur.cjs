/* Génère "Manuel-Utilisateur-Nexus-Talent.docx" : guide de prise en main clair et
   complet, destiné à un responsable RH qui découvre l'application (connexion,
   navigation, chaque onglet, fiche candidat, pipeline, rôles, page /postuler, FAQ). */
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function run(r) {
  const t = typeof r === "string" ? { t: r } : r;
  const rpr = [];
  if (t.b) rpr.push("<w:b/>");
  if (t.i) rpr.push("<w:i/>");
  if (t.color) rpr.push(`<w:color w:val="${t.color}"/>`);
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
const subtitle = (t) => para("Subtitle", t);
const h1 = (t) => para("Heading1", t);
const h2 = (t) => para("Heading2", t);
const h3 = (t) => para("Heading3", t);
const p = (r) => para("Body", r);
const bullet = (r) => para("Bullet", r);
const numbered = (r) => para("Bullet", r); // même rendu, préfixé côté texte
const code = (t) => para("Code", { t, code: true });
const spacer = () => para("Body", "");

// --- Tableau : header (array de strings) + rows (array d'arrays de strings) ---
const TABLE_W = 9638; // largeur utile (page A4 - marges)
function table(header, rows) {
  const nCols = header.length;
  const colW = Math.floor(TABLE_W / nCols);
  const grid = `<w:tblGrid>${Array.from({ length: nCols }, () => `<w:gridCol w:w="${colW}"/>`).join("")}</w:tblGrid>`;
  const cell = (text, { headerCell = false } = {}) => {
    const shd = headerCell ? '<w:shd w:val="clear" w:fill="1E3A8A"/>' : "";
    const runs = run({ t: text, b: headerCell, color: headerCell ? "FFFFFF" : undefined });
    return `<w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/>${shd}<w:tcMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:pStyle w:val="TableCell"/></w:pPr>${runs}</w:p></w:tc>`;
  };
  const headerRow = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${header.map((h) => cell(h, { headerCell: true })).join("")}</w:tr>`;
  const bodyRows = rows
    .map((r) => `<w:tr>${r.map((c) => cell(c)).join("")}</w:tr>`)
    .join("");
  const borders = `<w:tblBorders><w:top w:val="single" w:sz="4" w:color="CBD5E1"/><w:left w:val="single" w:sz="4" w:color="CBD5E1"/><w:bottom w:val="single" w:sz="4" w:color="CBD5E1"/><w:right w:val="single" w:sz="4" w:color="CBD5E1"/><w:insideH w:val="single" w:sz="4" w:color="CBD5E1"/><w:insideV w:val="single" w:sz="4" w:color="CBD5E1"/></w:tblBorders>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${TABLE_W}" w:type="dxa"/>${borders}</w:tblPr>${grid}${headerRow}${bodyRows}</w:tbl><w:p><w:pPr><w:pStyle w:val="Body"/></w:pPr></w:p>`;
}

const b = [];

// ==== Couverture ====
b.push(title("Nexus Talent — Manuel d'utilisation"));
b.push(subtitle("Guide de prise en main pour les responsables RH et recruteurs"));
b.push(p([{ t: "Ce document vous accompagne pas à pas dans la découverte et l'utilisation quotidienne de la plateforme : connexion, création d'offres, gestion des candidats, analyse de CV par l'intelligence artificielle, suivi du recrutement et rapports. Aucune connaissance technique n'est requise." }]));
b.push(p([{ t: "Version du " }, { t: new Date().toLocaleDateString("fr-FR") }, { t: ".", }]));
b.push(spacer());

// ==== Sommaire ====
b.push(h1("Sommaire"));
b.push(bullet([{ t: "1. Qu'est-ce que Nexus Talent ?" }]));
b.push(bullet([{ t: "2. Se connecter à l'application" }]));
b.push(bullet([{ t: "3. Découvrir l'interface" }]));
b.push(bullet([{ t: "4. Publier une offre d'emploi" }]));
b.push(bullet([{ t: "5. Gérer les candidats" }]));
b.push(bullet([{ t: "6. La fiche candidat et l'analyse IA" }]));
b.push(bullet([{ t: "7. Suivre le recrutement avec le Pipeline" }]));
b.push(bullet([{ t: "8. Calendrier, Emails et Recherche IA" }]));
b.push(bullet([{ t: "9. Rapports et exports Excel" }]));
b.push(bullet([{ t: "10. Recevoir des candidatures en ligne (page « Postuler »)" }]));
b.push(bullet([{ t: "11. Utilisateurs, Connexions et Paramètres" }]));
b.push(bullet([{ t: "12. Rôles et permissions" }]));
b.push(bullet([{ t: "13. Questions fréquentes (FAQ)" }]));
b.push(spacer());

// ==== 1. Présentation ====
b.push(h1("1. Qu'est-ce que Nexus Talent ?"));
b.push(p([{ t: "Nexus Talent est une plateforme de gestion du recrutement (ATS — Applicant Tracking System). Elle centralise vos offres d'emploi, votre base de candidats et le suivi de chaque candidature, de la réception à l'embauche." }]));
b.push(p([{ t: "Ses points forts :" }]));
b.push(bullet([{ t: "Analyse de CV par l'IA : ", b: true }, { t: "chaque candidat reçoit un score global et une évaluation détaillée (expérience, compétences, adéquation à l'offre)." }]));
b.push(bullet([{ t: "Pipeline visuel : ", b: true }, { t: "un tableau de suivi façon « kanban » pour faire avancer chaque candidat étape par étape." }]));
b.push(bullet([{ t: "Recherche intelligente : ", b: true }, { t: "retrouvez un profil en langage naturel (ex. « développeur React avec 3 ans d'expérience »)." }]));
b.push(bullet([{ t: "Candidatures en ligne : ", b: true }, { t: "une page publique « Postuler » alimente automatiquement votre base." }]));
b.push(bullet([{ t: "Rapports et exports : ", b: true }, { t: "tableaux de bord et fichiers Excel soignés, prêts à partager." }]));
b.push(p([{ t: "L'application fonctionne dans un simple navigateur web (Chrome, Edge, Firefox), sur ordinateur comme sur mobile." }]));
b.push(spacer());

// ==== 2. Connexion ====
b.push(h1("2. Se connecter à l'application"));
b.push(numbered([{ t: "1. ", b: true }, { t: "Ouvrez l'adresse de la plateforme dans votre navigateur (fournie par votre administrateur)." }]));
b.push(numbered([{ t: "2. ", b: true }, { t: "Saisissez votre adresse e-mail et votre mot de passe, puis cliquez sur « Se connecter »." }]));
b.push(numbered([{ t: "3. ", b: true }, { t: "Vous arrivez directement sur le Tableau de bord." }]));
b.push(h2("Mot de passe oublié"));
b.push(p([{ t: "Cliquez sur « Mot de passe oublié ? » sous le formulaire. Vous recevrez un e-mail contenant un lien sécurisé (valable 1 heure) pour en choisir un nouveau." }]));
b.push(h2("Connexion avec Google"));
b.push(p([{ t: "Si votre administrateur l'a activée, un bouton « Continuer avec Google » permet de vous connecter avec votre compte Google, à condition qu'il soit lié à un compte existant sur la plateforme (il n'y a pas d'inscription automatique)." }]));
b.push(p([{ t: "Astuce sécurité : ", b: true }, { t: "ne partagez jamais votre mot de passe. Déconnectez-vous en fin de journée sur un poste partagé (icône de déconnexion en bas de menu)." }]));
b.push(spacer());

// ==== 3. Interface ====
b.push(h1("3. Découvrir l'interface"));
b.push(p([{ t: "L'écran se compose d'un menu latéral gauche (la navigation) et d'une zone principale à droite (le contenu de l'onglet sélectionné)." }]));
b.push(h2("Le menu latéral"));
b.push(p([{ t: "Il donne accès aux différentes sections (certaines n'apparaissent que selon votre rôle — voir le chapitre 12) :" }]));
b.push(bullet([{ t: "Tableau de bord", b: true }, { t: " — vue d'ensemble et indicateurs clés." }]));
b.push(bullet([{ t: "Offres", b: true }, { t: " / ", }, { t: "Offres archivées", b: true }, { t: " — vos postes ouverts et clôturés." }]));
b.push(bullet([{ t: "Candidats", b: true }, { t: " — la base de tous les candidats." }]));
b.push(bullet([{ t: "Pipeline", b: true }, { t: " — le suivi visuel des candidatures." }]));
b.push(bullet([{ t: "Calendrier", b: true }, { t: " — les entretiens planifiés." }]));
b.push(bullet([{ t: "Emails", b: true }, { t: " — les échanges avec les candidats." }]));
b.push(bullet([{ t: "Recherche IA", b: true }, { t: " — la recherche intelligente de profils." }]));
b.push(bullet([{ t: "Rapports", b: true }, { t: " — statistiques et exports Excel." }]));
b.push(bullet([{ t: "Utilisateurs, Connexions, Paramètres", b: true }, { t: " — administration (accès restreint)." }]));
b.push(h2("Les repères en bas de menu"));
b.push(bullet([{ t: "Mode sombre : ", b: true }, { t: "un interrupteur bascule l'affichage en clair ou sombre, selon votre confort." }]));
b.push(bullet([{ t: "Nouvelle Offre : ", b: true }, { t: "le bouton d'action rapide pour créer une offre depuis n'importe quel écran." }]));
b.push(bullet([{ t: "Votre profil : ", b: true }, { t: "votre nom, votre rôle, et l'icône de déconnexion." }]));
b.push(spacer());

b.push(h2("Le tableau de bord — lire les indicateurs"));
b.push(p([{ t: "Le Tableau de bord est votre vue d'ensemble. En plus des compteurs (offres, candidats, embauches), deux éléments méritent une explication." }]));
b.push(h3("Score moyen IA"));
b.push(p([{ t: "C'est le grand pourcentage repéré par l'icône « cerveau ». Il représente la MOYENNE des notes d'adéquation attribuées par l'intelligence artificielle à tous vos candidats déjà analysés. Chaque candidat passé par « Analyser avec l'IA » reçoit une note sur 100 (synthèse de ses compétences, expérience, formation, savoir-être et langues) ; le tableau de bord en fait la moyenne." }]));
b.push(bullet([{ t: "Comment le lire : ", b: true }, { t: "c'est un indicateur de la qualité globale de votre vivier. Un score élevé signifie que vos candidats collent bien, en moyenne, à vos besoins ; un score bas signale un vivier plus faible ou des postes exigeants." }]));
b.push(bullet([{ t: "À savoir : ", b: true }, { t: "seuls les candidats déjà analysés sont comptés. Si aucun candidat n'a été analysé, l'indicateur affiche 0 %." }]));
b.push(h3("Compétences demandées"));
b.push(p([{ t: "C'est le graphique en radar (toile d'araignée) accompagné de quelques pastilles. Malgré son nom, il n'affiche PAS les compétences exigées par vos offres, mais les compétences LES PLUS FRÉQUENTES chez vos candidats : on compte, parmi les CV analysés, combien de candidats possèdent chaque compétence, et on met en avant les plus répandues." }]));
b.push(bullet([{ t: "À quoi ça sert : ", b: true }, { t: "voir d'un coup d'œil de quoi est fait votre vivier (par exemple : beaucoup de profils maîtrisant JavaScript, Git ou Docker)." }]));
b.push(bullet([{ t: "Astuce : ", b: true }, { t: "ce classement se nourrit de l'analyse des CV ; plus vos candidats sont analysés, plus il est représentatif." }]));
b.push(h3("Les autres graphiques"));
b.push(bullet([{ t: "Candidatures mensuelles : ", b: true }, { t: "l'évolution du nombre de candidatures reçues sur les derniers mois." }]));
b.push(bullet([{ t: "Répartition par expérience : ", b: true }, { t: "combien de candidats sont Junior, Intermédiaire, Senior ou Expert, d'après les années d'expérience détectées." }]));
b.push(spacer());

// ==== 4. Offres ====
b.push(h1("4. Publier une offre d'emploi"));
b.push(numbered([{ t: "1. ", b: true }, { t: "Cliquez sur « Nouvelle Offre » (bas du menu) ou allez dans l'onglet « Offres »." }]));
b.push(numbered([{ t: "2. ", b: true }, { t: "Renseignez l'intitulé, le lieu, le type de contrat (CDI, CDD, Freelance, Alternance, Stage), la fourchette de salaire et la description du poste." }]));
b.push(numbered([{ t: "3. ", b: true }, { t: "Enregistrez : l'offre devient visible dans « Offres » et peut recevoir des candidatures en ligne." }]));
b.push(p([{ t: "Offres archivées : ", b: true }, { t: "lorsqu'un poste est pourvu ou clôturé, il rejoint l'onglet « Offres archivées ». Vos données restent consultables sans encombrer la liste active." }]));
b.push(p([{ t: "Bon à savoir : ", b: true }, { t: "le type de métier d'une offre (informatique ou autre) oriente la grille de compétences utilisée par l'analyse IA, pour une évaluation plus juste." }]));
b.push(spacer());

// ==== 5. Candidats ====
b.push(h1("5. Gérer les candidats"));
b.push(p([{ t: "L'onglet « Candidats » liste toute votre base. Vous pouvez basculer entre une vue tableau et une vue cartes, trier et filtrer." }]));
b.push(h2("Rechercher, filtrer, trier"));
b.push(bullet([{ t: "Recherche : ", b: true }, { t: "par nom, e-mail, téléphone ou localisation." }]));
b.push(bullet([{ t: "Filtres : ", b: true }, { t: "par score (Excellent ≥ 80, Solide 60–79), années d'expérience, étape du pipeline et prétention salariale." }]));
b.push(bullet([{ t: "Tri : ", b: true }, { t: "par date, nom ou score. Le tri s'applique à toute la base, pas seulement à la page affichée." }]));
b.push(h2("Ajouter un candidat manuellement"));
b.push(numbered([{ t: "1. ", b: true }, { t: "Cliquez sur « Ajouter un candidat »." }]));
b.push(numbered([{ t: "2. ", b: true }, { t: "Renseignez le nom (obligatoire), et si besoin e-mail, téléphone, localisation, offre visée, source et prétention salariale." }]));
b.push(numbered([{ t: "3. ", b: true }, { t: "Pour le CV et la lettre de motivation, deux possibilités :" }]));
b.push(bullet([{ t: "Importer un fichier : ", b: true }, { t: "cliquez sur « Importer » au-dessus du champ. Le CV accepte un PDF ou une image (photo/scan JPG, PNG) ; la lettre accepte un PDF ou un Word (.docx). Le texte est extrait automatiquement et rempli dans le champ." }]));
b.push(bullet([{ t: "Coller le texte : ", b: true }, { t: "vous pouvez aussi coller directement le contenu. Le texte importé reste modifiable." }]));
b.push(numbered([{ t: "4. ", b: true }, { t: "Cliquez sur « Ajouter ». Le candidat est créé et prêt à être analysé." }]));
b.push(p([{ t: "Note : ", b: true }, { t: "la lecture d'un CV en image utilise l'IA. Selon la netteté de la photo, l'extraction prend quelques secondes." }]));
b.push(h2("Exporter la liste"));
b.push(p([{ t: "Le bouton d'export génère un fichier Excel (.xlsx) soigné (titre coloré, en-tête, lignes alternées) reprenant les candidats affichés." }]));
b.push(spacer());

// ==== 6. Fiche candidat ====
b.push(h1("6. La fiche candidat et l'analyse IA"));
b.push(p([{ t: "Cliquez sur un candidat pour ouvrir sa fiche. Elle regroupe ses coordonnées, sa photo, son score et quatre onglets : Analyse IA, Expérience & CV, Lettre de motivation, Historique." }]));
b.push(h2("Lancer l'analyse IA"));
b.push(numbered([{ t: "1. ", b: true }, { t: "Assurez-vous que le CV du candidat est renseigné (texte ou import)." }]));
b.push(numbered([{ t: "2. ", b: true }, { t: "Cliquez sur « Analyser avec l'IA »." }]));
b.push(numbered([{ t: "3. ", b: true }, { t: "En quelques secondes, l'IA fournit un score global, des scores détaillés (expérience, compétences, adéquation), une synthèse et une recommandation (Entretien, Réserve ou Rejet)." }]));
b.push(h2("Les actions disponibles"));
b.push(bullet([{ t: "Télécharger le CV : ", b: true }, { t: "génère un PDF structuré et paginé (coordonnées, évaluation IA, expériences, formation, compétences)." }]));
b.push(bullet([{ t: "Envoyer un email : ", b: true }, { t: "contactez le candidat directement depuis sa fiche." }]));
b.push(bullet([{ t: "Partager le profil : ", b: true }, { t: "transmettez la fiche à un collègue (l'action est tracée)." }]));
b.push(bullet([{ t: "Changer la photo : ", b: true }, { t: "ajoutez ou remplacez la photo du candidat (max 2 Mo). Elle reste visible en ligne durablement." }]));
b.push(bullet([{ t: "Importer un CV : ", b: true }, { t: "depuis l'onglet « Expérience & CV », importez un PDF, un Word ou une image pour (re)remplir le CV." }]));
b.push(spacer());

// ==== 7. Pipeline ====
b.push(h1("7. Suivre le recrutement avec le Pipeline"));
b.push(p([{ t: "Le Pipeline présente vos candidats en colonnes, une par étape du processus. Faites glisser une carte d'une colonne à l'autre pour faire avancer un candidat." }]));
b.push(p([{ t: "Les étapes standard sont :" }]));
b.push(bullet([{ t: "Reçu → Analysé → Pré-sélectionné → Entretien RH → Test technique → Entretien final → Offre envoyée → Embauché" }]));
b.push(bullet([{ t: "Une étape « Rejeté » permet d'écarter proprement une candidature." }]));
b.push(p([{ t: "Vue d'un coup d'œil : ", b: true }, { t: "le Pipeline vous montre où en est chaque candidat et combien de profils se trouvent à chaque étape." }]));
b.push(spacer());

// ==== 8. Calendrier / Emails / Recherche IA ====
b.push(h1("8. Calendrier, Emails et Recherche IA"));
b.push(h2("Calendrier"));
b.push(p([{ t: "Planifiez et visualisez les entretiens. Chaque entretien planifié apparaît aussi dans l'onglet « Historique » de la fiche du candidat concerné." }]));
b.push(h2("Emails"));
b.push(p([{ t: "Retrouvez les échanges e-mail avec les candidats, au même endroit que le suivi." }]));
b.push(h2("Recherche IA — retrouver le bon profil en langage courant"));
b.push(p([{ t: "La Recherche IA vous permet de fouiller votre base de candidats en écrivant votre besoin comme vous le diriez à voix haute, sans mots-clés rigides ni filtres à cocher. L'intelligence artificielle lit votre demande, la compare aux profils de votre entreprise et vous propose les candidats les plus pertinents, accompagnés d'une explication." }]));
b.push(h3("Comment l'utiliser"));
b.push(numbered([{ t: "1. ", b: true }, { t: "Ouvrez l'onglet « Recherche IA » dans le menu." }]));
b.push(numbered([{ t: "2. ", b: true }, { t: "Décrivez le profil recherché en une phrase, en langage naturel." }]));
b.push(numbered([{ t: "3. ", b: true }, { t: "Lancez la recherche : l'IA affiche une sélection de candidats et un court texte expliquant pourquoi ils ont été retenus. Cliquez sur un profil pour ouvrir sa fiche." }]));
b.push(h3("Exemples de recherches"));
b.push(bullet([{ t: "« Développeur React avec au moins 3 ans d'expérience »" }]));
b.push(bullet([{ t: "« Chef de projet bilingue anglais, secteur bancaire »" }]));
b.push(bullet([{ t: "« Profil DevOps maîtrisant AWS et Kubernetes »" }]));
b.push(bullet([{ t: "« Comptable rigoureux avec une certification, basé à Antananarivo »" }]));
b.push(h3("Ce que l'IA prend en compte"));
b.push(p([{ t: "Elle s'appuie sur les informations issues de l'analyse des CV : compétences, années d'expérience, savoir-être, localisation, et le score d'adéquation. Plus vos candidats ont été analysés, plus la recherche est précise." }]));
b.push(h3("Conseils pour de bons résultats"));
b.push(bullet([{ t: "Soyez précis : ", b: true }, { t: "mentionnez les compétences clés, le niveau d'expérience et, si utile, la localisation ou le secteur." }]));
b.push(bullet([{ t: "Une idée par recherche : ", b: true }, { t: "si vous ne trouvez pas, reformulez plus simplement plutôt que d'empiler les critères." }]));
b.push(bullet([{ t: "Analysez d'abord vos candidats : ", b: true }, { t: "la recherche est d'autant plus fine que les fiches ont été passées par « Analyser avec l'IA »." }]));
b.push(h3("Bon à savoir"));
b.push(bullet([{ t: "La recherche ne porte que sur les candidats de votre entreprise (vos données restent cloisonnées)." }]));
b.push(bullet([{ t: "L'IA propose une aide à la décision : à vous de confirmer en ouvrant les fiches. Si un résultat vous surprend, reformulez la demande." }]));
b.push(bullet([{ t: "La recherche reste rapide même sur une grande base : l'outil présélectionne les profils les plus prometteurs avant de les faire trier par l'IA." }]));
b.push(spacer());

// ==== 9. Rapports ====
b.push(h1("9. Rapports et exports Excel"));
b.push(p([{ t: "L'onglet « Rapports » propose des statistiques sur votre activité de recrutement et des exports Excel prêts à partager." }]));
b.push(p([{ t: "L'export du Tableau de bord comporte 5 feuilles : Indicateurs clés, Candidats, Répartition par expérience, Offres publiées et Tendance du sourcing. Tous les fichiers sont mis en forme (couleurs, en-têtes, colonnes aérées)." }]));
b.push(spacer());

// ==== 10. Page publique ====
b.push(h1("10. Recevoir des candidatures en ligne (page « Postuler »)"));
b.push(p([{ t: "La plateforme fournit une page publique « Postuler » que vous pouvez communiquer aux candidats (lien se terminant par /postuler). Le candidat y :" }]));
b.push(bullet([{ t: "choisit l'offre qui l'intéresse ;" }]));
b.push(bullet([{ t: "saisit ses coordonnées et, en option, sa photo et son profil LinkedIn ;" }]));
b.push(bullet([{ t: "joint son CV (PDF ou image) et, en option, sa lettre de motivation (PDF ou Word)." }]));
b.push(p([{ t: "Dès l'envoi, le candidat apparaît automatiquement dans votre base, prêt à être analysé. Aucune saisie manuelle de votre côté." }]));
b.push(spacer());

// ==== 11. Administration ====
b.push(h1("11. Utilisateurs, Connexions et Paramètres"));
b.push(p([{ t: "Ces sections sont réservées à l'administration (voir le chapitre 12)." }]));
b.push(bullet([{ t: "Utilisateurs : ", b: true }, { t: "gérer les comptes de votre équipe (ajout, rôle)." }]));
b.push(bullet([{ t: "Connexions : ", b: true }, { t: "journal des connexions (date, adresse IP, navigateur) — réservé aux administrateurs, à des fins de sécurité." }]));
b.push(bullet([{ t: "Paramètres : ", b: true }, { t: "personnalisation, notamment le nom de l'application affiché (marque blanche)." }]));
b.push(spacer());

// ==== 12. Rôles ====
b.push(h1("12. Rôles et permissions"));
b.push(p([{ t: "Ce que vous voyez et pouvez faire dépend de votre rôle. En synthèse :" }]));
b.push(table(
  ["Section", "Admin (plateforme / entreprise)", "Manager", "RH / Consultant"],
  [
    ["Tableau de bord, Offres, Candidats, Pipeline, Calendrier, Emails, Recherche IA, Rapports", "Oui", "Oui", "Oui"],
    ["Utilisateurs", "Oui", "Oui", "Non"],
    ["Paramètres", "Oui", "Oui", "Non"],
    ["Connexions (journal IP)", "Oui", "Non", "Non"],
  ]
));
b.push(p([{ t: "Si un onglet n'apparaît pas dans votre menu, c'est que votre rôle n'y donne pas accès. Rapprochez-vous de votre administrateur si besoin." }]));
b.push(spacer());

// ==== 13. FAQ ====
b.push(h1("13. Questions fréquentes (FAQ)"));
b.push(bullet([{ t: "L'analyse IA ne se lance pas / renvoie une erreur. ", b: true }, { t: "Vérifiez que le CV du candidat contient bien du texte. Réessayez après quelques secondes ; en cas d'échec répété, contactez votre administrateur." }]));
b.push(bullet([{ t: "L'import d'un CV en image échoue. ", b: true }, { t: "La lecture des images nécessite le service d'IA (déjà actif en ligne). Un PDF ou un Word fonctionne toujours ; privilégiez une image nette et bien cadrée." }]));
b.push(bullet([{ t: "Je ne vois pas les onglets Utilisateurs / Paramètres / Connexions. ", b: true }, { t: "C'est normal : ils sont réservés aux administrateurs et managers." }]));
b.push(bullet([{ t: "La photo d'un candidat ne s'affiche pas. ", b: true }, { t: "Vérifiez qu'elle fait moins de 2 Mo et qu'il s'agit bien d'une image (JPG, PNG)." }]));
b.push(bullet([{ t: "L'application semble lente au premier chargement. ", b: true }, { t: "Après une période d'inactivité, le serveur peut mettre 30 à 60 secondes à se réveiller. Les chargements suivants sont rapides." }]));
b.push(bullet([{ t: "J'ai oublié mon mot de passe. ", b: true }, { t: "Utilisez « Mot de passe oublié ? » sur l'écran de connexion pour recevoir un lien de réinitialisation." }]));
b.push(spacer());
b.push(p([{ t: "Besoin d'aide ? ", b: true }, { t: "Contactez votre administrateur de plateforme. Bonne utilisation de Nexus Talent !" }]));

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
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:spacing w:after="120"/></w:pPr><w:rPr><w:b/><w:color w:val="1E3A8A"/><w:sz w:val="48"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:color w:val="475569"/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="280" w:after="120"/><w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="DBEAFE"/></w:pBdr></w:pPr><w:rPr><w:b/><w:color w:val="2563EB"/><w:sz w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:spacing w:before="160" w:after="80"/><w:keepNext/></w:pPr><w:rPr><w:b/><w:color w:val="334155"/><w:sz w:val="25"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:pPr><w:spacing w:before="120" w:after="60"/><w:keepNext/></w:pPr><w:rPr><w:b/><w:color w:val="475569"/><w:sz w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Bullet"><w:name w:val="Bullet"/><w:pPr><w:spacing w:after="60"/><w:ind w:left="360" w:hanging="360"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="TableCell"><w:name w:val="TableCell"/><w:pPr><w:spacing w:after="20" w:line="252" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/></w:rPr></w:style>
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
const outPath = path.join(process.cwd(), "Manuel-Utilisateur-Nexus-Talent.docx");
zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("Écrit :", outPath, "(" + buf.length + " octets)");
});
