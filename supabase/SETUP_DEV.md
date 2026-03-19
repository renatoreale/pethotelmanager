# Setup DEV — Operazioni manuali

## 1. Pulizia utenti trial di test
Apri il SQL Editor del progetto DEV (`bshsppbcgvmjyellozbb`) e incolla:

→ File: `supabase/cleanup_trial_test_data.sql`

## 2. Elimina (e ricrea) il tenant demo
Se vuoi ripartire da zero con il tenant demo:

```
# Prima elimina in cascata
→ File: supabase/cleanup_demo_tenant.sql

# Poi ricrea
→ File: supabase/migrations/20260319100000_create_demo_tenant.sql
```

Se il tenant non esiste ancora, esegui solo il secondo script.

## 3. Variabile SITE_URL (critica per i link email)
Nel dashboard del progetto DEV → **Project Settings → Edge Functions → Secrets**:

```
SITE_URL = http://localhost:5173
```

> Se questa variabile punta alla URL di produzione, il link nell'email di benvenuto
> porterà al server sbagliato e l'utente non potrà impostare la password in locale.

## 4. Deploy edge function (provision-trial)
```bash
npx supabase login
npx supabase functions deploy provision-trial --project-ref bshsppbcgvmjyellozbb
```

## 5. Deploy edge function (register-trial)
```bash
npx supabase functions deploy register-trial --project-ref bshsppbcgvmjyellozbb
```
