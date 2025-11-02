# Deploy Google API Functions Fix

## Wat is er gefixed?

De volgende Edge Functions gebruiken nu **veilig API keys uit de database** in plaats van environment variables:

✅ **google-places-autocomplete** - Already deployed
⏳ **google-routes** - Needs deployment
⏳ **travelbro-chat** - Needs deployment

## Optie 1: Via Supabase CLI (Aanbevolen)

Als je de Supabase CLI hebt geïnstalleerd:

```bash
chmod +x deploy-fixed-google-functions.sh
./deploy-fixed-google-functions.sh
```

Of handmatig:

```bash
supabase functions deploy google-routes
supabase functions deploy travelbro-chat
```

## Optie 2: Via Supabase Dashboard

Als je geen CLI hebt:

### 1. Google Routes deployen:

1. Ga naar [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecteer je project
3. Klik op **Edge Functions** in het linker menu
4. Zoek **`google-routes`** in de lijst
5. Klik op de function
6. Klik op **Edit** of **Deploy new version**
7. Upload het bestand: `supabase/functions/google-routes/index.ts`
8. Klik op **Deploy**

### 2. TravelBro Chat deployen:

1. Blijf in Edge Functions
2. Zoek **`travelbro-chat`** in de lijst
3. Klik op de function
4. Klik op **Edit** of **Deploy new version**
5. Upload het bestand: `supabase/functions/travelbro-chat/index.ts`
6. Klik op **Deploy**

## Wat gebeurt er nu?

Deze functies halen nu de Google API keys uit de `api_settings` tabel:
- **Google Maps API** key voor routes en places
- **Google Custom Search Engine ID** voor search queries

De keys zijn nooit zichtbaar in de frontend of environment variables!

## Na deployment

Je kunt de volgende environment variables **verwijderen** uit Vercel:
- `VITE_GOOGLE_SEARCH_API_KEY`
- `VITE_GOOGLE_SEARCH_ENGINE_ID`

Deze worden niet meer gebruikt! 🎉
