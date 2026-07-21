# Récapitulatif projet — Nexus Talent (de A à Z jusqu'à la mise en ligne)

> Document de contexte pour reprendre le projet à froid. Dernière mise à jour : **2026-07-21**.
> Propriétaire : Samuel (digital@salathis.com). Langue de travail : français.

---

## 1. C'est quoi ce projet ?

**Nexus Talent** = une plateforme de gestion de recrutement (ATS) **multi-tenant** :
offres d'emploi, base de candidats, pipeline kanban, **analyse de CV par IA**,
recherche sémantique, rapports/exports, connexions tracées.

Application **full-stack** : front React servi par un serveur Express unique, base
PostgreSQL via Prisma.

---

## 2. Stack technique

| Domaine  | Techno |
|----------|--------|
| Frontend | React 19, Vite 6, Tailwind CSS 4, Recharts, lucide-react |
| Backend  | Express 4 (`server.ts`), Vite en middleware pour le dev |
| Base     | PostgreSQL + **Prisma 6** (⚠️ épinglé v6, ne pas passer en v7) |
| Auth     | JWT (access en mémoire + refresh en cookie httpOnly), bcrypt |
| IA       | Google Gemini via `@google/genai` |
| Uploads  | multer (photos candidats + CV), disque local |
| PDF/CV   | jspdf (export), pdf-parse (PDF) + mammoth (Word .docx) pour l'import |
| Excel    | **xlsx-js-style** (exports .xlsx stylés — couleurs/bordures ; chargé à la demande) |

**Prérequis :** Node.js 20 LTS, PostgreSQL 14+, npm 10+.

---

## 3. Structure du code

```
server.ts            # API Express + intégration Vite + routes Gemini (~2000+ lignes)
prisma/
  schema.prisma      # modèle de données
  migrations/        # migrations SQL
  seed.ts            # données de démo (idempotent, upsert)
src/
  App.tsx            # racine React, routage de vues, état global
  components/        # vues : Dashboard, Candidates, Pipeline, Reports, Login,
                     #        CandidateProfileView, Connections, Settings, etc.
  lib/               # api.ts (fetch + JWT), prisma.ts, mappers.ts
  types.ts           # types partagés front
uploads/             # fichiers uploadés (non versionné)
scripts/             # générateurs de docs Word/Excel (gen-*.cjs) + utilitaires
render.yaml          # blueprint de déploiement Render
```

---

## 4. État de la mise en ligne — ✅ EN PRODUCTION

- **URL de prod** : https://nexus-talent-zk0a.onrender.com
- **Hébergement** : **Render** (serveur Node + front) + **Neon** (PostgreSQL). Plan gratuit.
- **Dépôt GitHub** : https://github.com/samueldolly321/nexus-talent-system (**privé**)
- **Branche déployée** : `main` — Render redéploie **automatiquement à chaque push**.
- **Build Render** (`render.yaml`) : `npm ci --include=dev && prisma generate && prisma migrate deploy && prisma db seed && npm run build`. Start : `npm start`.

### Comptes de démo (après seed)
| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin plateforme | `samuel@techcorp.io` | `admin123` |
| Admin entreprise | `admin@techcorp.io` | `admin123` |
| RH | `samuel@test.io` | `password123` |

---

## 5. Historique (de A à Z)

