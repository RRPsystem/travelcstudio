# Featured Trips - Handleiding

## 🌟 Overzicht

Met de Featured Trips functionaliteit kun je bepaalde reizen prominenter tonen op je website. Featured trips verschijnen altijd bovenaan in de "Zoek & Boek" sectie.

---

## 📋 Hoe werkt het?

### 1️⃣ **In Bolt: Trip als Featured markeren**

1. Ga naar **Brand Dashboard** → **Content** → **Reizen**
2. In de tabel zie je een **ster icoon** kolom genaamd "Featured"
3. Klik op de ster om een reis als featured te markeren
   - **Grijs** = Niet featured
   - **Geel gevuld** = Featured
4. Featured trips krijgen automatisch prioriteit op de website

### 2️⃣ **Prioriteit instellen**

Naast de ster zie je een **prioriteit nummer** veld:

- **Lagere nummers = Hogere prioriteit**
- Default is `999` (laagste prioriteit)
- Bijvoorbeeld:
  - Priority `1` = Verschijnt als eerste
  - Priority `5` = Verschijnt als vijfde
  - Priority `999` = Verschijnt als laatste

**Voorbeeld volgorde:**
```
✨ Featured Trip 1 (priority: 1)
✨ Featured Trip 2 (priority: 3)
✨ Featured Trip 3 (priority: 10)
───────────────────────────────
   Normale Trip 1
   Normale Trip 2
   Normale Trip 3
```

### 3️⃣ **Op de Website**

De trips-api sorteert automatisch:
1. **Eerst**: Alle featured trips, gesorteerd op priority (laag naar hoog)
2. **Daarna**: Alle niet-featured trips

---

## 💻 API Response

### GET /functions/v1/trips-api?for_builder=true

**Response met Featured velden:**
```json
{
  "trips": [
    {
      "id": "uuid",
      "title": "Rondreis door Thailand",
      "is_featured": true,
      "priority": 1,
      "price": 2499,
      "duration_days": 14,
      "featured_image": "https://...",
      "source": "assignment"
    },
    {
      "id": "uuid",
      "title": "Stedentrip Parijs",
      "is_featured": true,
      "priority": 5,
      "price": 599,
      "duration_days": 4,
      "source": "assignment"
    },
    {
      "id": "uuid",
      "title": "Strandvakantie Griekenland",
      "is_featured": false,
      "priority": 999,
      "price": 1299,
      "duration_days": 10,
      "source": "brand"
    }
  ]
}
```

**Volgorde:**
De trips zijn al gesorteerd door de API:
- Featured trips komen eerst
- Binnen featured trips: gesorteerd op priority (1, 5, 10, etc.)
- Daarna: niet-featured trips

---

## 🎨 Website Implementatie

### Optie 1: Automatische Volgorde Gebruiken

De API stuurt trips al in de juiste volgorde. Gewoon direct tonen:

