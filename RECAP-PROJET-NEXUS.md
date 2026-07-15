# Récapitulatif projet — Nexus Talent (de A à Z jusqu'à la mise en ligne)

> Document de contexte pour reprendre le projet à froid. Dernière mise à jour : **2026-07-16**.
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