### 08/07 — Refonte login + préparation déploiement
- Page de connexion refondue (formulaire pleine largeur, panneau droit enrichi).
- **Mot de passe oublié** : flux email complet via Resend (`/reset-password`, token SHA-256, exp. 1h). Colonnes `User.resetTokenHash` / `resetTokenExpiry`.
- **Google / SSO OAuth** : flux HTTP direct, **liaison de compte uniquement** (pas d'auto-inscription), désactivés tant que non configurés dans `.env`.
- Migration `add_password_reset_tokens`.
- `server.ts` écoute sur `process.env.PORT` ; `render.yaml` créé.
- ⚠️ Token GitHub en clair retiré de l'URL du remote (à **révoquer** : `ghp_JLBr…`).

### 09/07 — MISE EN LIGNE + durcissement
- **Déploiement effectif** sur Render + Neon. Login démo testé (HTTP 200).
- Bug de connexion résolu : faute de frappe `FRONTEND_URL` (`.con` au lieu de `.com`) → CORS. Correctifs CORS (tolère slash/espaces, log des origines autorisées).
- Compte démo renommé `samuel@test.io / password123` ; **bouton SSO retiré** (Google seul, pleine largeur).
- Google OAuth **activé en prod**.
- Données : users Sarah Jenkins & Marc Antoine supprimés ; salaires des offres alignés à « 3 000 000 Ariary ».
- **Navigation par rôle** : onglets « Utilisateurs » et « Paramètres » masqués pour RH.
- **Sécurité serveur** : `GET /api/users` réservé admins/managers (403 pour RH) + filtre par entreprise (corrige une fuite multi-entreprise) ; `GET /api/context` liste users réservée gestion.
- **Traçabilité connexions** : IP + navigateur enregistrés (migration `add_audit_ip_useragent`), nouvel onglet **« Connexions »** (réservé Admins ; IP masquée pour les autres rôles).
- Correctif : bouton « Télécharger le CV » fonctionnel → export PDF via **jspdf** (nouvelle dépendance ajoutée ce jour-là).

### 10/07 — UX fiche candidat + nettoyage dashboard (dernière session)
Commits `852bc80` et `58f155e`, poussés et **déployés/vérifiés en prod**.
1. **Tableau de bord** : barre de recherche retirée (sans usage sur cette page). Prop `hideSearch` ajoutée à `TopBar` ; filtre « Candidats récents » supprimé ; `App.tsx` nettoyé.
2. **Import de CV** : bouton « Importer un CV » (**PDF ou Word .docx**) dans l'onglet « Expérience & CV » de la fiche candidat. Nouvel endpoint serveur **`POST /api/candidates/:id/cv`** (authentifié) : extraction du texte (pdf-parse / mammoth) → renvoie `{ cvText }` → persisté via `PUT /api/candidates/:id`.
3. **Export PDF soigné** : `downloadCv` réécrit dans `CandidateProfileView.tsx`. Fiche structurée en **tableaux** (coordonnées, évaluation IA, expériences, formation, compétences) + texte du CV en paragraphes + **pied de page paginé**. Helpers `pdfSectionTitle` / `pdfTable`.
- ⚠️ Aucune migration, aucun re-seed, **aucune nouvelle dépendance** ce jour.
- Docs générées : `Compte-Rendu-Nexus-2026-07-10.xlsx`, `Guide-Sync-Maison-2026-07-10.docx`, `Guide-Mettre-A-Jour-Le-Site-En-Ligne.docx`.

### 16/07 — Photo de profil sur /postuler + CV en image (OCR) (dernière session)
Commit `350310c`, poussé et **déployé/vérifié en prod** (bundle `index-ATTSTaMD.js` actif en ligne).
1. **Page `/postuler`** : nouveau champ **photo de profil** (optionnel, avec aperçu). La photo est encodée en **base64 (data URL)** et persistée dans `Candidate.avatarUrl` → s'affiche dans la fiche et **survit aux redéploiements** (le champ `avatarUrl` existait déjà : pas de migration).
2. **CV en image (JPG/PNG/WebP)** : le champ CV de `/postuler` **et** le bouton « Importer un CV » de la fiche candidat acceptent désormais les images. Extraction du texte par **OCR via Gemini** (déjà intégré, multimodal) → **aucune dépendance ajoutée**. PDF/Word toujours gérés (pdf-parse/mammoth).
3. **Avatar recruteur corrigé** : `POST /api/candidates/:id/avatar` renvoie maintenant une **data URL base64** (avant : fichier disque → cassé en prod car `/uploads` non servi + disque éphémère).
4. **Refactor serveur** : helpers partagés `ocrImageToText()` + `extractCvText()` (image/OCR, .docx, PDF) ; uploads concernés passés en **`memoryStorage`** (plus aucune écriture disque). Limite photo : **2 Mo**.
- Fichiers modifiés : `server.ts`, `src/components/ApplyView.tsx`, `src/components/CandidateProfileView.tsx`.
- ⚠️ Aucune migration, aucun re-seed, **aucune nouvelle dépendance** ce jour.
- ⚠️ L'OCR image nécessite `GEMINI_API_KEY` (déjà configurée en prod ; en local, l'ajouter au `.env` pour tester les images).
- Doc générée : `Guide-Sync-Maison-2026-07-16.docx`.