```jsx
function SearchAndBook() {
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/trips-api?for_builder=true`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();
    setTrips(data.trips); // Al gesorteerd!
  };

  return (
    <div className="trips-grid">
      {trips.map(trip => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </div>
  );
}
```

### Optie 2: Featured Trips Sectie

Splits featured en normale trips voor aparte secties:

```jsx
function SearchAndBook() {
  const [trips, setTrips] = useState([]);

  const featuredTrips = trips.filter(t => t.is_featured);
  const normalTrips = trips.filter(t => !t.is_featured);

  return (
    <div>
      {/* Featured Trips Section */}
      {featuredTrips.length > 0 && (
        <section className="featured-section mb-12">
          <h2 className="text-3xl font-bold mb-6">
            ⭐ Uitgelichte Reizen
          </h2>
          <div className="grid grid-cols-3 gap-6">
            {featuredTrips.map(trip => (
              <FeaturedTripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>
      )}

      {/* All Trips Section */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Alle Reizen</h2>
        <div className="grid grid-cols-3 gap-6">
          {normalTrips.map(trip => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      </section>
    </div>
  );
}
```

### Optie 3: Featured Badge

Voeg een badge toe aan featured trips:

```jsx
function TripCard({ trip }) {
  return (
    <div className="trip-card">
      {trip.is_featured && (
        <div className="absolute top-2 right-2 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
          <Star className="h-3 w-3" fill="currentColor" />
          Featured
        </div>
      )}

      <img src={trip.featured_image} alt={trip.title} />
      <div className="p-4">
        <h3>{trip.title}</h3>
        <p>{trip.description}</p>
        <div className="flex justify-between">
          <span>{trip.duration_days} dagen</span>
          <span>€{trip.price}</span>
        </div>
      </div>
    </div>
  );
}
```

---

## 🎨 Styling Voorbeelden

### Featured Trip Card (Groter formaat)

```css
.featured-trip-card {
  position: relative;
  border: 2px solid #fbbf24; /* Yellow border */
  border-radius: 0.5rem;
  overflow: hidden;
  transition: transform 0.2s;
}

.featured-trip-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(251, 191, 36, 0.2);
}

.featured-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

### Grid Layout met Featured Section

```css
/* Featured trips: grotere kaarten */
.featured-section .trip-card {
  grid-column: span 1;
}

/* Eerste featured trip: dubbele breedte */
.featured-section .trip-card:first-child {
  grid-column: span 2;
}

/* Responsive */
@media (max-width: 1024px) {
  .featured-section .trip-card:first-child {
    grid-column: span 1;
  }
}
```

---

## ⚙️ Database Schema

### trip_brand_assignments tabel

| Kolom | Type | Default | Beschrijving |
|-------|------|---------|-------------|
| `is_featured` | BOOLEAN | FALSE | Of trip featured is |
| `priority` | INTEGER | 999 | Volgorde prioriteit |

**Indexes:**
- `idx_trip_brand_assignments_featured` - Op `is_featured`
- `idx_trip_brand_assignments_priority` - Op `priority`
- `idx_trip_brand_assignments_featured_priority` - Composite index voor sortering

---

## 🚨 Beperkingen

1. **Alleen voor Assignment Trips**
   - Featured functionaliteit werkt alleen voor trips die zijn toegewezen via `trip_brand_assignments`
   - "Eigen reizen" (brand trips) kunnen niet als featured gemarkeerd worden
   - Reden: Featured is een assignment-specifieke eigenschap

2. **Priority Range**
   - Valid range: 1 - 999
   - 1 = Hoogste prioriteit
   - 999 = Laagste prioriteit (default)

3. **Automatische Sortering**
   - API sorteert altijd featured trips bovenaan
   - Je kunt de volgorde niet wijzigen zonder priority aan te passen

---

## 💡 Best Practices

### Hoeveel Featured Trips?

**Aanbevolen: 3-6 featured trips**
- Te veel: verliest impact
- Te weinig: website lijkt leeg
- Sweet spot: 3-5 trips voor optimale conversie

### Priority Nummering

**Gebruik sprongen van 10:**
```
Priority 10 - Top featured trip
Priority 20 - Second featured trip
Priority 30 - Third featured trip
```

**Voordeel:** Ruimte om later trips tussen te voegen
```
Priority 10 - Trip A
Priority 15 - [Nieuwe trip]
Priority 20 - Trip B
```

### Featured vs Publiceren

| Status | Zichtbaar? | Featured? |
|--------|-----------|-----------|
| ✅ Published, ✅ Featured | Ja | Bovenaan |
| ✅ Published, ❌ Featured | Ja | Normaal |
| ❌ Draft, ✅ Featured | Nee | - |

**Let op:** Een trip moet EERST gepubliceerd zijn voordat featured zichtbaar is!

---

## 🔍 Troubleshooting

### Featured trips verschijnen niet op website

**Checklist:**
1. Is de trip **gepubliceerd**? (Toggle in Bolt)
2. Is `is_featured = true` in database?
3. Gebruikt de website `?for_builder=true` parameter?
4. Cache refresh op de website?

**Check in database:**
```sql
SELECT id, trip_id, is_published, is_featured, priority
FROM trip_brand_assignments
WHERE brand_id = 'your-brand-id'
  AND is_featured = true
ORDER BY priority;
```

### Featured volgorde klopt niet

**Mogelijke oorzaken:**
1. Priority nummers zijn gelijk → API sorteert op andere velden
2. Client-side sortering overschrijft API sortering
3. Cache toont oude data

**Oplossing:**
- Gebruik unieke priority nummers per featured trip
- Laat de API volgorde intact (geen extra sort client-side)
- Clear cache

### Kan geen featured toggle zien

**Mogelijke oorzaken:**
1. Trip is een "Eigen Reis" (brand trip) - featured werkt hier niet
2. Kolommen zijn niet toegevoegd in database
3. RLS policies blokkeren update

**Oplossing:**
- Zorg dat trip een assignment is (niet brand)
- Run de migratie: `20251111000001_add_featured_trips_functionality.sql`
- Check permissions in Supabase

---

## 📊 Analytics Tips

Track featured trip performance:

```javascript
// Bij klik op featured trip
analytics.track('Featured Trip Clicked', {
  trip_id: trip.id,
  trip_title: trip.title,
  priority: trip.priority,
  position: index + 1 // Positie in lijst
});

// Conversie meten
analytics.track('Trip Booking Started', {
  trip_id: trip.id,
  is_featured: trip.is_featured,
  source: trip.source
});
```

**KPIs om te meten:**
- Click-through rate featured vs normal trips
- Conversion rate per featured trip
- Gemiddelde tijd tot booking per category

---

## 📝 Changelog

- **2025-11-11**: Initiële implementatie featured trips
  - Added `is_featured` column
  - Added `priority` column
  - Updated trips-api sorting
  - Added UI in TripApproval component

