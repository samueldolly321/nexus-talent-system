/* Génère "Guide-Comprendre-Le-Code-Nexus.docx" : documentation pédagogique
   (niveau débutant React/JS) expliquant chaque fichier du projet et à quoi
   servent les fonctions, pour permettre des modifications en autonomie. */
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function run(r) {
  const t = typeof r === "string" ? { t: r } : r;
  const rpr = [];
  if (t.b) rpr.push("<w:b/>");
  if (t.i) rpr.push("<w:i/>");
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
const h3 = (t) => para("Heading3", t);
const p = (r) => para("Body", r);
const bullet = (r) => para("Bullet", r);
const code = (t) => para("Code", { t, code: true });
const note = (r) => para("Note", r);
const spacer = () => para("Body", "");

const b = [];

// ============ COUVERTURE ============
b.push(title("Comprendre le code de Nexus Talent"));
b.push(p([{ t: "Guide pédagogique pour débutant — expliqué fichier par fichier, fonction par fonction, pour pouvoir modifier le projet soi-même. Généré le " }, { t: new Date().toLocaleDateString("fr-FR") }, { t: "." }]));
b.push(note([{ t: "Comment lire ce guide : ", b: true }, { t: "lisez d'abord la Partie 1 (les bases) si les mots « composant », « props » ou « API » ne vous parlent pas. Ensuite, servez-vous des Parties 3 et 4 comme d'un dictionnaire : quand vous voulez modifier un écran, cherchez son fichier. La Partie 6 donne des recettes concrètes (« je veux changer X, je touche à quoi »)." }]));
b.push(spacer());

// ============ PARTIE 1 — LES BASES ============
b.push(h1("Partie 1 — Les bases (à lire si vous débutez)"));

b.push(h2("1.1 Une application web = deux moitiés"));
b.push(p([{ t: "Nexus est une application « full-stack » : elle a deux moitiés qui se parlent." }]));
b.push(bullet([{ t: "Le front-end (l'avant) : ", b: true }, { t: "tout ce que l'utilisateur voit et clique dans le navigateur. Écrit en React. Dossier " }, { t: "src/", code: true }, { t: "." }]));
b.push(bullet([{ t: "Le back-end (l'arrière) : ", b: true }, { t: "le serveur qui reçoit les demandes, parle à la base de données et renvoie les données. Écrit avec Express. C'est le fichier " }, { t: "server.ts", code: true }, { t: "." }]));
b.push(bullet([{ t: "La base de données : ", b: true }, { t: "là où tout est stocké durablement (utilisateurs, offres, candidats…). C'est PostgreSQL, et on lui parle via un outil nommé Prisma." }]));
b.push(note([{ t: "Image mentale : ", b: true }, { t: "le front-end est le serveur d'un restaurant (il prend la commande, apporte l'assiette), le back-end est la cuisine (il prépare), la base de données est le garde-manger (les ingrédients)." }]));

b.push(h2("1.2 React : composants, props et state"));
b.push(bullet([{ t: "Composant : ", b: true }, { t: "un morceau d'écran réutilisable, écrit comme une fonction qui renvoie du « HTML enrichi » (le JSX). Ex. : " }, { t: "DashboardView", code: true }, { t: " est le composant du tableau de bord. Un fichier " }, { t: ".tsx", code: true }, { t: " = un composant." }]));
b.push(bullet([{ t: "Props : ", b: true }, { t: "les informations qu'un composant reçoit de son parent (comme les paramètres d'une fonction). Ex. : on passe la liste " }, { t: "candidates", code: true }, { t: " à une vue pour qu'elle l'affiche. Le composant NE modifie PAS ses props." }]));
b.push(bullet([{ t: "State (état) : ", b: true }, { t: "la mémoire interne d'un composant, qui peut changer (ex. : le texte tapé dans un champ). On le crée avec " }, { t: "useState", code: true }, { t: ". Quand le state change, React redessine l'écran automatiquement." }]));
b.push(bullet([{ t: "useEffect : ", b: true }, { t: "sert à lancer une action « au bon moment », typiquement charger des données quand l'écran s'affiche." }]));
b.push(bullet([{ t: "Handler : ", b: true }, { t: "une fonction déclenchée par une action de l'utilisateur. Par convention son nom commence par " }, { t: "handle", code: true }, { t: " (ex. " }, { t: "handleSubmit", code: true }, { t: " = « quand on valide le formulaire »)." }]));

b.push(h2("1.3 Comment le front parle au back : les API"));
b.push(p([{ t: "Le front demande des données au serveur via des « appels API ». Un appel vise une adresse (endpoint) commençant par " }, { t: "/api/", code: true }, { t: " et utilise un verbe :" }]));
b.push(bullet([{ t: "GET", b: true }, { t: " = lire (ex. " }, { t: "GET /api/candidates", code: true }, { t: " → « donne-moi les candidats »)." }]));
b.push(bullet([{ t: "POST", b: true }, { t: " = créer (ex. " }, { t: "POST /api/jobs", code: true }, { t: " → « crée une offre »)." }]));
b.push(bullet([{ t: "PUT", b: true }, { t: " = modifier ; " }, { t: "DELETE", b: true }, { t: " = supprimer." }]));
b.push(p([{ t: "Chaque endpoint " }, { t: "/api/…", code: true }, { t: " côté front correspond à un bloc " }, { t: "app.get(...)", code: true }, { t: " / " }, { t: "app.post(...)", code: true }, { t: " dans " }, { t: "server.ts", code: true }, { t: ". C'est le lien clé à comprendre." }]));

b.push(h2("1.4 Le token (connexion sécurisée)"));
b.push(p([{ t: "Quand on se connecte, le serveur renvoie un « token » (un laissez-passer). Le front le joint à chaque appel pour prouver qui il est. Vous n'avez presque jamais à y toucher : tout passe par le fichier " }, { t: "src/lib/api.ts", code: true }, { t: "." }]));

b.push(h2("1.5 TypeScript en une phrase"));
b.push(p([{ t: "Les fichiers " }, { t: ".ts", code: true }, { t: " / " }, { t: ".tsx", code: true }, { t: " sont du JavaScript avec des « types » (on précise qu'une variable est un texte, un nombre, une liste de candidats…). Ça évite des erreurs. Les types partagés sont dans " }, { t: "src/types.ts", code: true }, { t: "." }]));
b.push(spacer());

// ============ PARTIE 2 — ARCHITECTURE ============
b.push(h1("Partie 2 — Vue d'ensemble et arborescence"));
b.push(p([{ t: "Le chemin d'une donnée, par exemple « afficher les candidats » :" }]));
b.push(code("Navigateur (React, src/) → appel /api/candidates → server.ts → Prisma → PostgreSQL"));
b.push(p([{ t: "…puis la réponse revient dans l'autre sens et s'affiche à l'écran." }]));
b.push(h2("Arborescence des dossiers importants"));
b.push(code("server.ts            → le serveur (back-end), toutes les routes /api"));
b.push(code("prisma/schema.prisma → la structure de la base (les « tables »)"));
b.push(code("prisma/seed.ts       → les données de démo"));
b.push(code("src/App.tsx          → le chef d'orchestre du front (navigation, état global)"));
b.push(code("src/main.tsx         → le point de démarrage du front + pages publiques"));
b.push(code("src/components/      → un fichier .tsx par écran (les « vues »)"));
b.push(code("src/lib/             → outils partagés (api.ts, mappers.ts, prisma.ts, excelExport.ts)"));
b.push(code("src/types.ts         → les types partagés (formes des données)"));
b.push(code("vite.config.ts       → configuration de l'outil de build"));
b.push(code("render.yaml          → configuration du déploiement en ligne (Render)"));
b.push(spacer());

// ============ PARTIE 3 — BACK-END ============
b.push(h1("Partie 3 — Le back-end (le serveur)"));

b.push(h2("server.ts — le serveur, découpé en sections"));
b.push(p([{ t: "C'est le plus gros fichier (~2300 lignes). Ne le lisez pas d'un bloc : il est organisé en sections repérables par des bandeaux de commentaires " }, { t: "// =====", code: true }, { t: ". Voici la carte :" }]));
b.push(h3("Sécurité (haut du fichier)"));
b.push(bullet([{ t: "Protège l'app : en-têtes de sécurité (Helmet), autorisation des origines (CORS), et limitation du nombre de tentatives (anti-force brute) sur le login et la candidature." }]));
b.push(h3("Uploads (photos)"));
b.push(bullet([{ t: "Configure la réception des images (photos de profil) en mémoire, limite à 2 Mo, n'accepte que JPG/PNG/WebP." }]));
b.push(h3("Config Auth + Gemini"));
b.push(bullet([{ t: "Définit les « secrets » des tokens (durée : 15 min pour l'accès, 30 jours pour le renouvellement) et initialise l'IA Gemini (clé " }, { t: "GEMINI_API_KEY", code: true }, { t: ")." }]));
b.push(h3("Authentification"));
b.push(bullet([{ t: "requireAuth", b: true }, { t: " : le « videur » placé devant les routes protégées (vérifie le token)." }]));
b.push(bullet([{ t: "POST /api/auth/login", b: true }, { t: " (vérifie email + mot de passe), " }, { t: "POST /api/auth/refresh", b: true }, { t: " (renouvelle le token), " }, { t: "GET /api/auth/me", b: true }, { t: " (qui suis-je)." }]));
b.push(h3("Mot de passe oublié + OAuth Google"));
b.push(bullet([{ t: "POST /api/auth/forgot-password", b: true }, { t: " et " }, { t: "reset-password", b: true }, { t: " (lien par email, expire en 1 h). Routes Google : " }, { t: "/api/auth/google", code: true }, { t: " (liaison de compte, pas d'auto-inscription)." }]));
b.push(h3("Sociétés, utilisateurs, contexte, stats"));
b.push(bullet([{ t: "GET /api/context", b: true }, { t: " (société + utilisateur actifs), " }, { t: "GET/POST /api/users", b: true }, { t: " (gérer les comptes, réservé aux admins), " }, { t: "GET /api/dashboard/stats", b: true }, { t: " (les chiffres du tableau de bord : KPIs, tendances, répartitions)." }]));
b.push(h3("Offres (Jobs)"));
b.push(bullet([{ t: "GET/POST/PUT/DELETE /api/jobs", b: true }, { t: " : créer / lister / modifier / archiver une offre. La suppression est une « archive » par défaut (récupérable)." }]));
b.push(h3("Candidats"));
b.push(bullet([{ t: "GET /api/candidates", b: true }, { t: " (liste paginée + triée), " }, { t: "PUT /api/candidates/:id/stage", b: true }, { t: " (changer l'étape du pipeline), " }, { t: "POST /api/candidates/:id/avatar", b: true }, { t: " (photo), " }, { t: "POST /api/candidates/:id/cv", b: true }, { t: " (importer un CV PDF/Word/image avec OCR)." }]));
b.push(h3("Actions IA Gemini"));
b.push(bullet([{ t: "POST /api/candidates/:id/analyze", b: true }, { t: " : envoie le CV + l'offre à l'IA, récupère l'analyse, les scores et la recommandation (Entretien / Réserve / Rejet)." }]));
b.push(bullet([{ t: "ocrImageToText / extractCvText", b: true }, { t: " : lisent le texte d'un CV (image via IA, ou PDF/Word)." }]));
b.push(h3("Entretiens + emails candidats"));
b.push(bullet([{ t: "POST/GET/DELETE /api/interviews", b: true }, { t: " (planifier / lister / annuler) et l'envoi d'emails aux candidats." }]));
b.push(h3("Candidature publique (page /postuler)"));
b.push(bullet([{ t: "GET /api/public/jobs", b: true }, { t: " (offres visibles publiquement, sans connexion) et " }, { t: "POST /api/public/apply", b: true }, { t: " (reçoit la candidature : infos + CV + lettre + photo, crée le candidat)." }]));
b.push(h3("Intégration Vite / démarrage"));
b.push(bullet([{ t: "Tout en bas : sert le front (React) et démarre l'écoute du serveur sur le port. En prod, sert le dossier " }, { t: "dist/", code: true }, { t: "." }]));
b.push(note([{ t: "Règle d'or : ", b: true }, { t: "chaque fois que le front appelle une adresse " }, { t: "/api/…", code: true }, { t: ", la logique correspondante est ici, dans le bloc " }, { t: "app.get/post/put/delete(\"/api/…\")", code: true }, { t: " du même nom." }]));

b.push(h2("prisma/schema.prisma — la structure de la base"));
b.push(p([{ t: "Décrit les « tables » (appelées modèles) et leurs colonnes. C'est ICI qu'on ajoute/retire un champ stocké en base. Principaux modèles :" }]));
b.push(bullet([{ t: "Company", b: true }, { t: " (entreprise) — l'app est « multi-entreprise » : presque tout est rattaché à une " }, { t: "companyId", code: true }, { t: "." }]));
b.push(bullet([{ t: "User", b: true }, { t: " (comptes : nom, email, rôle, mot de passe haché…)." }]));
b.push(bullet([{ t: "Job", b: true }, { t: " (offres : titre, lieu, contrat, salaire, statut Active/Archived/Draft, compétences…)." }]));
b.push(bullet([{ t: "Candidate", b: true }, { t: " (candidats : nom, email, étape du pipeline, texte du CV, photo " }, { t: "avatarUrl", code: true }, { t: ", plus l'analyse IA et les scores)." }]));
b.push(bullet([{ t: "CandidateScore", b: true }, { t: " (les 6 scores 0-100), " }, { t: "Skill / JobSkill / CandidateSkill", b: true }, { t: " (les compétences partagées et leurs liens), " }, { t: "Email, Interview, AuditLog", b: true }, { t: " (boîte sourcing, entretiens, journal des actions)." }]));
b.push(note([{ t: "Attention : ", b: true }, { t: "modifier ce fichier nécessite ensuite une « migration » (voir Partie 6). Ne le faites pas à la légère en production." }]));

b.push(h2("prisma/seed.ts — les données de démo"));
b.push(p([{ t: "Remplit la base avec des exemples (2 entreprises, quelques utilisateurs, offres et candidats). Il est « idempotent » : le relancer n'écrase jamais l'existant (il complète seulement ce qui manque). Comptes de démo créés ici (ex. " }, { t: "admin@techcorp.io / admin123", code: true }, { t: ")." }]));

b.push(h2("src/lib/prisma.ts — la connexion à la base"));
b.push(p([{ t: "Crée UNE seule connexion Prisma partagée par tout le serveur. Vous n'avez quasiment jamais à y toucher." }]));

b.push(h2("src/lib/mappers.ts — traducteur base ↔ écran"));
b.push(p([{ t: "Convertit les données brutes de la base vers la forme attendue par l'écran (et enlève les infos sensibles comme le mot de passe). Ex. : " }, { t: "mapCandidate", code: true }, { t: ", " }, { t: "mapJob", code: true }, { t: ". Traduit aussi les « codes » internes en libellés français (rôles, étapes)." }]));
b.push(note([{ t: "Bon à savoir : ", b: true }, { t: "si un champ existe en base mais n'apparaît pas à l'écran, c'est souvent qu'il faut l'exposer ici, dans le bon " }, { t: "map…", code: true }, { t: "." }]));
b.push(spacer());

// ============ PARTIE 4 — FRONT-END ============
b.push(h1("Partie 4 — Le front-end (les écrans)"));

b.push(h2("Le socle"));
b.push(h3("src/main.tsx — le démarrage"));
b.push(bullet([{ t: "Point d'entrée : lance React et gère un routage simple des pages publiques (login, /postuler, /reset-password, support, confidentialité). Initialise le mode sombre." }]));
b.push(h3("src/App.tsx — le chef d'orchestre"));
b.push(bullet([{ t: "Rôle : ", b: true }, { t: "gère la navigation entre les écrans, l'état global (liste des offres, candidats, emails…), la connexion, et décide quelle vue afficher." }]));
b.push(bullet([{ t: "fetchData", b: true }, { t: " : charge les données de départ (contexte, offres, candidats, emails, stats)." }]));
b.push(bullet([{ t: "handleLogin / handleLogout", b: true }, { t: " : connexion / déconnexion. " }, { t: "renderMainContent", b: true }, { t: " : le « grand aiguillage » qui affiche la bonne vue selon l'onglet choisi." }]));
b.push(note([{ t: "Pour ajouter un nouvel écran : ", b: true }, { t: "c'est ici (dans " }, { t: "renderMainContent", code: true }, { t: ") qu'on le branche, et dans " }, { t: "Sidebar.tsx", code: true }, { t: " qu'on ajoute l'entrée de menu (voir Partie 6)." }]));
b.push(h3("src/lib/api.ts — le facteur"));
b.push(bullet([{ t: "Centralise tous les appels au serveur et gère le token automatiquement (le renouvelle en silence s'il expire). Fonctions : " }, { t: "apiFetch", code: true }, { t: ", " }, { t: "apiJson", code: true }, { t: ", " }, { t: "getAccessToken", code: true }, { t: "." }]));
b.push(h3("src/types.ts — les formes de données"));
b.push(bullet([{ t: "Définit à quoi ressemble un " }, { t: "User", code: true }, { t: ", un " }, { t: "Job", code: true }, { t: ", un " }, { t: "Candidate", code: true }, { t: "… Sert de référence commune au front et au back." }]));
b.push(h3("src/SidebarContext.ts"));
b.push(bullet([{ t: "Petit utilitaire technique pour ouvrir le menu latéral depuis n'importe quelle vue (évite de passer la fonction partout à la main)." }]));

b.push(h2("Navigation"));
b.push(h3("src/components/Sidebar.tsx — le menu de gauche"));
b.push(bullet([{ t: "Affiche le logo, les entrées de menu (filtrées selon le rôle), le mode sombre, l'utilisateur. La fonction " }, { t: "canSee", code: true }, { t: " décide quelles entrées sont visibles selon le rôle (ex. « Connexions » = admins seulement)." }]));
b.push(h3("src/components/TopBar.tsx — la barre du haut"));
b.push(bullet([{ t: "Barre supérieure : recherche, notifications (5 dernières actions), aide. Prop utile : " }, { t: "hideSearch", code: true }, { t: " pour masquer la recherche sur une page (comme le tableau de bord)." }]));

b.push(h2("Écrans principaux"));
b.push(h3("src/components/DashboardView.tsx — tableau de bord"));
b.push(bullet([{ t: "Vue d'accueil : indicateurs clés, graphiques (tendance, répartition par expérience), candidats récents, dernières offres. " }, { t: "handleExportReport", code: true }, { t: " génère l'export Excel (5 onglets)." }]));
b.push(h3("src/components/JobsView.tsx — offres d'emploi"));
b.push(bullet([{ t: "Créer / modifier / archiver / filtrer les offres. Le formulaire d'ajout est un modal. " }, { t: "handleSubmit", code: true }, { t: " prépare l'offre et la transmet au parent (App) qui appelle l'API." }]));
b.push(h3("src/components/CandidatesView.tsx — liste des candidats"));
b.push(bullet([{ t: "Tableau des candidats avec tri, pagination, recherche, et export Excel (" }, { t: "handleExportListe", code: true }, { t: "). Cliquer un candidat ouvre sa fiche." }]));
b.push(h3("src/components/CandidateProfileView.tsx — fiche candidat"));
b.push(bullet([{ t: "Détail d'un candidat : onglets (Analyse IA, Expérience & CV, Lettre, Historique). Gère l'import du CV (" }, { t: "handleImportCv", code: true }, { t: "), la photo (" }, { t: "handleAvatarSubmit", code: true }, { t: ") et l'export PDF soigné de la fiche (" }, { t: "downloadCv", code: true }, { t: ")." }]));
b.push(h3("src/components/PipelineView.tsx — le pipeline (kanban)"));
b.push(bullet([{ t: "Les candidats répartis par étape, en colonnes (kanban) ou en liste. Glisser-déposer un candidat change son étape (" }, { t: "handleDrop", code: true }, { t: " → " }, { t: "onUpdateStage", code: true }, { t: ")." }]));
b.push(h3("src/components/ReportsView.tsx — rapports"));
b.push(bullet([{ t: "Statistiques + génération de documents : export Excel stylé (" }, { t: "handleExportExcel", code: true }, { t: ") et export PDF imprimable (" }, { t: "handleExportPdf", code: true }, { t: ")." }]));

b.push(h2("Intelligence artificielle"));
b.push(h3("src/components/AiSearchView.tsx — recherche par IA"));
b.push(bullet([{ t: "Rechercher des candidats en langage naturel (ex. « développeur React senior à Tana »). " }, { t: "handleSearch", code: true }, { t: " → " }, { t: "POST /api/candidates/ai-search", code: true }, { t: "." }]));
b.push(h3("src/components/RecommendationView.tsx — recommandation IA"));
b.push(bullet([{ t: "Affiche l'analyse détaillée d'un candidat (forces, faiblesses, décision). Permet de planifier un entretien ou de partager le profil." }]));

b.push(h2("Comptes et accès"));
b.push(h3("src/components/LoginView.tsx — connexion"));
b.push(bullet([{ t: "Email/mot de passe, mot de passe oublié, bouton Google. " }, { t: "handleSubmit", code: true }, { t: " (se connecter), " }, { t: "submitForgot", code: true }, { t: " (demande de réinitialisation)." }]));
b.push(h3("src/components/ResetPasswordView.tsx — nouveau mot de passe"));
b.push(bullet([{ t: "Page atteinte via le lien reçu par email ; " }, { t: "submit", code: true }, { t: " valide et enregistre le nouveau mot de passe." }]));
b.push(h3("src/components/SettingsView.tsx — paramètres"));
b.push(bullet([{ t: "Changer son mot de passe et (pour les admins) le nom de l'entreprise / de l'app." }]));
b.push(h3("src/components/ConnectionsView.tsx — journal des connexions"));
b.push(bullet([{ t: "Historique des connexions (IP, navigateur, date). Réservé aux admins. Lit " }, { t: "GET /api/audit-logs", code: true }, { t: "." }]));

b.push(h2("Communication"));
b.push(h3("src/components/EmailInboxView.tsx — boîte sourcing"));
b.push(bullet([{ t: "Emails de candidature reçus ; permet de les importer comme candidats (gère les doublons). " }, { t: "handleConfirmImport", code: true }, { t: "." }]));
b.push(h3("src/components/CalendarView.tsx — calendrier des entretiens"));
b.push(bullet([{ t: "Planifier / voir / annuler les entretiens. " }, { t: "fetchInterviews", code: true }, { t: ", " }, { t: "handlePlan", code: true }, { t: ", " }, { t: "handleDelete", code: true }, { t: "." }]));

b.push(h2("Pages publiques (sans connexion)"));
b.push(h3("src/components/ApplyView.tsx — page /postuler"));
b.push(bullet([{ t: "Le formulaire de candidature en ligne : offre, coordonnées, photo, CV (PDF ou image), lettre. " }, { t: "handleSubmit", code: true }, { t: " envoie tout à " }, { t: "POST /api/public/apply", code: true }, { t: "." }]));
b.push(h3("src/components/SupportView.tsx & PrivacyView.tsx"));
b.push(bullet([{ t: "Pages statiques : aide/FAQ et politique de confidentialité. Pas de logique, juste du contenu à éditer." }]));

b.push(h2("Autres"));
b.push(h3("src/components/ArchivedJobsView.tsx — offres archivées"));
b.push(bullet([{ t: "Lister, restaurer ou supprimer définitivement les offres archivées." }]));
b.push(h3("src/components/DevCenterView.tsx — centre technique"));
b.push(bullet([{ t: "Ressources techniques et un bouton d'administration (recalcul des prétentions salariales). Usage avancé." }]));
b.push(h3("src/lib/excelExport.ts — mise en forme des exports Excel"));
b.push(bullet([{ t: "L'outil partagé qui fabrique les jolis fichiers .xlsx (titre coloré, en-tête, lignes zébrées, colonnes aérées). Utilisé par Tableau de bord, Rapports et Candidats. Fonction principale : " }, { t: "buildStyledSheet", code: true }, { t: " (une feuille) et " }, { t: "downloadStyledWorkbook", code: true }, { t: " (assemble et télécharge)." }]));
b.push(note([{ t: "Pour changer les couleurs des exports : ", b: true }, { t: "tout est en haut de ce fichier, dans l'objet " }, { t: "C = { … }", code: true }, { t: " (codes couleur hexadécimaux)." }]));
b.push(spacer());

// ============ PARTIE 5 — CONFIG & DÉPLOIEMENT ============
b.push(h1("Partie 5 — Configuration & déploiement"));
b.push(h3("vite.config.ts"));
b.push(bullet([{ t: "Configure l'outil qui construit le front. Contient notamment la desserte du dossier " }, { t: "/uploads", code: true }, { t: " en dev et le découpage des grosses librairies (recharts, xlsx) en fichiers séparés." }]));
b.push(h3("render.yaml"));
b.push(bullet([{ t: "Décrit le déploiement sur Render : la commande de build (installe, applique les migrations, seed, construit) et les variables secrètes (base de données, clés API). Les secrets se règlent dans le tableau de bord Render, jamais dans le code." }]));
b.push(h3("package.json"));
b.push(bullet([{ t: "Liste les dépendances (librairies) et les commandes : " }, { t: "npm run dev", code: true }, { t: " (développement), " }, { t: "npm run lint", code: true }, { t: " (vérifier), " }, { t: "npm run build", code: true }, { t: " (construire)." }]));
b.push(spacer());

// ============ PARTIE 6 — RECETTES ============
b.push(h1("Partie 6 — Recettes : « je veux modifier X »"));

b.push(h2("Changer un texte affiché à l'écran"));
b.push(bullet([{ t: "1. Repérez l'écran concerné (Partie 4) et ouvrez son fichier " }, { t: ".tsx", code: true }, { t: " dans " }, { t: "src/components/", code: true }, { t: "." }]));
b.push(bullet([{ t: "2. Cherchez le texte visible (Ctrl+F) et modifiez-le. Vérifiez avec " }, { t: "npm run dev", code: true }, { t: "." }]));

b.push(h2("Changer une couleur / un style"));
b.push(bullet([{ t: "Les styles sont des classes Tailwind dans le " }, { t: "className=\"…\"", code: true }, { t: " (ex. " }, { t: "bg-emerald-600", code: true }, { t: " = fond vert). Changez la classe. Pour les couleurs des exports Excel : voir " }, { t: "src/lib/excelExport.ts", code: true }, { t: "." }]));

b.push(h2("Ajouter une colonne à un export Excel"));
b.push(bullet([{ t: "Dans le fichier de la vue (ex. " }, { t: "ReportsView.tsx", code: true }, { t: "), ajoutez le champ dans l'objet " }, { t: "rows", code: true }, { t: " ET une entrée " }, { t: "{ header, key }", code: true }, { t: " dans " }, { t: "columns", code: true }, { t: ". C'est tout, le style s'applique automatiquement." }]));

b.push(h2("Ajouter un champ à un formulaire (les 3 étages)"));
b.push(p([{ t: "C'est l'opération la plus complète car elle traverse toute l'app. Exemple : ajouter « Site web » à un candidat." }]));
b.push(bullet([{ t: "1) La base : ", b: true }, { t: "ajoutez le champ dans " }, { t: "prisma/schema.prisma", code: true }, { t: " (ex. " }, { t: "websiteUrl String?", code: true }, { t: "), puis créez la migration (voir plus bas)." }]));
b.push(bullet([{ t: "2) Le back : ", b: true }, { t: "exposez le champ dans " }, { t: "src/lib/mappers.ts", code: true }, { t: " (" }, { t: "mapCandidate", code: true }, { t: ") et acceptez-le dans la route " }, { t: "PUT /api/candidates/:id", code: true }, { t: " de " }, { t: "server.ts", code: true }, { t: ". Ajoutez-le aussi dans " }, { t: "src/types.ts", code: true }, { t: "." }]));
b.push(bullet([{ t: "3) Le front : ", b: true }, { t: "ajoutez le champ de saisie dans la vue concernée (ex. la fiche candidat) et incluez-le dans l'envoi." }]));
b.push(note([{ t: "Règle utile : ", b: true }, { t: "« don't modify src/lib » signifie ne pas casser la logique existante ; ajouter proprement un nouveau champ dans un mapper est légitime." }]));

b.push(h2("Ajouter un nouvel écran / onglet"));
b.push(bullet([{ t: "1. Créez " }, { t: "src/components/MaVue.tsx", code: true }, { t: " (copiez une vue simple comme modèle)." }]));
b.push(bullet([{ t: "2. Branchez-la dans " }, { t: "renderMainContent", code: true }, { t: " de " }, { t: "src/App.tsx", code: true }, { t: "." }]));
b.push(bullet([{ t: "3. Ajoutez l'entrée de menu dans " }, { t: "src/components/Sidebar.tsx", code: true }, { t: " (et gérez la visibilité par rôle si besoin)." }]));

b.push(h2("Le cycle de travail (mémo commandes)"));
b.push(code("npm run dev     # lancer en local (http://localhost:3000)"));
b.push(code("npm run lint    # vérifier que le code compile (à faire avant de pousser)"));
b.push(code("git add .  &&  git commit -m \"ma modif\"  &&  git push origin main   # déployer"));
b.push(p([{ t: "Un " }, { t: "git push origin main", code: true }, { t: " déclenche automatiquement le redéploiement en ligne (Render)." }]));
b.push(h3("Si vous avez modifié la base (schema.prisma)"));
b.push(code("npx prisma migrate dev --name mon_changement   # serveur de dev arrêté"));
b.push(p([{ t: "Puis committez le dossier " }, { t: "prisma/", code: true }, { t: " et poussez. Render appliquera la migration au déploiement." }]));
b.push(h3("Si vous avez ajouté une librairie"));
b.push(p([{ t: "Committez " }, { t: "package.json", code: true }, { t: " ET " }, { t: "package-lock.json", code: true }, { t: ", et faites " }, { t: "npm install", code: true }, { t: " sur les autres postes." }]));
b.push(spacer());

// ============ PARTIE 7 — GLOSSAIRE ============
b.push(h1("Partie 7 — Petit glossaire"));
b.push(bullet([{ t: "Front-end / Back-end : ", b: true }, { t: "l'interface (navigateur) / le serveur." }]));
b.push(bullet([{ t: "Composant : ", b: true }, { t: "un morceau d'écran React (un fichier .tsx)." }]));
b.push(bullet([{ t: "Props : ", b: true }, { t: "données reçues par un composant. State : mémoire interne modifiable." }]));
b.push(bullet([{ t: "Endpoint / route : ", b: true }, { t: "une adresse " }, { t: "/api/…", code: true }, { t: " côté serveur." }]));
b.push(bullet([{ t: "Prisma : ", b: true }, { t: "l'outil qui parle à la base de données." }]));
b.push(bullet([{ t: "Migration : ", b: true }, { t: "un changement de structure de la base, versionné." }]));
b.push(bullet([{ t: "Seed : ", b: true }, { t: "remplissage de la base avec des données de démo." }]));
b.push(bullet([{ t: "Token / JWT : ", b: true }, { t: "le laissez-passer de connexion." }]));
b.push(bullet([{ t: "Multi-tenant : ", b: true }, { t: "plusieurs entreprises isolées dans la même app (via " }, { t: "companyId", code: true }, { t: ")." }]));
b.push(bullet([{ t: "OCR : ", b: true }, { t: "lire le texte d'une image (ici via l'IA Gemini)." }]));
b.push(bullet([{ t: "Handler : ", b: true }, { t: "fonction déclenchée par une action utilisateur (souvent " }, { t: "handleXxx", code: true }, { t: ")." }]));

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
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:color w:val="1E3A8A"/><w:sz w:val="44"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="280" w:after="120"/><w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="C7D2FE"/></w:pBdr></w:pPr><w:rPr><w:b/><w:color w:val="1E3A8A"/><w:sz w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:spacing w:before="220" w:after="80"/><w:keepNext/></w:pPr><w:rPr><w:b/><w:color w:val="2563EB"/><w:sz w:val="27"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:pPr><w:spacing w:before="160" w:after="40"/><w:keepNext/></w:pPr><w:rPr><w:b/><w:color w:val="0F172A"/><w:sz w:val="23"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Bullet"><w:name w:val="Bullet"/><w:pPr><w:spacing w:after="60"/><w:ind w:left="360" w:hanging="360"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:pPr><w:spacing w:after="120"/><w:ind w:left="240"/><w:shd w:val="clear" w:fill="EEF2F7"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Note"><w:name w:val="Note"/><w:pPr><w:spacing w:before="60" w:after="140"/><w:ind w:left="200"/><w:shd w:val="clear" w:fill="FFF7ED"/><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="F59E0B"/></w:pBdr></w:pPr><w:rPr><w:sz w:val="20"/></w:rPr></w:style>
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
const outPath = path.join(process.cwd(), "Guide-Comprendre-Le-Code-Nexus.docx");
zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("Écrit :", outPath, "(" + buf.length + " octets)");
});
