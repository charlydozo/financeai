# Dozanta

Plateforme de trading intelligente propulsée par IA — Next.js 14, tRPC, Prisma/PostgreSQL, NextAuth, Stripe, Alpaca Markets, LangGraph.

## Stack

| Couche | Technologie |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, lightweight-charts |
| API | tRPC v10, Next.js Route Handlers |
| Auth | NextAuth v4 (Google OAuth + magic link) |
| Base de données | PostgreSQL via Prisma ORM |
| Paiements | Stripe (abonnements) |
| Marché | Alpaca Markets (paper trading) + Yahoo Finance |
| IA | Anthropic Claude via LangGraph |

---

## Déploiement en production

L'architecture recommandée est :
- **Railway** → PostgreSQL (base de données)
- **Vercel** → application Next.js (frontend + API serverless)

> Alternative : déployer l'application complète sur Railway si vous avez besoin de connexions SSE longue durée sans limite de timeout.

---

### Étape 1 — Base de données PostgreSQL sur Railway

1. Connectez-vous sur [railway.app](https://railway.app) et créez un nouveau projet.

2. Dans le projet, cliquez **New Service → Database → PostgreSQL**.

3. Une fois le service créé, allez dans l'onglet **Variables** du service PostgreSQL et copiez la valeur de `DATABASE_URL`.

4. Gardez cette valeur pour l'étape 2.

---

### Étape 2 — Déploiement de l'application sur Vercel

#### 2.1 — Importer le dépôt

1. Allez sur [vercel.com/new](https://vercel.com/new).
2. Importez votre dépôt GitHub/GitLab.
3. Vercel détecte automatiquement Next.js. **Ne changez pas** le framework preset.

#### 2.2 — Configurer les variables d'environnement

Dans **Settings → Environment Variables**, ajoutez toutes les variables listées dans `.env.example`. Valeurs clés :

| Variable | Où trouver la valeur |
|---|---|
| `DATABASE_URL` | Railway → service PostgreSQL → Variables |
| `NEXTAUTH_URL` | Votre domaine Vercel, ex. `https://dozanta.vercel.app` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) |
| `STRIPE_SECRET_KEY` / `STRIPE_PRO_PRICE_ID` | [dashboard.stripe.com](https://dashboard.stripe.com) |
| `STRIPE_WEBHOOK_SECRET` | Voir étape 4 |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `ALPACA_API_KEY` / `ALPACA_API_SECRET` | [alpaca.markets](https://alpaca.markets) → Paper Trading |

#### 2.3 — Déployer

Cliquez **Deploy**. Vercel exécutera :
```
npx prisma generate && next build
```
(défini dans `vercel.json`)

#### 2.4 — Initialiser la base de données

Après le premier déploiement réussi, lancez depuis votre machine locale :

```bash
# Pointer sur la DB de production
DATABASE_URL="<votre DATABASE_URL Railway>" npx prisma db push
```

> Pour les déploiements suivants avec des changements de schéma, utilisez `prisma migrate deploy` après avoir créé des migrations avec `prisma migrate dev`.

---

### Étape 3 — Services externes

#### Google OAuth

1. Allez sur [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) → **Credentials → Create Credentials → OAuth 2.0 Client ID**.
2. Application type : **Web application**.
3. Ajoutez ces URIs de redirection autorisées :
   ```
   https://votre-domaine.com/api/auth/callback/google
   ```
4. Copiez `Client ID` → `GOOGLE_CLIENT_ID` et `Client Secret` → `GOOGLE_CLIENT_SECRET`.

#### Stripe Webhook

1. Allez sur [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks) → **Add endpoint**.
2. URL : `https://votre-domaine.com/api/webhooks/stripe`
3. Événements à écouter :
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copiez le **Signing secret** → `STRIPE_WEBHOOK_SECRET` dans Vercel.

#### Stripe Product & Price

1. Allez dans **Products → Add product**, créez le plan PRO (29 €/mois).
2. Copiez l'ID du prix (format `price_...`) → `STRIPE_PRO_PRICE_ID`.

---

### Étape 4 — Cron SMARTPLAN (stratégies automatiques)

Le fichier `vercel.json` configure un cron Vercel qui appelle `/api/cron/strategies` tous les jours ouvrés à 9h UTC :

```json
{
  "crons": [{ "path": "/api/cron/strategies", "schedule": "0 9 * * 1-5" }]
}
```

Le cron est protégé par `CRON_SECRET`. Vercel injecte automatiquement l'en-tête `Authorization: Bearer <CRON_SECRET>` lors de l'appel.

> **Note :** Le cron Vercel nécessite un plan **Pro** ou supérieur. Sur le plan Hobby, déclenchez le cron manuellement ou via un service externe comme [cron-job.org](https://cron-job.org) avec l'en-tête `Authorization: Bearer <CRON_SECRET>`.

---

## Déploiement alternatif : application complète sur Railway

Utilisez cette option si vous souhaitez tout héberger sur Railway (recommandé pour éviter les timeouts sur les connexions SSE en temps réel).

### 3.1 — Créer le service applicatif

1. Dans votre projet Railway, cliquez **New Service → GitHub Repo** et sélectionnez votre dépôt.
2. Railway détecte le fichier `railway.json` et configure automatiquement :
   - **Build** : `npx prisma generate && npm run build`
   - **Start** : `npm run start`

### 3.2 — Variables d'environnement

Dans l'onglet **Variables** du service applicatif, ajoutez les mêmes variables que la section 2.2. Pour `DATABASE_URL`, Railway propose le **Reference Variable** `${{Postgres.DATABASE_URL}}` qui se lie automatiquement au service PostgreSQL.

### 3.3 — Domaine

Dans l'onglet **Settings → Networking**, cliquez **Generate Domain** pour obtenir un domaine Railway, puis mettez à jour `NEXTAUTH_URL` avec ce domaine.

### 3.4 — Initialiser la base de données

Depuis votre machine locale :
```bash
DATABASE_URL="<DATABASE_URL Railway>" npx prisma db push
```

### 3.5 — Cron SMARTPLAN sur Railway

Railway ne dispose pas de cron intégré pour les applications web. Options :
- **Upstash QStash** : créez un job HTTP POST vers `https://votre-app.up.railway.app/api/cron/strategies` avec l'en-tête `Authorization: Bearer <CRON_SECRET>` et le schedule `0 9 * * 1-5`.
- **cron-job.org** : service gratuit, même configuration.

---

## Développement local

```bash
# 1. Cloner et installer
git clone <repo>
cd dozanta
npm install

# 2. Configurer l'environnement
cp .env.example .env.local
# Remplir .env.local avec vos valeurs locales

# 3. Démarrer PostgreSQL (Docker)
docker run -d --name dozanta-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=dozanta -p 5432:5432 postgres:16

# 4. Initialiser la base de données
npx prisma db push
npx prisma generate

# 5. Lancer le serveur de développement
npm run dev
```

Accédez à [http://localhost:3000](http://localhost:3000).

Le bouton **Connexion rapide en dev** est disponible sur la page login pour se connecter sans OAuth.

---

## Commandes utiles

```bash
# Build de production local
npm run build

# Voir la base de données (UI Prisma Studio)
npm run db:studio

# Appliquer les changements de schéma (développement)
npm run db:push

# Créer une migration
npm run db:migrate

# Générer le client Prisma
npm run db:generate

# Lancer le cron manuellement (remplacer SECRET et URL)
curl -H "Authorization: Bearer <CRON_SECRET>" https://votre-domaine.com/api/cron/strategies
```

---

## Checklist post-déploiement

- [ ] `DATABASE_URL` pointe sur la base Railway (avec `?sslmode=require`)
- [ ] `npx prisma db push` exécuté sur la DB de production
- [ ] `NEXTAUTH_URL` correspond exactement au domaine de production
- [ ] URI de redirection Google OAuth mise à jour avec le domaine de production
- [ ] Webhook Stripe créé et `STRIPE_WEBHOOK_SECRET` mis à jour
- [ ] Test d'un paiement Stripe en mode test
- [ ] Cron `/api/cron/strategies` testé manuellement
- [ ] Connexion Google OAuth testée en production
