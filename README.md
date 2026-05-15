# RestoPrix

MVP pour RestoPrix : SaaS d’aide à la fixation des prix pour restaurateurs (Québec). **Application 100 % Next.js** (App Router) avec Supabase (auth, données, Storage).

## Structure du dépôt

| Dossier / fichier | Rôle |
|-------------------|------|
| `app/` | Pages, layouts, routes API Next.js |
| `components/` | UI React (onboarding, dashboard, admin) |
| `lib/` | Clients Supabase, admin scrape, onboarding, intégrations (Square) |
| `public/` | Assets statiques |
| `supabase/` | Config projet / fonctions Edge (au besoin) |
| `docs/sql/` | Schémas SQL à appliquer dans l’éditeur Supabase |
| `PRD.MD` | Exigences produit et vision long terme |

## Prérequis

- Node.js 20+
- Projet Supabase (URL + clés)

## Configuration

```bash
cp .env.example .env.local
```

Si vous aviez un fichier `frontend/.env.local` avant la migration vers une seule app Next à la racine, **recopiez les valeurs** dans `.env.local` à la racine (l’ancien dossier `frontend/` a été fusionné puis supprimé).

Renseigner au minimum dans `.env.local` :

- `SUPABASE_URL`, `SUPABASE_API_KEY` (clé publishable / anon)
- `ADMIN_EMAILS` : e-mails autorisés sur `/admin/scraping` (liste séparée par des virgules, alignée sur l’utilisateur Supabase connecté)
- Pour l’extraction LLM (admin + onboarding menu PDF) : `ANTHROPIC_API_KEY` et optionnellement `ANTHROPIC_MODEL`

Voir `.env.example` pour le bucket menu onboarding (`NEXT_PUBLIC_ONBOARDING_MENU_BUCKET`), etc.

## Schéma Supabase

Dans l’éditeur SQL Supabase, exécuter **dans l’ordre** :

1. `docs/sql/onboarding_supabase.sql`
2. `docs/sql/scrape_admin.sql`
3. `docs/sql/square_supabase.sql` (rapports Square)

Puis créer le bucket Storage pour les PDF d’onboarding si vous utilisez l’upload (section en fin de `onboarding_supabase.sql`).

## Lancer l’app en local

```bash
npm install
npm run dev
```

Ou depuis la racine du dépôt :

```bash
./dev.sh
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Scripts npm

- `npm run dev` — serveur de développement
- `npm run build` — build production
- `npm run start` — serveur après build
- `npm run lint` — ESLint

## Admin scraping (LLM)

Avec `ANTHROPIC_API_KEY` dans `.env.local`, les scrapes manuels dans `/admin/scraping` utilisent **Claude** (Sonnet par défaut, surcharge possible avec `ANTHROPIC_MODEL`) pour produire du JSON menu validé (Zod). Sans clé, seul le mode heuristique est utilisé.
