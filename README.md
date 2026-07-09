# Nexus Talent System

Plateforme de gestion de talents (ATS) multi-tenant : offres d'emploi, candidats,
pipeline de recrutement, analyse de CV et recherche sémantique par IA, rapports et
exports. Application full-stack React + Express, base PostgreSQL via Prisma.

## Stack

| Domaine   | Technologies |
|-----------|--------------|
| Frontend  | React 19, Vite 6, Tailwind CSS 4, Recharts, lucide-react |
| Backend   | Express 4 (`server.ts`), Vite en middleware pour le dev |
| Base      | PostgreSQL + Prisma 6 |
| Auth      | JWT (access en mémoire + refresh en cookie httpOnly), bcrypt |
| IA        | Google Gemini via `@google/genai` (modèle `gemini-3.5-flash`) |
| Uploads   | multer (photos candidats dans `/uploads`) |

## Prérequis

- **Node.js 20 LTS** (Prisma 6 + le reste de la stack sont testés sur Node 20)
- **PostgreSQL 14+**
- **npm 10+**

## Installation locale

```bash
# 1. Cloner et entrer dans le projet
git clone https://github.com/samueldolly321/nexus-talent-system.git
cd nexus-talent-system

# 2. Installer les dépendances
npm install

# 3. Créer la base de données PostgreSQL
#    (via psql ; ou pgAdmin : clic droit Databases > Create > Database "nexus")
psql -U postgres -c "CREATE DATABASE nexus;"

# 4. Configurer l'environnement
#    Copier .env.example en .env puis renseigner DATABASE_URL et GEMINI_API_KEY
cp .env.example .env      # (Windows PowerShell : Copy-Item .env.example .env)

# 5. Appliquer le schéma et générer le client Prisma
npx prisma migrate deploy
npx prisma generate

# 6. Remplir la base avec les données de démo
npx prisma db seed

# 7. Lancer l'application (front + back)
npm run dev
```

L'application est servie sur **http://localhost:3000**.

### Comptes de démo (après seed)

| Rôle             | Email                    | Mot de passe  |
|------------------|--------------------------|---------------|
| Admin plateforme | `samuel@techcorp.io`     | `admin123`    |
| Admin entreprise | `admin@techcorp.io`      | `admin123`    |
| RH               | `samuel@test.io`         | `password123` |

## Variables d'environnement

Voir [`.env.example`](.env.example). Le fichier `.env` n'est **jamais** versionné.

| Variable            | Requis | Rôle |
|---------------------|:------:|------|
| `DATABASE_URL`      | ✅     | Connexion PostgreSQL (`postgresql://user:pass@localhost:5432/nexus?schema=public`) |
| `GEMINI_API_KEY`    | ✅     | Clé Google Gemini — https://aistudio.google.com/apikey (format `AQ.`) |
| `JWT_ACCESS_SECRET` | ⬜     | Secret JWT access (valeur de dev par défaut si absent) |
| `JWT_REFRESH_SECRET`| ⬜     | Secret JWT refresh (valeur de dev par défaut si absent) |

## Scripts npm

| Script          | Effet |
|-----------------|-------|
| `npm run dev`   | Serveur de dev avec rechargement à chaud (`tsx watch server.ts`) |
| `npm run build` | Build front (Vite) + bundle serveur (esbuild) dans `dist/` |
| `npm start`     | Lance le serveur de production (`dist/server.cjs`) |
| `npm run lint`  | Vérification TypeScript (`tsc --noEmit`) |

## Base de données (Prisma)

```bash
npx prisma migrate dev --name <nom>   # créer + appliquer une migration
npx prisma migrate deploy             # appliquer les migrations existantes
npx prisma generate                   # régénérer le client typé
npx prisma studio                     # explorateur de données (navigateur)
npx prisma db seed                    # (re)peupler les données de démo (idempotent, upsert)
```

> **Windows** : arrêtez `npm run dev` avant un `prisma generate`/`migrate dev` —
> le serveur verrouille le moteur Prisma (erreur `EPERM` sinon).

### Migrer les données existantes vers une autre machine

Le clone fournit le **code** ; le schéma + seed fournit une base **de démo**. Pour
emporter vos **vraies données** :

```bash
# Machine source
pg_dump -U postgres nexus > nexus_dump.sql

# Machine cible (après CREATE DATABASE nexus, à la place du seed)
psql -U postgres nexus < nexus_dump.sql
```

Copiez aussi le dossier `uploads/` (photos candidats, non versionné) si besoin.

## Structure

```
server.ts            # API Express + intégration Vite + routes Gemini
prisma/
  schema.prisma      # modèle de données
  migrations/        # migrations SQL
  seed.ts            # données de démo (idempotent)
src/
  App.tsx            # racine React, routage de vues, état global
  components/        # vues (Dashboard, Candidats, Pipeline, Rapports…)
  lib/               # api.ts (fetch + JWT), prisma.ts, mappers.ts
  types.ts           # types partagés front
uploads/             # fichiers uploadés (non versionné)
```