### 16/07 (suite) — Exports Excel soignés
Commit `0c1ca15`, poussé (déploiement Render en cours).
1. **Refonte de la mise en forme des exports Excel** : nouveau helper partagé **`src/lib/excelExport.ts`** (via **`xlsx-js-style`**) — bandeau titre coloré + sous-titre, ligne d'en-tête, lignes zébrées, bordures fines, colonnes auto-dimensionnées, nombres alignés à droite. Utilisé par **Tableau de bord, Rapports et Candidats**.
2. **Tableau de bord — 5 onglets** : KPIs, Candidats, **Répartition Expérience** (nouveau), **Offres publiées** (nouveau), Sourcing Trend.
3. **Nouvelle dépendance `xlsx-js-style`** : l'ancien `xlsx` (SheetJS CE) **n'applique pas les styles** ; ce drop-in oui. Chargée **à la demande** (import dynamique) → démarrage allégé. `vite.config.ts` : chunk `vendor-xlsx` pointe désormais sur `xlsx-js-style`.
- Fichiers : `src/lib/excelExport.ts` (nouveau), `DashboardView.tsx`, `ReportsView.tsx`, `CandidatesView.tsx`, `vite.config.ts`, `package.json`, `package-lock.json`.
- ⚠️ **Première nouvelle dépendance depuis un moment** → à la maison, `npm install` **requis** (committer `package.json` + `package-lock.json`, déjà fait).

### 17/07 — Import fichier CV/lettre à l'ajout d'un candidat (dernière session)
Commit `1420ffb`, poussé et déployé sur Render.
1. **Modal « Ajouter un candidat »** (onglet Candidats) : les champs **CV** et **Lettre de motivation** ont maintenant un bouton **« Importer »**, comme sur `/postuler`. **CV** = **PDF ou image** (JPG/PNG/WebP, OCR Gemini) ; **Lettre** = **PDF ou Word (.docx)**. Le texte extrait remplit le textarea et **reste éditable** (le collage manuel reste possible).
2. **Nouvel endpoint serveur `POST /api/extract-text`** (authentifié) : extraction « à la volée » **sans candidat existant** (la fiche n'existe pas encore au moment de l'ajout). Réutilise le helper `extractCvText()` (image OCR / .docx / PDF) et la config multer `memoryStorage` (10 Mo). Renvoie `{ text }`.
3. Front : `getAccessToken` importé dans `CandidatesView.tsx` ; inputs fichiers cachés + boutons avec spinner + validation de type côté client (mêmes règles que `/postuler`).
- Fichiers modifiés : `server.ts`, `src/components/CandidatesView.tsx`.
- ⚠️ **Aucune migration, aucun re-seed, aucune nouvelle dépendance** ce jour.
- ⚠️ L'OCR image nécessite `GEMINI_API_KEY` (déjà en prod ; en local, l'ajouter au `.env`). Sans clé, PDF/Word fonctionnent quand même.
- Doc générée : `Guide-Sync-Maison-2026-07-17.docx` (+ script `scripts/gen-guide-sync-maison-2026-07-17.cjs`).

### 17/07 (suite) — Manuel utilisateur (prise en main RH)
Commit `061c09c`, poussé.
1. **Manuel de prise en main** `Manuel-Utilisateur-Nexus-Talent.docx` : guide non technique et complet pour un nouveau responsable RH (13 chapitres + sommaire) — connexion, navigation, offres, candidats (dont import CV/lettre), fiche + analyse IA, pipeline, calendrier/emails/recherche IA, rapports, page publique `/postuler`, administration, **tableau des rôles/permissions**, FAQ.
2. Généré via **`scripts/gen-manuel-utilisateur.cjs`** (regénérable ; helper de tableau OOXML ajouté au générateur).
- ⚠️ Doc uniquement — **aucun changement de code**, aucune migration, aucune dépendance.

