# Collegare Supabase a I-AGILE

L'app conserva i dati in `app_states`: una riga privata per ogni utente autenticato. Le Row Level Security policies impediscono a un utente di leggere o modificare i dati di un altro.

## 1. Crea il progetto

1. Vai su [Supabase](https://supabase.com/dashboard) e crea un nuovo progetto.
2. Scegli una password del database e annotala in un password manager: non serve all'app.
3. Quando il progetto è pronto, apri **SQL Editor** e incolla tutto il contenuto di [`supabase/schema.sql`](./supabase/schema.sql). Eseguilo una volta.

## 2. Configura l'accesso con codice email

In **Authentication → URL Configuration** imposta:

- **Site URL**: `https://i-agile.vercel.app`
- **Redirect URLs**: aggiungi `http://localhost:3000` e `https://i-agile.vercel.app`

In **Authentication → Email Templates → Magic Link**, sostituisci il contenuto con un template che mostri `{{ .Token }}` e non `{{ .ConfirmationURL }}`. Per esempio:

```html
<h2>Il tuo codice di accesso a I-AGILE</h2>
<p>Inserisci questo codice nell'app per accedere:</p>
<p style="font-size: 28px; font-weight: 700; letter-spacing: 0.15em">{{ .Token }}</p>
<p>Il codice è monouso. Non aprire alcun link.</p>
```

L'app usa un codice monouso via email, inserito direttamente nella schermata di accesso. Questo evita che iOS apra Safari e mantiene l'utente nella PWA. Non serve mai inserire una password nell'app.

## 3. Inserisci le variabili d'ambiente

In **Project Settings → API** copia soltanto:

- Project URL
- Publishable key

In locale, crea `.env.local` copiando `.env.example` e inserisci i valori. Su Vercel vai in **Project → Settings → Environment Variables** e aggiungi le stesse due variabili per Production, Preview e Development, poi fai Redeploy.

Non usare né condividere mai la `service_role` key: ha accesso amministrativo e non deve finire nel browser.

## 4. Primo accesso e migrazione

Apri l'app, premi **Accedi**, inserisci il tuo indirizzo email e poi il codice ricevuto. Al primo accesso i dati attualmente presenti nel browser vengono copiati nel tuo spazio privato Supabase; in seguito l'app li sincronizza automaticamente.
