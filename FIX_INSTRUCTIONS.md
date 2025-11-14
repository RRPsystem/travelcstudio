# Fix Edge Functions voor JWT Query Parameter Support

## Het Probleem
De Builder (ai-websitestudio.nl) stuurt JWT tokens als query parameter `?token=xxx`, maar de Edge Functions verwachten deze in de Authorization header `Bearer xxx`.

## De Oplossing
Pas de `verifyBearerToken` functie aan in **3 Edge Functions** om tokens via query parameters te accepteren.

---

## Te Wijzigen Functies

### 1. **pages-api**
### 2. **layouts-api**
### 3. **menus-api**

---

## Hoe te Wijzigen (via Supabase Dashboard)

1. **Ga naar**: https://supabase.com/dashboard/project/huaaogdxxdcakxryecnw/functions
2. **Klik** op de functie (bijv. `pages-api`)
3. **Klik** op "Edit function"
4. **Zoek** naar de `verifyBearerToken` functie (rond regel 15)
5. **Vervang** deze code:

```typescript
async function verifyBearerToken(req: Request): Promise<JWTPayload> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.substring(7);
  const jwtSecret = Deno.env.get("JWT_SECRET");
```

**Door deze code:**

```typescript
async function verifyBearerToken(req: Request): Promise<JWTPayload> {
  const url = new URL(req.url);
  const authHeader = req.headers.get("Authorization");
  const tokenFromQuery = url.searchParams.get("token");

  let token: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (tokenFromQuery) {
    token = tokenFromQuery;
  }

  if (!token) {
    throw new Error("Missing authentication token");
  }

  const jwtSecret = Deno.env.get("JWT_SECRET");
```

6. **Klik** op "Deploy" of "Save"
7. **Herhaal** voor de andere 2 functies

---

## Test na Wijziging

1. Ga naar **https://www.ai-travelstudio.nl**
2. Log in als admin
3. Ga naar "Pagina Beheer" → "Nieuw Template"
4. Maak een template aan
5. Klik op "Opslaan" in de Builder
6. Check of je GEEN "Unauthorized" error meer krijgt!

---

## Verificatie

Check de logs in Supabase Dashboard → Edge Functions → [function name] → Logs

Je zou moeten zien:
- `[AUTH DEBUG] Token from query: Present`
- `[VERIFY] Token received: ...`
- `[VERIFY] Custom JWT verified successfully`

---

## Hulp Nodig?

Als de Supabase Dashboard Editor niet werkt, laat het me weten en ik schrijf een script om dit automatisch te doen!