### 17/07 (suite) — Quick wins : recherche serveur + composant Button
Commit `25893ce`, poussé et déployé.
1. **Recherche candidats côté serveur** : `GET /api/candidates` lit `search` et filtre (`OR` sur name/email/phone/location, insensible casse) sur `count` + `findMany` → la recherche porte sur **toute la base**, plus seulement la page. Front : terme ajouté à la requête + **refetch temporisé (debounce 350 ms)** sur la vue Candidats (`App.tsx`).
2. **Composant `<Button>`** (`src/components/Button.tsx`) : variantes `primary/ghost/outline/danger`, 2 tailles — **un seul endroit** pour le style des boutons. Premier écran migré : `CandidatesView`. Migration des autres écrans = incrémentale.
- ⚠️ Aucune migration, aucune dépendance.

### 17/07 (suite) — Perf dashboard (Niveau 0) + colonne experienceYears (Niveau 1) + soft skills
Commit `b0182b5`, poussé et déployé (2 migrations appliquées via `migrate deploy`).
1. **Soft skills — offres** : nouveau champ **« Soft skills souhaités »** (création/édition), affiché dans la **liste** (badges **fond noir `bg-primary` / texte blanc `text-on-primary`**) et le détail. Nouvelle colonne **`Job.softSkillsRequired String[]`** (calquée sur `languagesRequired`) + migration `add_job_soft_skills_required`. Les soft skills souhaités **alimentent le prompt IA** → le `softSkillsScore` est évalué en regard des attentes du poste. Fichiers : `types.ts`, `schema.prisma`, `server.ts` (create/update/prompt), `mappers.ts` (`mapJob`), `JobsView.tsx`.
2. **Soft skills — fiche candidat** : nouveau bloc **« Savoir-être (soft skills) »** dans l'onglet Analyse IA (`CandidateProfileView.tsx`), badges **fond noir / texte blanc** (`bg-primary`/`text-on-primary`, commit `da91172`). Les soft skills étaient déjà extraits par l'IA (`analysis.skills.softSkills`) mais jamais affichés. (L'export PDF les listait déjà.)
3. **Niveau 0 — perf dashboard** : `GET /api/dashboard/stats` ne charge plus **toute la base** avec `candidateInclude` (CV/lettre/JSON). Deux requêtes ciblées : **5 fiches complètes** pour « Candidats récents » (`take: 5`) + **`select: { analysis: true }`** pour les distributions → charge transférée ÷5-10.
4. **Niveau 1 — colonne `Candidate.experienceYears Int?`** (indexée), miroir de `analysis.yearsOfExperience`, renseignée à l'analyse. Migration `add_candidate_experience_years` + script **`scripts/backfill-experience-years.cjs`** (idempotent, remplit les candidats déjà analysés). ⚠️ Le dashboard **ne lit pas encore** cette colonne (elle prépare le Niveau 2 + le futur filtre expérience côté serveur).
- ⚠️ **2 migrations additives** (colonnes ajoutées, sans perte). **Aucune dépendance npm.**
- ⚠️ **À la maison** : arrêter `npm run dev` → `npx prisma migrate deploy` → `npx prisma generate` (voir `Guide-Sync-Maison-2026-07-17.docx`). Backfill `experienceYears` = optionnel (pas urgent).
- ⚠️ **Reste à faire** : ~~Niveau 2~~ (fait) ; ~~Recherche IA « charge tout »~~ (fait, Option A) ; migration des autres boutons vers `<Button>` ; (optionnel) Recherche IA Option B = embeddings/pgvector pour un vrai sémantique.

### 17/07 (suite) — Filet de sécurité global (anti-crash)
Commit à venir. Robustesse serveur, **aucun changement fonctionnel**.
1. **Handlers process** (`server.ts`, après la création de `app`) : `process.on("unhandledRejection")` + `process.on("uncaughtException")` **loguent sans quitter** → une erreur async non capturée ne **tue plus le process entier** (avant : crash jusqu'au redémarrage Render). Choix « disponibilité d'abord ».
2. **Middleware d'erreur Express** (`errorHandler: express.ErrorRequestHandler`, 4 args) enregistré **en dernier** dans `startServer()` : toute erreur synchrone d'une route → **500 JSON propre** (gère `res.headersSent` pour éviter les doubles réponses).
- ⚠️ Constat : il n'existe **pas de tests automatisés** ; `build` + `lint` avant push attrapent les erreurs de type, pas la logique — d'où l'intérêt de ce filet.
- Fichier : `server.ts` uniquement. Aucune migration, aucune dépendance.

### 17/07 (suite) — Niveau 2 : top compétences en SQL (fin du « charge tout »)
Commit `8174be4`, poussé et déployé.
1. **Normalisation des compétences** (`server.ts`) : helper `syncCandidateSkills()` — à chaque analyse IA, `analysis.skills` est écrit dans la table normalisée **`CandidateSkill`** (upsert du référentiel `Skill` par catégorie + liens). Idempotent (remplace les liens du candidat). Transaction d'analyse élargie à 20 s. Buckets `SKILL_BUCKETS` (languages→Language, softSkills→SoftSkill, etc.).
2. **Dashboard réécrit** (`GET /api/dashboard/stats`) : suppression du `findMany` qui chargeait **tout `analysis`**. Le **top 7 compétences** = `groupBy` SQL sur `CandidateSkill` (join `Skill`) ; la **répartition expérience** = `COUNT ... FILTER` SQL sur `experienceYears` (Niveau 1). Le dashboard ne récupère plus que **5 fiches récentes** + des agrégats. Fin du scan.
3. **Backfills automatisés** : branchés dans la **section réconciliation du seed** (`prisma/seed.ts`, exécuté par Render à chaque déploiement) → `experienceYears` + `CandidateSkill` remplis pour les candidats déjà analysés. Idempotents (`skills: { none: {} }`). Script standalone `scripts/backfill-candidate-skills.cjs` conservé pour usage manuel.
- ⚠️ **Aucune migration, aucune dépendance, aucune régénération Prisma** (tables `Skill`/`CandidateSkill` déjà existantes).
- Vérifié end-to-end en local (login démo → `/api/dashboard/stats` : top compétences réel + tranches d'expérience correctes).

### 17/07 (suite) — Recherche IA scalable (Option A : retrieve then rerank)
Commit `fb2e434`, poussé et déployé. `server.ts` (`POST /api/candidates/ai-search`), **code uniquement**.
1. **Fin du « charge tout »** : au lieu d'envoyer TOUS les candidats dans le prompt Gemini (mur de fenêtre de contexte / coût / qualité), on **pré-filtre en SQL** puis on ne fait « reranker » par l'IA qu'un sous-ensemble **borné à 80**.
2. **Retrieve** : mots-clés extraits de la requête (hors stopwords, ≤ 8) → candidats matchant via `CandidateSkill` (compétences normalisées), `name` ou `location`, triés par score. **Complément** par les mieux notés si peu de correspondances.
3. **Rerank** : seule la pré-sélection (≤ 80) part à Gemini → taille de prompt bornée quel que soit le volume de la base.
4. **Robustesse** : parsing de la réponse Gemini rendu tolérant (nettoie ` ```json `, extrait l'objet, fallback résultat vide) — avant, un `JSON.parse` brut renvoyait une 500 sur réponse imparfaite.
- ⚠️ Limite : pré-filtre par mots-clés « littéral » (pas encore sémantique pur → ce serait l'**Option B** : embeddings + `pgvector`, effort élevé, plus tard si besoin).
- ⚠️ Aucune migration, aucune dépendance. Testé end-to-end (3 requêtes, dont un cas qui échouait avant).

### 17/07 (suite) — Génération d'offre par IA + robustesse des erreurs IA
`server.ts` + `src/components/JobsView.tsx`, **code uniquement**.
1. **Nouvel endpoint `POST /api/jobs/generate`** (authentifié) : à partir du seul **intitulé** (+ domaine optionnel), Gemini génère une offre structurée (description, missions, `skillsRequired`, `softSkillsRequired`, `languagesRequired`, formation, `minExperienceYears`, `contractType`, `domain`). Réponse **nettoyée/validée** côté serveur (contrat parmi l'enum, exp entier, tableaux filtrés). Helper de parsing tolérant réutilisable **`parseAiJsonLoose`**.
2. **Front** (`JobsView`) : bandeau **« Générer avec l'IA »** en tête du formulaire de **création** (masqué en édition) → pré-remplit **tous les champs d'un coup**, éditables ensuite. Utilise `apiFetch`. Spinner + erreur.
3. **Robustesse des erreurs IA** : helper **`aiTransientMessage`** → messages clairs et actionnables (503 surcharge « réessayez dans quelques instants » / 429 quota « réessayez plus tard ») appliqués à **génération, analyse et recherche IA** (qui ne fuite plus le message brut). `callGeminiWithRetry` passé de **3 à 4 tentatives**.
- ⚠️ Contexte : sur le **plan Gemini gratuit**, des rafales d'actions IA peuvent atteindre la limite de débit/quota par minute → message clair, il suffit d'attendre et réessayer (ce n'est pas un bug).
- ⚠️ Aucune migration, aucune dépendance. Testé end-to-end (offre IT + non-IT ; domaine bien déduit).

### 17/07 (suite) — Mise en page de la page publique /postuler
`src/components/ApplyView.tsx`, **code uniquement (mise en forme)**.
1. **Bloc élargi** (`max-w-xl` → `max-w-3xl`) et **champs 2 par 2** : Nom+Email, Téléphone+Localisation sur une ligne (grille `grid-cols-1 sm:grid-cols-2`) ; **Profil LinkedIn seul** ; Offre / Photo / CV / Lettre en pleine largeur.
2. **Scroll horizontal supprimé** : `w-screen` (= 100vw, déborde de la barre de défilement verticale sur desktop) → **`w-full`** sur la vue formulaire ET la vue confirmation.

### 17/07 (suite) — Fix : chargement infini si une mutation échoue
Commit `64ad61f`, poussé. `src/App.tsx`, **code uniquement**.
1. **Bug** : `handleCreateJob` / `handleEditJob` / `handleDeleteJob` / `handleAddCandidate` faisaient `if (res.ok) await fetchData()` **sans jamais remettre `loading` à `false`** quand la réponse était en erreur → l'onglet tournait **indéfiniment** (constaté en prod sur une création d'offre échouée transitoirement — hoquet Neon / réveil à froid du plan gratuit). L'offre n'était pas créée (transaction annulée).
2. **Correctif** : sur `!res.ok`, on lève l'erreur (avec le message serveur), `loading` est **toujours** réinitialisé, et une `alert()` claire invite à réessayer (aligné sur le mécanisme d'alerte déjà présent dans `App.tsx`).
- ⚠️ Rappel : **l'enregistrement d'une offre ne consomme pas de token IA** — seules la génération / analyse / recherche IA utilisent Gemini (quota gratuit : limite par minute → ~1-2 min ; quota journalier → réinit. minuit heure du Pacifique ≈ 10 h à Madagascar).
- ⚠️ Aucune migration, aucune dépendance.

### 20/07 — Fix : « Erreur base de données » à la publication d'une offre (réveil à froid Neon)
Commit `c2ea370`, poussé et déployé. `server.ts`, **code uniquement**.
1. **Symptôme** : à la publication d'une offre (constaté sur une offre « Développeur Java » générée par l'IA), un `alert` **« La création de l'offre a échoué : Erreur base de données. Réessayez dans un instant. »** (500 côté serveur). Le message serveur générique masquait la cause réelle.
2. **Cause** : `POST /api/jobs` ouvrait une **transaction interactive** dont le helper `replaceJobSkills` faisait **2×N allers-retours** (`upsert` du référentiel Skill + `create` du lien JobSkill, **par compétence**). Pour 5-8 compétences → 10-16 round-trips séquentiels. Ces transactions utilisaient le **timeout Prisma par défaut (5 s)** (contrairement à la transaction d'analyse déjà à 20 s). Sur une **connexion Neon froide** (plan gratuit), les 16 allers-retours dépassaient 5 s → `P2028` → 500.
3. **Correctifs** (`server.ts`) : (a) `replaceJobSkills` **réécrit en 3 requêtes constantes** — `createMany({ skipDuplicates })` pour insérer les compétences inconnues, `findMany` pour récupérer les ids, `createMany({ skipDuplicates })` pour tous les liens → le nombre d'allers-retours **ne dépend plus** du nombre de compétences. (b) **Timeout élargi à 20 s** (`{ timeout: 20000, maxWait: 15000 }`) sur les transactions de **création ET mise à jour** d'offre, en filet pour les réveils à froid.
4. **Testé end-to-end en local** (compte démo) : création (8 compétences, 0.27 s), édition (`PUT`, delete+recreate, 0.24 s), 2ᵉ offre réutilisant des compétences existantes (branche `skipDuplicates`, 0.22 s), intégrité du référentiel Skill (1 ligne par compétence, **0 doublon**).
- ⚠️ Aucune migration, aucune dépendance, aucune régénération Prisma.
- ⚠️ Note : le front (fix `64ad61f` du 17/07) gérait déjà l'affichage (alerte + arrêt du spinner) ; ce qui manquait, c'est que **l'offre échouait vraiment** au lieu d'être créée — c'est ce chemin serveur qui est corrigé ici.
- ⚠️ Rappel constaté ce jour : `npm run lint` **échoue** à cause du dossier de sauvegarde non versionné **`maj-2026-07-10/`** déposé à la racine du repo parent (modules introuvables) — **sans rapport** avec le code de `nexus-final`. Le sortir du projet pour retrouver un lint propre.

### 21/07 — Détail d'offre en ligne sur mobile + grille Rôles & permissions (dernière session)
Commit `2d935e7`, poussé et déployé sur Render. **Code UI uniquement** (2 fichiers).
1. **Onglet Offres — détail « inline » sur mobile** (`src/components/JobsView.tsx`) : la page est une grille `grid-cols-1 xl:grid-cols-3` (liste `xl:col-span-2` + panneau détail `xl:col-span-1`). Sous le breakpoint `xl`, tout s'empilait en 1 colonne → le détail de l'offre cliquée apparaissait **tout en bas de la liste**. Correctif : le panneau détail est extrait dans un helper **`renderJobDetail(job, sticky)`** réutilisé à 2 endroits — **desktop (≥ xl)** : colonne latérale collante inchangée (conteneur passé en `hidden xl:block`) ; **mobile (< xl)** : le détail est injecté **en ligne, juste sous la carte cliquée** (`xl:hidden mt-4`, l'élément mappé devient un `React.Fragment`). Aucune logique métier touchée.
2. **Paramètres — grille « Rôles & permissions »** (`src/components/SettingsView.tsx`) : nouvelle section = **tableau de référence lecture seule** (actions × 5 rôles : Super admin, Admin, Manager, RH, Consultant), ✓ / — par case, colonne du rôle courant surlignée, `overflow-x-auto` (scroll horizontal mobile). Données `PERM_ROLES` + `PERM_MATRIX` au niveau module, **fidèles aux droits réels du code** (`Sidebar.canSee`, `SettingsView.canEditCompany`, gardes `server.ts`). Section **réservée aux Super admin + Admin** (`canEditCompany` = `AdminPlateforme || AdminEntreprise`) → respecte la consigne « seul le super admin et admin ». **Non éditable** (grille documentaire ; la rendre « pilotante » = gros chantier schéma + refonte des checks, à décider ensemble plus tard).
- ⚠️ **Aucune migration, aucune dépendance, aucune régénération Prisma.** `npm run build` OK avant push ; lint propre sur les 2 fichiers (seules les erreurs `maj-2026-07-10/` subsistent, hors sujet).
- Doc générée : `Guide-Sync-Maison-2026-07-21.docx` (+ script `scripts/gen-guide-sync-maison-2026-07-21.cjs`).

---

## 6. Comment mettre à jour le site (résumé)

**Principe : pousser sur `main` = déployer.** Render fait le reste (install, migrate, seed, build).

- **Code simple** : `git add . && git commit -m "…" && git push origin main`.
- **Changement de schéma** : `npx prisma migrate dev --name xxx` (serveur arrêté) → committer `prisma/` → push. Render applique via `migrate deploy`.
- **Nouvelle dépendance** : committer `package.json` **et** `package-lock.json`.
- **Toujours avant de pousser** : `npm run lint` (+ idéalement `npm run build`).
- **Secrets / variables** (`FRONTEND_URL`, `DATABASE_URL`, clés API) : **uniquement dans Render → Environment**, jamais dans Git.
- Après déploiement : attendre « Live » sur Render → ouvrir le site → **Ctrl+F5** → tester.

Détail complet : `Guide-Mettre-A-Jour-Le-Site-En-Ligne.docx`.

---

## 7. Pièges connus (à garder en tête)

- **Prisma épinglé v6** — ne pas upgrade v7 (casse le schéma sur Node 20 + datasource url legacy).
- **EPERM Windows** — arrêter `npm run dev` avant `prisma generate` / `migrate` (verrou du moteur).
- **CORS / FRONTEND_URL** — doit valoir EXACTEMENT l'URL prod (https, sans `/` final).
- **render.yaml pas relu au simple push** — la `buildCommand` est mémorisée ; les opérations par-déploiement passent par le seed. Un changement de config Render se fait dans le dashboard.
- **Plan gratuit Render** — serveur endormi après 15 min (réveil 30-60 s) ; **uploads non persistants** (disque éphémère) — c'est pourquoi l'import CV ne garde que le texte extrait, pas le fichier.
- **Timeout de transaction Prisma (défaut 5 s) + Neon froid** — une `$transaction` interactive qui fait beaucoup d'allers-retours (boucle d'upsert/create) peut dépasser 5 s sur une connexion Neon réveillée à froid → `P2028` → 500 « Erreur base de données ». Parades : **minimiser les round-trips** (`createMany` plutôt qu'une boucle) **et** passer un timeout explicite `{ timeout: 20000, maxWait: 15000 }` (comme les transactions d'analyse et de création/màj d'offre). Vu le 17/07 (analyse) et le 20/07 (offres).
- **`/uploads` non servi en prod** — en production, seul `dist/` est servi (`server.ts`, branche `NODE_ENV=production`), pas `/uploads`. Combiné au disque éphémère, **toute image stockée en fichier ne s'affiche pas en ligne**. C'est pourquoi les photos (candidat + recruteur) sont désormais stockées **en base64 dans `avatarUrl`** (base Neon), pas sur disque (depuis le 16/07).
- **OCR CV image = Gemini** — la lecture des CV en JPG/PNG passe par `GEMINI_API_KEY` (ajouter au `.env` en local pour tester). Sans clé, seuls PDF/Word fonctionnent.
- **Push Git** — fonctionne en direct depuis l'environnement (creds cachés dans Windows Credential Manager) ; si « Repository not found », demander à l'utilisateur de lancer `! git push origin main`.
- **Règle `src/lib`** — ne pas modifier la logique existante ; les ajouts légitimes (ex. exposer un champ de mapper) sont OK.

---

## 8. À FAIRE / en suspens

- ⚠️ **Révoquer l'ancien token GitHub exposé** `ghp_JLBr…` (GitHub → Settings → Developer settings → PAT) — toujours ouvert.
- (Optionnel) Supprimer la route serveur SSO inutilisée (`/api/auth/sso`) et la config `SSO_*` de `.env.example`.
- Migration backend en cours : passage progressif, route par route, de `server.ts` des tableaux en mémoire vers Prisma.

---

## 9. Skills Claude Code installés

- **`find-skills`** (vercel-labs) installé globalement dans `~/.claude/skills/find-skills/SKILL.md` — méta-skill pour découvrir/installer d'autres skills via `npx skills` (⚠️ exécute du code tiers, confirmer avant).

---

## 10. Commandes utiles (local)

```bash
npm run dev     # dev (front + back), http://localhost:3000
npm run lint    # tsc --noEmit (vérifie la compilation)
npm run build   # build front (Vite) + serveur (esbuild) dans dist/
npm start       # prod locale (dist/server.cjs)
npx prisma migrate dev --name <nom>   # créer + appliquer une migration
npx prisma db seed                    # (re)peupler les données de démo
```
