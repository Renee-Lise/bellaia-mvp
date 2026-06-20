# Bellaïa Hub — ERP Bella'Studio

**"Bellaïa prépare. Renée-Lise décide."**

Fondatrice : Renée-Lise Vilosa · Sinnamary, Guyane française

---

## Stack technique

- **Next.js 15** + React 19 + TypeScript
- **Supabase** — base de données + authentification
- **Vercel** — déploiement production
- **Anthropic Claude** — IA Bellaïa intégrée
- **SumUp** — paiement en ligne

---

## Déploiement

### Projet Vercel officiel : `bellaia-mvp`

> ⚠️ Ne jamais créer un nouveau projet Vercel.
> Toujours déployer sur `bellaia-mvp` via GitHub.

### Connexion GitHub → Vercel

1. Vercel → projet `bellaia-mvp` → Settings → Git
2. Connect Git Repository → `Renee-Lise/bellaia-mvp`
3. Branch : `main`
4. Save → déploiement automatique à chaque push

### Variables d'environnement (déjà configurées dans `bellaia-mvp`)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
NEXT_PUBLIC_WA_NUMBER
NEXT_PUBLIC_APP_URL
SUMUP_MERCHANT_CODE
SUMUP_CLIENT_ID
SUMUP_CLIENT_SECRET
SUMUP_REDIRECT_URI
SUMUP_ENV
SUMUP_API_URL
NEXT_PUBLIC_SUMUP_ENABLED
```

### Secrets GitHub requis (Settings → Secrets → Actions)

| Secret | Où le trouver |
|---|---|
| `VERCEL_TOKEN` | Vercel → Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel → Settings → General → Team ID |
| `VERCEL_PROJECT_ID` | Vercel → `bellaia-mvp` → Settings → General → Project ID |

---

## Structure du projet

```
src/
├── app/
│   ├── api/
│   │   ├── auth/login/route.ts       ← Connexion Supabase
│   │   ├── auth/logout/route.ts
│   │   ├── chat/route.ts             ← IA Bellaïa (Anthropic)
│   │   ├── paiement/stripe-webhook/  ← Webhook Stripe
│   │   └── payments/sumup/
│   │       ├── create-checkout/      ← Checkout SumUp (OAuth + token)
│   │       ├── verify-status/        ← Vérif statut paiement
│   │       └── webhook/              ← Webhook SumUp
│   ├── paiement/
│   │   ├── annule/                   ← Page retour annulation
│   │   ├── retour/                   ← Page retour générale
│   │   └── succes/                   ← Page retour succès
│   ├── layout.tsx                    ← Layout PWA
│   └── page.tsx                      ← Point d'entrée
├── components/
│   ├── BellaiaApp.tsx                ← Application principale (~4500 lignes)
│   ├── ClientWrapper.tsx             ← SSR guard (ssr: false)
│   └── PaymentSelector.tsx           ← Paiement global tous pôles
└── lib/
    ├── supabase.ts
    └── useSupabase.ts
```

---

## Modules opérationnels

### Dashboard fondatrice (11 onglets)
◈ Accueil · 👥 CRM · € Finances · ✨ Events · ✦ BSH · 🗂 Structure · 🎯 Projets · ✔ Tâches · 📦 Stocks · 📚 Éditions · ◎ IA

### Paiement SumUp
- Supporte `SUMUP_ACCESS_TOKEN` (token statique) OU `SUMUP_CLIENT_ID` + `SUMUP_CLIENT_SECRET` (OAuth)
- WhatsApp jamais ouvert si SumUp est sélectionné
- Enregistrement automatique dans Supabase (`payments`)

### IA Bellaïa
- Lit les données Supabase en temps réel (finances, projets, tâches)
- 3 onglets : Chat · Urgences · Projets
- 6 actions rapides contextuelles
