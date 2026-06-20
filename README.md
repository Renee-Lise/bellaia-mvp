# Bellaïa Hub — ERP Bella'Studio

**"Bellaïa prépare. Renée-Lise décide."**

Fondatrice : Renée-Lise Vilosa · Sinnamary, Guyane française

---

## Projet Vercel officiel

**Nom :** `bellaia-1.1`
**URL :** `https://bellaia-11-azure.vercel.app`

> ⚠️ Ne jamais créer un autre projet Vercel.
> Ne jamais utiliser `bellaia-mvp` (ancienne vitrine).
> Toujours déployer sur `bellaia-1.1` via GitHub.

---

## Connexion GitHub → Vercel

1. Vercel → projet `bellaia-1.1` → Settings → Git
2. Connect Git Repository → ton dépôt GitHub Bellaïa
3. Branche : `main`
4. Save → déploiement automatique à chaque push, variables conservées

---

## Variables d'environnement (configurées dans `bellaia-1.1`)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
NEXT_PUBLIC_WA_NUMBER
NEXT_PUBLIC_APP_URL=https://bellaia-11-azure.vercel.app
SUMUP_MERCHANT_CODE
SUMUP_CLIENT_ID
SUMUP_CLIENT_SECRET
SUMUP_REDIRECT_URI
SUMUP_ENV
SUMUP_API_URL
NEXT_PUBLIC_SUMUP_ENABLED
```

---

## Stack

- Next.js 15 + React 19 + TypeScript
- Supabase (base de données + auth)
- Vercel (déploiement)
- Anthropic Claude (IA Bellaïa)
- SumUp (paiement en ligne)

---

## Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/login/route.ts
│   │   ├── auth/logout/route.ts
│   │   ├── chat/route.ts                     ← IA Bellaïa
│   │   └── payments/sumup/
│   │       ├── create-checkout/route.ts       ← SumUp OAuth + token
│   │       ├── verify-status/route.ts
│   │       └── webhook/route.ts
│   ├── paiement/annule/
│   ├── paiement/retour/
│   ├── paiement/succes/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── BellaiaApp.tsx           ← Application principale
│   ├── ClientWrapper.tsx        ← SSR guard
│   └── PaymentSelector.tsx      ← Paiement global tous pôles
└── lib/
    ├── supabase.ts
    └── useSupabase.ts
```

---

## Modules actifs

### Dashboard fondatrice — 11 onglets scrollables
◈ Accueil · 👥 CRM · € Finances · ✨ Events · ✦ BSH · 🗂 Structure · 🎯 Projets · ✔ Tâches · 📦 Stocks · 📚 Éditions · ◎ IA

### Paiement SumUp
- OAuth Client Credentials (SUMUP_CLIENT_ID + SUMUP_CLIENT_SECRET)
- Fallback SUMUP_ACCESS_TOKEN si configuré
- WhatsApp jamais ouvert si SumUp sélectionné

### IA Bellaïa
- Données Supabase temps réel
- Chat · Urgences · Projets

---

## Secrets GitHub Actions requis

Vercel → projet `bellaia-1.1` → Settings → General :

| Secret GitHub | Valeur |
|---|---|
| `VERCEL_TOKEN` | Vercel → Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel → `bellaia-1.1` → Settings → General → Team ID |
| `VERCEL_PROJECT_ID` | Vercel → `bellaia-1.1` → Settings → General → Project ID |
