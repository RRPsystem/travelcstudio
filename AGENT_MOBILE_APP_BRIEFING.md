# 🚀 Agent Mobile App - Complete Build Briefing

> **Voor: AI Agent in nieuwe Bolt omgeving**
> **Van: Hoofd Platform Team**
> **Datum: 2025-12-29**
> **Versie: 1.0 - Foundation Setup**

---

## 📋 Inhoudsopgave

1. [Executive Summary](#executive-summary)
2. [Architectuur Overzicht](#architectuur-overzicht)
3. [Database Integratie](#database-integratie)
4. [Authentication & Security](#authentication--security)
5. [Core Features Te Bouwen](#core-features-te-bouwen)
6. [API Integratie](#api-integratie)
7. [Real-time Sync](#real-time-sync)
8. [Voice Integration](#voice-integration)
9. [Testing & Deployment](#testing--deployment)
10. [Code Voorbeelden](#code-voorbeelden)

---

## 🎯 Executive Summary

### Wat Je Gaat Bouwen

Je bouwt een **React Native (Expo) mobile app** voor reisagenten. Deze app is NIET een standalone product, maar een **mobile interface** op het bestaande platform dat al draait in een andere Bolt omgeving.

### Belangrijkste Principe: **Shared Database, Different Interface**

```
┌──────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                      │
│                   (Single Source of Truth)                │
└────────────┬─────────────────────────┬───────────────────┘
             │                         │
             │                         │
   ┌─────────▼────────┐      ┌────────▼──────────┐
   │   WEB DASHBOARD  │      │   MOBILE APP      │
   │   (Bolt Env #1)  │◄────►│   (Bolt Env #2)   │
   │                  │      │                   │
   │  - Brand users   │      │  - Agent users    │
   │  - Admin/Operator│      │  - Voice input    │
   │  - Full CMS      │      │  - Mobile optimized│
   └──────────────────┘      └───────────────────┘
```

### Wat Al Bestaat (En Je NIET Moet Bouwen)

✅ **Complete Supabase database** met alle tables, RLS policies, en Edge Functions
✅ **Authentication systeem** (Supabase Auth met role-based access)
✅ **Edge Functions** voor AI content generatie, API calls, etc.
✅ **Web dashboard** voor brands, operators, en admins
✅ **Template systeem** voor reizen en bestemmingen
✅ **Trip catalog** met alle reizen
✅ **TravelBro** (WhatsApp AI assistant) systeem

### Wat Jij WEL Moet Bouwen

🔨 **Mobile app** met React Native + Expo
🔨 **Agent-focused UI** (niet de hele CMS, alleen wat agent nodig heeft)
🔨 **Voice-to-trip** functionaliteit (spraak → reis offer)
🔨 **Mobile optimized** trip browsing/creation
🔨 **Push notifications** voor brand approvals
🔨 **Offline-first** architecture waar mogelijk

---

## 🏗️ Architectuur Overzicht

### Het Bestaande Platform (Bolt Env #1)

**Tech Stack:**
- React + TypeScript + Vite
- Supabase (PostgreSQL + Auth + Edge Functions + Storage)
- Tailwind CSS
- Real-time subscriptions

**User Roles:**
```typescript
type UserRole = 'admin' | 'operator' | 'brand' | 'agent';

// Admin: Full system access
// Operator: Manages brands, agents, content
// Brand: Manages their own website, content, agents
// Agent: Creates offers, manages trips (← DIT IS JOUW FOCUS!)
```

**Database Connection:**
```typescript
// Deze credentials krijg je van de gebruiker
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Jouw Mobile App (Bolt Env #2)

**Tech Stack Te Gebruiken:**
```json
{
  "platform": "React Native + Expo",
  "language": "TypeScript",
  "database": "Supabase (SHARED met web platform)",
  "auth": "Supabase Auth (SHARED)",
  "styling": "NativeWind (Tailwind for React Native)",
  "voice": "Expo Speech API",
  "navigation": "Expo Router",
  "state": "React Context (consistency met web)"
}
```

**Project Structuur:**
```
agent-mobile-app/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Login/signup
│   ├── (tabs)/            # Main app tabs
│   │   ├── dashboard.tsx  # Home/overview
│   │   ├── trips.tsx      # Browse trips
│   │   ├── create.tsx     # Create offer (VOICE!)
│   │   ├── clients.tsx    # Client management
│   │   └── profile.tsx    # Agent profile
│   └── _layout.tsx        # Root layout
├── components/
│   ├── shared/            # Reusable components
│   ├── trip/              # Trip-related components
│   └── voice/             # Voice input components
├── lib/
│   ├── supabase.ts        # Supabase client (SAME config as web!)
│   ├── apiServices.ts     # API calls (copy from web)
│   └── auth.ts            # Auth helpers
├── types/
│   └── database.ts        # TypeScript types (COPY from web!)
└── contexts/
    ├── AuthContext.tsx    # Same as web
    └── AppContext.tsx     # Agent-specific state
```

---

## 💾 Database Integratie

### Kritieke Regel: **JE MAAKT GEEN DATABASE WIJZIGINGEN!**

De database is al volledig opgezet door het web platform. Jij **leest en schrijft alleen data** in bestaande tables.

### Belangrijkste Tables Voor Jou

#### 1. `agents` - Agent Profiles
```sql
-- Agent profile data
SELECT
  id,
  user_id,              -- Link naar auth.users
  brand_id,             -- Welke brand ze voor werken
  first_name,
  last_name,
  email,
  phone,
  specializations,      -- Array van specialismen
  bio,
  profile_image_url,
  is_active,
  -- Agent specifics
  languages_spoken,     -- Array: ['nl', 'en', 'de']
  experience_years,
  certifications,       -- Array
  rating_average,       -- Berekend
  total_reviews,
  -- Social/contact
  instagram_handle,
  linkedin_url,
  website_url
FROM agents
WHERE user_id = auth.uid();  -- RLS: agent ziet alleen zichzelf
```

#### 2. `trips` - Trip Catalog
```sql
-- Alle beschikbare reizen
SELECT
  t.id,
  t.title,
  t.description,
  t.destination,
  t.duration_days,
  t.price_from,
  t.price_currency,
  t.featured_image_url,
  t.gallery_urls,       -- Array van afbeeldingen
  t.highlights,         -- Array van highlights
  t.included_services,  -- Array
  t.excluded_services,  -- Array
  t.metadata,           -- JSONB met extra info
  -- Travel details
  t.departure_dates,    -- Array van vertrekdata
  t.min_participants,
  t.max_participants,
  t.difficulty_level,
  -- GPT Instructions (voor voice!)
  t.gpt_instructions    -- Hoe AI moet praten over deze reis
FROM trips t
INNER JOIN brand_trip_assignments bta ON t.id = bta.trip_id
WHERE bta.brand_id = (
  SELECT brand_id FROM agents WHERE user_id = auth.uid()
)
AND bta.is_published = true;  -- Alleen gepubliceerde reizen
```

#### 3. `brand_trip_assignments` - Offers Submit
```sql
-- Hier submit je agent offers
INSERT INTO brand_trip_assignments (
  brand_id,         -- Van agent's brand
  trip_id,          -- Welke reis
  is_published,     -- FALSE! Brand moet goedkeuren
  page_id,          -- NULL bij nieuwe offer
  metadata          -- Extra offer details
) VALUES (
  (SELECT brand_id FROM agents WHERE user_id = auth.uid()),
  $1,
  false,            -- ALTIJD false bij agent submit
  NULL,
  jsonb_build_object(
    'agent_id', (SELECT id FROM agents WHERE user_id = auth.uid()),
    'created_via', 'mobile_app',
    'voice_input', true,
    'original_text', $2,  -- Wat agent insprak
    'custom_description', $3
  )
);
```

#### 4. `travel_intakes` - Client Intakes (TravelBro)
```sql
-- Client intake formulieren (via WhatsApp of handmatig)
SELECT
  ti.id,
  ti.trip_id,
  ti.whatsapp_session_id,
  ti.intake_data,       -- JSONB met alle antwoorden
  ti.status,            -- 'pending', 'in_progress', 'completed'
  -- Client info
  ti.intake_data->>'client_name' as client_name,
  ti.intake_data->>'client_email' as client_email,
  ti.intake_data->>'travel_dates' as travel_dates,
  ti.intake_data->>'num_travelers' as num_travelers,
  ti.created_at
FROM travel_intakes ti
WHERE ti.brand_id = (
  SELECT brand_id FROM agents WHERE user_id = auth.uid()
);
```

#### 5. `trip_participants` - Client Contact Info
```sql
-- Contactgegevens van potentiële klanten
SELECT
  tp.id,
  tp.trip_id,
  tp.name,
  tp.email,
  tp.phone,
  tp.whatsapp_number,
  tp.notes,
  tp.status,            -- 'lead', 'contacted', 'booked', 'cancelled'
  tp.created_at
FROM trip_participants tp
WHERE tp.brand_id = (
  SELECT brand_id FROM agents WHERE user_id = auth.uid()
);
```

### RLS Policies (Belangrijk!)

De database heeft Row Level Security. Agent users hebben **beperkte access**:

```typescript
// ✅ Agent KAN:
- Eigen profile lezen/updaten (agents table)
- Trips lezen van hun brand (via brand_trip_assignments)
- Nieuwe offers submitten (INSERT in brand_trip_assignments)
- Intakes lezen van hun brand (travel_intakes)
- Participants lezen/maken van hun brand (trip_participants)
- Brand settings lezen (logo, kleuren voor in app)

// ❌ Agent KAN NIET:
- Andere agents zien
- Andere brands data zien
- Direct trips table wijzigen (moet via assignments)
- Brand settings wijzigen
- API keys zien
- Operator/admin data zien
```

---

## 🔐 Authentication & Security

### Login Flow

```typescript
// lib/auth.ts
export const signInAgent = async (email: string, password: string) => {
  // 1. Supabase Auth login
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) throw authError;

  // 2. Check if user is agent
  const { data: profile, error: profileError } = await supabase
    .from('agents')
    .select('*, brands(*)')
    .eq('user_id', authData.user.id)
    .single();

  if (profileError || !profile) {
    // Not an agent! Logout and show error
    await supabase.auth.signOut();
    throw new Error('Deze app is alleen voor agenten. Log in via het web dashboard.');
  }

  // 3. Store agent data in context
  return {
    user: authData.user,
    agent: profile,
    brand: profile.brands,
  };
};
```

### Auth Context (Zelfde Pattern als Web)

```typescript
// contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  agent: Agent | null;
  brand: Brand | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadAgentProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          await loadAgentProfile(session.user.id);
        } else {
          setUser(null);
          setAgent(null);
          setBrand(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadAgentProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('agents')
      .select('*, brands(*)')
      .eq('user_id', userId)
      .single();

    if (data) {
      setUser(data.user);
      setAgent(data);
      setBrand(data.brands);
    }
    setLoading(false);
  };

  // ... rest of auth methods
};
```

### Security Checklist

- [ ] **Alle API calls gaan via Supabase client** (gebruikt automatisch auth token)
- [ ] **Geen API keys in de app** (keys blijven op server in Edge Functions)
- [ ] **RLS policies enforced** (database blokkeert unauthorized access)
- [ ] **Auth state checked op elke screen** (redirect naar login als niet ingelogd)
- [ ] **Logout functie duidelijk bereikbaar** (+ clear local state)

---

## 🎨 Core Features Te Bouwen

### Feature 1: Dashboard (Home Screen)

**Wat te tonen:**

```typescript
// app/(tabs)/dashboard.tsx
const AgentDashboard = () => {
  return (
    <ScrollView>
      {/* Header met agent info */}
      <AgentHeader agent={agent} brand={brand} />

      {/* Quick stats */}
      <StatsRow>
        <StatCard title="Active Offers" value={activeOffers.length} />
        <StatCard title="Pending Approvals" value={pendingApprovals} />
        <StatCard title="Total Clients" value={totalClients} />
      </StatsRow>

      {/* Recent activity */}
      <Section title="Recent Activity">
        <ActivityFeed items={recentActivity} />
      </Section>

      {/* Pending approvals (belangrijkste!) */}
      <Section title="Wachten op Goedkeuring">
        <PendingOffersList offers={pendingOffers} />
      </Section>

      {/* Quick actions */}
      <QuickActions>
        <ActionButton icon="mic" label="Create Offer" onPress={goToVoiceCreate} />
        <ActionButton icon="search" label="Browse Trips" onPress={goToBrowse} />
        <ActionButton icon="users" label="My Clients" onPress={goToClients} />
      </QuickActions>
    </ScrollView>
  );
};
```

**Data te fetchen:**
```typescript
// Dashboard data queries
const loadDashboardData = async () => {
  const agentId = agent.id;
  const brandId = agent.brand_id;

  // 1. Pending offers (wacht op brand goedkeuring)
  const { data: pendingOffers } = await supabase
    .from('brand_trip_assignments')
    .select('*, trips(*)')
    .eq('brand_id', brandId)
    .eq('is_published', false)
    .eq('metadata->>agent_id', agentId)
    .order('created_at', { ascending: false });

  // 2. Active offers (gepubliceerd)
  const { data: activeOffers } = await supabase
    .from('brand_trip_assignments')
    .select('*, trips(*)')
    .eq('brand_id', brandId)
    .eq('is_published', true)
    .eq('metadata->>agent_id', agentId);

  // 3. Total clients
  const { count: clientCount } = await supabase
    .from('trip_participants')
    .select('*', { count: 'exact', head: true })
    .eq('brand_id', brandId);

  // 4. Recent intakes
  const { data: recentIntakes } = await supabase
    .from('travel_intakes')
    .select('*, trips(*)')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    pendingOffers,
    activeOffers,
    clientCount,
    recentIntakes,
  };
};
```

---

### Feature 2: Browse Trips (Catalog)

**UI Components:**

```typescript
// app/(tabs)/trips.tsx
const TripCatalog = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  return (
    <View>
      {/* Search bar */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Zoek reizen..."
      />

      {/* Filters */}
      <FilterBar>
        <FilterChip label="Alle" active={filter === 'all'} onPress={() => setFilter('all')} />
        <FilterChip label="Featured" active={filter === 'featured'} onPress={() => setFilter('featured')} />
        <FilterChip label="Nieuw" active={filter === 'new'} onPress={() => setFilter('new')} />
      </FilterBar>

      {/* Trip grid/list */}
      <FlatList
        data={filteredTrips}
        renderItem={({ item }) => <TripCard trip={item} />}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

const TripCard = ({ trip }: { trip: Trip }) => {
  return (
    <TouchableOpacity onPress={() => router.push(`/trip/${trip.id}`)}>
      <Image source={{ uri: trip.featured_image_url }} />
      <Text>{trip.title}</Text>
      <Text>{trip.destination}</Text>
      <Text>vanaf €{trip.price_from}</Text>
      <Text>{trip.duration_days} dagen</Text>
    </TouchableOpacity>
  );
};
```

**Trip Detail Screen:**

```typescript
// app/trip/[id].tsx
const TripDetail = () => {
  const { id } = useLocalSearchParams();
  const [trip, setTrip] = useState<Trip | null>(null);

  return (
    <ScrollView>
      {/* Hero image gallery */}
      <ImageGallery images={trip.gallery_urls} />

      {/* Title & basics */}
      <TripHeader trip={trip} />

      {/* Description */}
      <Section title="Over deze reis">
        <Text>{trip.description}</Text>
      </Section>

      {/* Highlights */}
      <Section title="Hoogtepunten">
        {trip.highlights.map(h => (
          <HighlightItem key={h} text={h} />
        ))}
      </Section>

      {/* Included/Excluded */}
      <IncludedExcluded
        included={trip.included_services}
        excluded={trip.excluded_services}
      />

      {/* CTA: Create offer for client */}
      <ActionButtons>
        <Button onPress={createOfferForClient}>
          Offer Maken voor Klant
        </Button>
        <Button variant="secondary" onPress={shareTrip}>
          Delen
        </Button>
      </ActionButtons>
    </ScrollView>
  );
};
```

---

### Feature 3: Voice-to-Offer (HOOFDFEATURE! 🎤)

**Dit is de killer feature van je app!**

Agent moet kunnen:
1. Microfoon knop indrukken
2. Praten over een reis (freestyle of gestructureerd)
3. App transcribeert automatisch
4. App stuurt naar OpenAI om te structureren
5. Preview tonen
6. Submit naar brand voor goedkeuring

**Voice Input Screen:**

```typescript
// app/(tabs)/create.tsx
const VoiceOfferCreator = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [generatedOffer, setGeneratedOffer] = useState<any>(null);

  const startRecording = async () => {
    // 1. Check permissions
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      Alert.alert('Geen toegang', 'We hebben toegang tot je microfoon nodig');
      return;
    }

    // 2. Start recording
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
    await recording.startAsync();

    setIsRecording(true);
    setRecordingObject(recording);
  };

  const stopRecording = async () => {
    setIsRecording(false);
    await recordingObject.stopAndUnloadAsync();

    const uri = recordingObject.getURI();

    // 3. Transcribe via Edge Function
    setProcessing(true);
    const { data: transcriptData } = await supabase.functions.invoke('transcribe-audio', {
      body: { audioUri: uri }
    });

    setTranscript(transcriptData.text);

    // 4. Generate structured offer via AI
    const { data: offerData } = await supabase.functions.invoke('generate-offer-from-voice', {
      body: {
        transcript: transcriptData.text,
        agentId: agent.id,
        brandId: agent.brand_id
      }
    });

    setGeneratedOffer(offerData);
    setProcessing(false);
  };

  return (
    <View>
      {/* Recording UI */}
      {!generatedOffer && (
        <RecordingInterface
          isRecording={isRecording}
          onStart={startRecording}
          onStop={stopRecording}
          transcript={transcript}
          processing={processing}
        />
      )}

      {/* Generated offer preview */}
      {generatedOffer && (
        <OfferPreview
          offer={generatedOffer}
          onEdit={editOffer}
          onSubmit={submitToApproval}
        />
      )}
    </View>
  );
};
```

**Recording Interface Component:**

```typescript
const RecordingInterface = ({ isRecording, onStart, onStop, transcript, processing }) => {
  return (
    <View style={styles.container}>
      {/* Instructions */}
      {!isRecording && !transcript && (
        <View style={styles.instructions}>
          <Text style={styles.title}>Vertel over de reis</Text>
          <Text style={styles.subtitle}>
            Je kunt vrijuit praten. Vertel bijvoorbeeld:
            {'\n\n'}
            • Voor wie de reis is (type reiziger)
            {'\n'}• Wat de highlights zijn
            {'\n'}• Waarom deze reis speciaal is
            {'\n'}• Praktische details (data, prijs, etc.)
          </Text>
        </View>
      )}

      {/* Recording button */}
      <TouchableOpacity
        style={[styles.micButton, isRecording && styles.micButtonActive]}
        onPress={isRecording ? onStop : onStart}
      >
        <Icon name="mic" size={48} color="white" />
      </TouchableOpacity>

      {/* Status */}
      {isRecording && (
        <View style={styles.recordingStatus}>
          <Text style={styles.recordingText}>● Opname bezig...</Text>
          <Text style={styles.hint}>Tik om te stoppen</Text>
        </View>
      )}

      {/* Live transcript */}
      {transcript && !processing && (
        <View style={styles.transcript}>
          <Text style={styles.transcriptLabel}>Dit heb je gezegd:</Text>
          <Text style={styles.transcriptText}>{transcript}</Text>
        </View>
      )}

      {/* Processing */}
      {processing && (
        <View style={styles.processing}>
          <ActivityIndicator size="large" />
          <Text>AI maakt er een mooie offer van...</Text>
        </View>
      )}
    </View>
  );
};
```

**Offer Preview Component:**

```typescript
const OfferPreview = ({ offer, onEdit, onSubmit }) => {
  const [title, setTitle] = useState(offer.title);
  const [description, setDescription] = useState(offer.description);
  const [highlights, setHighlights] = useState(offer.highlights);

  return (
    <ScrollView style={styles.preview}>
      <Text style={styles.previewTitle}>Preview van je Offer</Text>

      {/* Editable fields */}
      <View style={styles.field}>
        <Text style={styles.label}>Titel</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Beschrijving</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={6}
          style={[styles.input, styles.textarea]}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Hoogtepunten</Text>
        {highlights.map((highlight, index) => (
          <TextInput
            key={index}
            value={highlight}
            onChangeText={(text) => {
              const newHighlights = [...highlights];
              newHighlights[index] = text;
              setHighlights(newHighlights);
            }}
            style={styles.input}
          />
        ))}
      </View>

      {/* Price & dates */}
      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>Prijs vanaf</Text>
          <TextInput
            value={offer.price_from}
            keyboardType="numeric"
            style={styles.input}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Duur (dagen)</Text>
          <TextInput
            value={offer.duration_days}
            keyboardType="numeric"
            style={styles.input}
          />
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          variant="secondary"
          onPress={() => onEdit({ title, description, highlights })}
        >
          Opnieuw Opnemen
        </Button>
        <Button
          onPress={() => onSubmit({ ...offer, title, description, highlights })}
        >
          Versturen naar Brand 🚀
        </Button>
      </View>
    </ScrollView>
  );
};
```

**Submit Logic:**

```typescript
const submitOfferToApproval = async (offerData: any) => {
  try {
    // 1. Create or update trip
    let tripId = offerData.existingTripId; // Als based on bestaande reis

    if (!tripId) {
      // Nieuwe custom trip
      const { data: newTrip, error: tripError } = await supabase
        .from('trips')
        .insert({
          title: offerData.title,
          description: offerData.description,
          destination: offerData.destination,
          duration_days: offerData.duration_days,
          price_from: offerData.price_from,
          price_currency: 'EUR',
          highlights: offerData.highlights,
          metadata: {
            created_by_agent: agent.id,
            voice_generated: true,
            original_transcript: offerData.originalTranscript,
          }
        })
        .select()
        .single();

      if (tripError) throw tripError;
      tripId = newTrip.id;
    }

    // 2. Create brand assignment (voor goedkeuring)
    const { data: assignment, error: assignError } = await supabase
      .from('brand_trip_assignments')
      .insert({
        brand_id: agent.brand_id,
        trip_id: tripId,
        is_published: false,  // ← BELANGRIJK! Brand moet goedkeuren
        metadata: {
          agent_id: agent.id,
          agent_name: `${agent.first_name} ${agent.last_name}`,
          created_via: 'mobile_voice',
          original_transcript: offerData.originalTranscript,
          submitted_at: new Date().toISOString(),
          custom_description: offerData.description,
        }
      })
      .select()
      .single();

    if (assignError) throw assignError;

    // 3. Success!
    Alert.alert(
      'Offer Verstuurd! 🎉',
      'Je offer is naar je brand gestuurd voor goedkeuring. Je krijgt een notificatie zodra deze is goedgekeurd.',
      [
        { text: 'OK', onPress: () => router.push('/(tabs)/dashboard') }
      ]
    );

  } catch (error) {
    Alert.alert('Fout', 'Er ging iets mis bij het versturen. Probeer opnieuw.');
    console.error(error);
  }
};
```

---

### Feature 4: Client Management

**Client List Screen:**

```typescript
// app/(tabs)/clients.tsx
const ClientManagement = () => {
  const [clients, setClients] = useState<TripParticipant[]>([]);
  const [filter, setFilter] = useState<'all' | 'lead' | 'contacted' | 'booked'>('all');

  useEffect(() => {
    loadClients();

    // Real-time updates van nieuwe intakes
    const subscription = supabase
      .channel('client_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trip_participants',
        filter: `brand_id=eq.${agent.brand_id}`
      }, (payload) => {
        handleClientUpdate(payload);
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('trip_participants')
      .select('*, trips(*)')
      .eq('brand_id', agent.brand_id)
      .order('created_at', { ascending: false });

    if (data) setClients(data);
  };

  return (
    <View>
      {/* Filter tabs */}
      <FilterTabs>
        <Tab active={filter === 'all'} onPress={() => setFilter('all')}>
          Alle ({clients.length})
        </Tab>
        <Tab active={filter === 'lead'} onPress={() => setFilter('lead')}>
          Leads ({clients.filter(c => c.status === 'lead').length})
        </Tab>
        <Tab active={filter === 'contacted'} onPress={() => setFilter('contacted')}>
          Contacted ({clients.filter(c => c.status === 'contacted').length})
        </Tab>
        <Tab active={filter === 'booked'} onPress={() => setFilter('booked')}>
          Geboekt ({clients.filter(c => c.status === 'booked').length})
        </Tab>
      </FilterTabs>

      {/* Client list */}
      <FlatList
        data={filteredClients}
        renderItem={({ item }) => <ClientCard client={item} />}
        keyExtractor={(item) => item.id}
      />

      {/* Add client button */}
      <FAB icon="plus" onPress={() => router.push('/client/add')} />
    </View>
  );
};

const ClientCard = ({ client }: { client: TripParticipant }) => {
  return (
    <TouchableOpacity onPress={() => router.push(`/client/${client.id}`)}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.name}>{client.name}</Text>
          <StatusBadge status={client.status} />
        </View>

        {client.trips && (
          <Text style={styles.trip}>
            Geïnteresseerd in: {client.trips.title}
          </Text>
        )}

        <View style={styles.contact}>
          <Icon name="mail" />
          <Text>{client.email}</Text>
        </View>

        {client.whatsapp_number && (
          <View style={styles.contact}>
            <Icon name="message-circle" />
            <Text>{client.whatsapp_number}</Text>
          </View>
        )}

        <Text style={styles.date}>
          {formatDistanceToNow(new Date(client.created_at))} geleden
        </Text>

        {/* Quick actions */}
        <View style={styles.actions}>
          <IconButton icon="phone" onPress={() => callClient(client)} />
          <IconButton icon="mail" onPress={() => emailClient(client)} />
          <IconButton icon="message-circle" onPress={() => whatsappClient(client)} />
        </View>
      </View>
    </TouchableOpacity>
  );
};
```

**Client Detail Screen:**

```typescript
// app/client/[id].tsx
const ClientDetail = () => {
  const { id } = useLocalSearchParams();
  const [client, setClient] = useState<TripParticipant | null>(null);
  const [notes, setNotes] = useState('');

  return (
    <ScrollView>
      {/* Client info */}
      <Section>
        <Avatar name={client.name} />
        <Text style={styles.name}>{client.name}</Text>
        <StatusPicker
          value={client.status}
          onChange={(status) => updateClientStatus(client.id, status)}
        />
      </Section>

      {/* Contact details */}
      <Section title="Contact">
        <ContactRow icon="mail" value={client.email} onPress={emailClient} />
        <ContactRow icon="phone" value={client.phone} onPress={callClient} />
        {client.whatsapp_number && (
          <ContactRow icon="message-circle" value={client.whatsapp_number} onPress={whatsappClient} />
        )}
      </Section>

      {/* Trip interesse */}
      {client.trips && (
        <Section title="Geïnteresseerd in">
          <TripCard trip={client.trips} compact />
        </Section>
      )}

      {/* Notes */}
      <Section title="Notities">
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Voeg notities toe..."
          multiline
          style={styles.notesInput}
        />
        <Button onPress={() => saveNotes(client.id, notes)}>
          Opslaan
        </Button>
      </Section>

      {/* Activity log */}
      <Section title="Activiteiten">
        <ActivityTimeline clientId={client.id} />
      </Section>
    </ScrollView>
  );
};
```

---

### Feature 5: Profile & Settings

```typescript
// app/(tabs)/profile.tsx
const AgentProfile = () => {
  const { agent, brand } = useAuth();

  return (
    <ScrollView>
      {/* Profile header */}
      <ProfileHeader>
        <Avatar uri={agent.profile_image_url} size={100} />
        <Text style={styles.name}>
          {agent.first_name} {agent.last_name}
        </Text>
        <Text style={styles.brand}>
          {brand.name}
        </Text>
        <Button variant="outline" onPress={() => router.push('/profile/edit')}>
          Bewerk Profiel
        </Button>
      </ProfileHeader>

      {/* Stats */}
      <StatsGrid>
        <StatCard label="Rating" value={agent.rating_average} icon="star" />
        <StatCard label="Reviews" value={agent.total_reviews} icon="message" />
        <StatCard label="Ervaring" value={`${agent.experience_years} jaar`} icon="calendar" />
      </StatsGrid>

      {/* Specializations */}
      <Section title="Specialisaties">
        <ChipGroup>
          {agent.specializations?.map(spec => (
            <Chip key={spec}>{spec}</Chip>
          ))}
        </ChipGroup>
      </Section>

      {/* Languages */}
      <Section title="Talen">
        <ChipGroup>
          {agent.languages_spoken?.map(lang => (
            <Chip key={lang}>{lang}</Chip>
          ))}
        </ChipGroup>
      </Section>

      {/* Bio */}
      <Section title="Over mij">
        <Text>{agent.bio}</Text>
      </Section>

      {/* Settings */}
      <Section title="Instellingen">
        <SettingRow
          label="Notificaties"
          icon="bell"
          onPress={() => router.push('/settings/notifications')}
        />
        <SettingRow
          label="Account"
          icon="user"
          onPress={() => router.push('/settings/account')}
        />
        <SettingRow
          label="Privacy"
          icon="lock"
          onPress={() => router.push('/settings/privacy')}
        />
      </Section>

      {/* Logout */}
      <Button variant="destructive" onPress={handleLogout}>
        Uitloggen
      </Button>
    </ScrollView>
  );
};
```

---

## 🔌 API Integratie

### Bestaande Edge Functions Die Je Kunt Gebruiken

Je hoeft **geen nieuwe Edge Functions te maken**. Deze bestaan al:

#### 1. `generate-content` - AI Content Generatie
```typescript
// Gebruik deze voor voice-to-offer
const { data, error } = await supabase.functions.invoke('generate-content', {
  body: {
    prompt: `Maak een reis offer op basis van deze voice input: "${transcript}"`,
    context: {
      brandId: agent.brand_id,
      agentId: agent.id,
      brandVoice: brand.voice_settings, // Tone of voice van brand
    }
  }
});
```

#### 2. `google-places-autocomplete` - Locatie Zoeken
```typescript
// Voor destination search
const { data } = await supabase.functions.invoke('google-places-autocomplete', {
  body: { input: 'Bali, Indonesia' }
});
```

#### 3. `helpbot-chat` - AI Assistant
```typescript
// Als je chatbot in app wilt
const { data } = await supabase.functions.invoke('helpbot-chat', {
  body: {
    message: userMessage,
    conversationId: conversationId,
    userId: agent.user_id
  }
});
```

#### 4. `send-whatsapp` - WhatsApp Berichten
```typescript
// Om klanten te contacteren via WhatsApp
const { data } = await supabase.functions.invoke('send-whatsapp', {
  body: {
    to: client.whatsapp_number,
    template: 'travelbro_greeting',
    variables: [client.name, trip.title]
  }
});
```

### Nieuwe Edge Function: `transcribe-audio`

**Deze moet je WEL laten maken in de andere Bolt (web platform):**

```typescript
// supabase/functions/transcribe-audio/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const { audioUri } = await req.json();

    // 1. Download audio from URI (if needed)
    // 2. Send to OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData, // audio file
    });

    const { text } = await response.json();

    return new Response(JSON.stringify({ text }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

### Nieuwe Edge Function: `generate-offer-from-voice`

```typescript
// supabase/functions/generate-offer-from-voice/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import OpenAI from 'https://deno.land/x/openai@v4.20.1/mod.ts';

serve(async (req) => {
  try {
    const { transcript, agentId, brandId } = await req.json();

    // 1. Get brand voice settings
    const supabase = createClient(/*...*/);
    const { data: brand } = await supabase
      .from('brands')
      .select('name, voice_settings')
      .eq('id', brandId)
      .single();

    // 2. Get agent info
    const { data: agent } = await supabase
      .from('agents')
      .select('first_name, last_name, specializations')
      .eq('id', agentId)
      .single();

    // 3. Generate structured offer with OpenAI
    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Je bent een AI assistent voor ${brand.name}.
          Je helpt reisagent ${agent.first_name} om voice input om te zetten naar een gestructureerde reis offer.

          Brand tone of voice: ${JSON.stringify(brand.voice_settings)}
          Agent specialisaties: ${agent.specializations.join(', ')}

          Maak een offer die:
          - Professioneel en aantrekkelijk is
          - De brand voice volgt
          - Duidelijke highlights heeft
          - Praktische details bevat

          Return JSON format:
          {
            "title": "...",
            "description": "...",
            "destination": "...",
            "duration_days": 7,
            "price_from": 1299,
            "highlights": ["...", "..."],
            "best_for": "...",
            "season": "..."
          }`
        },
        {
          role: 'user',
          content: `Agent heeft dit ingesproken: "${transcript}"\n\nMaak hier een gestructureerde offer van.`
        }
      ],
      response_format: { type: 'json_object' }
    });

    const offer = JSON.parse(completion.choices[0].message.content);

    return new Response(JSON.stringify({
      ...offer,
      originalTranscript: transcript
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

---

## 📱 Real-time Sync

### Implementeer Real-time Updates Voor:

#### 1. Offer Approvals (Meest Belangrijk!)

```typescript
// components/NotificationListener.tsx
export const NotificationListener = () => {
  const { agent } = useAuth();

  useEffect(() => {
    // Listen for brand approvals
    const subscription = supabase
      .channel('offer_updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'brand_trip_assignments',
        filter: `metadata->>agent_id=eq.${agent.id}`
      }, (payload) => {
        const oldValue = payload.old.is_published;
        const newValue = payload.new.is_published;

        // Offer werd goedgekeurd!
        if (!oldValue && newValue) {
          showPushNotification({
            title: 'Offer Goedgekeurd! 🎉',
            body: 'Je brand heeft je offer goedgekeurd en gepubliceerd.',
            data: { assignmentId: payload.new.id }
          });

          // Update lokale state
          refreshDashboard();
        }
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [agent]);

  return null; // Background component
};
```

#### 2. New Intakes (Klanten)

```typescript
// Listen for new travel intakes
useEffect(() => {
  const subscription = supabase
    .channel('new_intakes')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'travel_intakes',
      filter: `brand_id=eq.${agent.brand_id}`
    }, (payload) => {
      showPushNotification({
        title: 'Nieuwe Klant Lead! 🎯',
        body: `${payload.new.intake_data.client_name} is geïnteresseerd in een reis.`,
      });

      // Add to clients list
      addClientToList(payload.new);
    })
    .subscribe();

  return () => subscription.unsubscribe();
}, []);
```

#### 3. Brand Updates (Settings)

```typescript
// Listen for brand changes (logo, colors, etc.)
useEffect(() => {
  const subscription = supabase
    .channel('brand_updates')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'brands',
      filter: `id=eq.${agent.brand_id}`
    }, (payload) => {
      // Update cached brand data
      updateBrandInContext(payload.new);

      // Show subtle notification
      showToast('Brand instellingen zijn bijgewerkt');
    })
    .subscribe();

  return () => subscription.unsubscribe();
}, []);
```

### Push Notifications Setup

```typescript
// lib/notifications.ts
import * as Notifications from 'expo-notifications';

export const setupPushNotifications = async () => {
  // 1. Request permissions
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Geen notificaties', 'Je krijgt geen updates over goedkeuringen.');
    return;
  }

  // 2. Get push token
  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // 3. Save to profile
  await supabase
    .from('agents')
    .update({ push_token: token })
    .eq('user_id', agent.user_id);

  // 4. Configure notification handler
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
};

export const showPushNotification = async ({
  title,
  body,
  data = {}
}: {
  title: string;
  body: string;
  data?: any;
}) => {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: null, // Show immediately
  });
};
```

---

## 🎤 Voice Integration Details

### Audio Recording Setup

```typescript
// lib/audio.ts
import { Audio } from 'expo-av';

export const RECORDING_OPTIONS = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
    audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

export class AudioRecorder {
  private recording: Audio.Recording | null = null;

  async start() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
      this.recording = recording;

      return recording;
    } catch (err) {
      console.error('Failed to start recording', err);
      throw err;
    }
  }

  async stop() {
    if (!this.recording) return null;

    await this.recording.stopAndUnloadAsync();
    const uri = this.recording.getURI();
    this.recording = null;

    return uri;
  }

  async upload(uri: string) {
    // Upload to Supabase Storage
    const fileName = `voice-${Date.now()}.m4a`;
    const file = await fetch(uri);
    const blob = await file.blob();

    const { data, error } = await supabase.storage
      .from('voice-recordings')
      .upload(`${agent.id}/${fileName}`, blob);

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('voice-recordings')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }
}
```

### Voice Input UX Best Practices

```typescript
// components/voice/VoiceRecordButton.tsx
export const VoiceRecordButton = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const animatedScale = useSharedValue(1);
  const recorder = useRef(new AudioRecorder());

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRecording) {
      // Pulse animation
      animatedScale.value = withRepeat(
        withTiming(1.2, { duration: 1000 }),
        -1,
        true
      );

      // Duration counter
      interval = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } else {
      animatedScale.value = 1;
      setDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const handlePress = async () => {
    if (isRecording) {
      // Stop recording
      const uri = await recorder.current.stop();
      setIsRecording(false);
      onRecordingComplete(uri);
    } else {
      // Start recording
      await recorder.current.start();
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  return (
    <View style={styles.container}>
      {/* Duration counter */}
      {isRecording && (
        <Text style={styles.duration}>
          {formatDuration(duration)}
        </Text>
      )}

      {/* Animated record button */}
      <Animated.View style={[styles.button, animatedStyles]}>
        <TouchableOpacity
          style={[
            styles.touchable,
            isRecording && styles.recording
          ]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Icon
            name={isRecording ? 'stop' : 'mic'}
            size={32}
            color="white"
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Visual feedback */}
      {isRecording && <WaveformVisualizer />}

      {/* Hint text */}
      <Text style={styles.hint}>
        {isRecording
          ? 'Tik om te stoppen'
          : 'Tik om te beginnen met opnemen'
        }
      </Text>
    </View>
  );
};
```

### Voice Prompts/Templates

```typescript
// lib/voiceTemplates.ts
export const VOICE_PROMPTS = {
  freeform: {
    title: 'Vrij Vertellen',
    description: 'Vertel vrijuit over de reis',
    prompt: 'Begin met opnemen en vertel wat je wilt over deze reis...',
  },

  guided: {
    title: 'Stap voor Stap',
    description: 'Volg de vragen één voor één',
    steps: [
      {
        question: 'Voor wie is deze reis geschikt?',
        hint: 'Bijvoorbeeld: avonturiers, gezinnen, stelletjes...',
      },
      {
        question: 'Wat zijn de highlights van deze reis?',
        hint: 'Vertel wat deze reis speciaal maakt...',
      },
      {
        question: 'Wat is de beste reistijd?',
        hint: 'Welke maanden/seizoenen raad je aan?',
      },
      {
        question: 'Wat is inbegrepen in de prijs?',
        hint: 'Bijvoorbeeld: vluchten, hotels, excursies...',
      },
      {
        question: 'Zijn er bijzondere voorwaarden?',
        hint: 'Visa, vaccinaties, minimale fitness, etc.',
      },
    ],
  },

  quick: {
    title: 'Snelle Pitch',
    description: '30 seconden elevator pitch',
    prompt: 'Geef een korte, krachtige samenvatting van deze reis in max 30 seconden...',
    maxDuration: 30,
  },
};
```

---

## 🧪 Testing & Deployment

### Testing Checklist

**Voor je submits:**

- [ ] **Auth flow werkt** (login, logout, session persistence)
- [ ] **RLS policies respecteren** (agent ziet alleen eigen brand data)
- [ ] **Real-time updates werken** (approvals, nieuwe klanten)
- [ ] **Voice recording werkt** (zowel iOS als Android)
- [ ] **Offline handling** (graceful degradation bij geen internet)
- [ ] **Error handling** (alle API calls hebben try/catch)
- [ ] **Loading states** (geen witte schermen tijdens data laden)
- [ ] **Push notifications** (krijgt notificatie bij approval)

### Environment Variables

```bash
# .env (in je nieuwe Bolt project)
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_API_URL=https://xxx.supabase.co/functions/v1
```

### Build Commands

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "build:android": "eas build --platform android",
    "build:ios": "eas build --platform ios",
    "submit:android": "eas submit --platform android",
    "submit:ios": "eas submit --platform ios"
  }
}
```

---

## 📝 Code Voorbeelden - Complete Files

### 1. Supabase Client Setup

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### 2. Auth Context

```typescript
// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Agent, Brand } from '../types/database';

interface AuthContextType {
  user: User | null;
  agent: Agent | null;
  brand: Brand | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadAgentProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await loadAgentProfile(session.user.id);
        } else {
          setUser(null);
          setAgent(null);
          setBrand(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadAgentProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*, brands(*)')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setUser({ id: userId } as User);
        setAgent(data);
        setBrand(data.brands);
      }
    } catch (error) {
      console.error('Error loading agent profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Check if user is agent
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', data.user.id)
      .single();

    if (agentError || !agentData) {
      await supabase.auth.signOut();
      throw new Error('Deze app is alleen voor agenten.');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAgent(null);
    setBrand(null);
  };

  return (
    <AuthContext.Provider value={{ user, agent, brand, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### 3. Type Definitions (Copy from Web)

```typescript
// types/database.ts
// KOPIEER EXACT DEZE FILE VAN HET WEB PROJECT!
// Hij staat in: src/types/database.ts

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string;
          user_id: string;
          brand_id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          profile_image_url: string | null;
          bio: string | null;
          specializations: string[] | null;
          languages_spoken: string[] | null;
          experience_years: number | null;
          certifications: string[] | null;
          rating_average: number | null;
          total_reviews: number | null;
          instagram_handle: string | null;
          linkedin_url: string | null;
          website_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: { /* ... */ };
        Update: { /* ... */ };
      };
      // ... rest van types
    };
  };
}

// Helper types
export type Agent = Database['public']['Tables']['agents']['Row'];
export type Trip = Database['public']['Tables']['trips']['Row'];
export type Brand = Database['public']['Tables']['brands']['Row'];
// etc...
```

---

## 🎯 Samenvatting: Wat Je PRECIES Moet Doen

### Stap 1: Project Setup (Dag 1)

```bash
# In nieuwe Bolt omgeving
npx create-expo-app agent-mobile-app --template blank-typescript
cd agent-mobile-app

# Install dependencies
npm install @supabase/supabase-js
npm install @react-native-async-storage/async-storage
npm install nativewind
npm install expo-av expo-haptics
npm install expo-notifications
npm install lucide-react-native

# Setup Expo Router
npx expo install expo-router react-native-safe-area-context react-native-screens
```

### Stap 2: Kopieer Types & Config (Dag 1)

- [ ] Kopieer `src/types/database.ts` van web project
- [ ] Kopieer `.env.example` en vul in met Supabase credentials
- [ ] Setup `lib/supabase.ts` met juiste config

### Stap 3: Auth Implementation (Dag 1-2)

- [ ] Maak `contexts/AuthContext.tsx`
- [ ] Maak login screen `app/(auth)/login.tsx`
- [ ] Maak protected route wrapper

### Stap 4: Core Screens (Dag 2-3)

- [ ] Dashboard screen met stats
- [ ] Trips browse/detail screens
- [ ] Client management screens
- [ ] Profile screen

### Stap 5: Voice Feature (Dag 3-4)

- [ ] Voice recording component
- [ ] Audio upload to Supabase
- [ ] Integration met `transcribe-audio` function (ASK web team to create!)
- [ ] Integration met `generate-offer-from-voice` function (ASK web team!)
- [ ] Offer preview & edit screen

### Stap 6: Real-time & Notifications (Dag 4)

- [ ] Setup Supabase real-time subscriptions
- [ ] Push notifications setup
- [ ] Background listeners

### Stap 7: Polish & Testing (Dag 5)

- [ ] Error handling overal
- [ ] Loading states
- [ ] Offline handling
- [ ] Test met verschillende brands/agents

---

## ❓ FAQ & Troubleshooting

### Q: Moet ik nieuwe database tables maken?

**A: NEE! Gebruik bestaande tables. Je schrijft alleen data, geen schema changes.**

### Q: Kan ik nieuwe Edge Functions maken?

**A: Ja, MAAR... vraag eerst aan web team of het er al is. Alleen `transcribe-audio` en `generate-offer-from-voice` zijn echt nieuw nodig.**

### Q: Hoe test ik of mijn agent de juiste data ziet?

**A: Login in web dashboard, kijk welke trips/clients je ziet. Dan moet je in mobile app EXACT dezelfde data zien (vanwege RLS).**

### Q: Wat als ik RLS errors krijg?

**A: Dan probeer je data te lezen die niet van jouw brand is. Check de filter queries! Gebruik ALTIJD `brand_id` filters.**

### Q: Hoe debug ik real-time subscriptions?

```typescript
const subscription = supabase
  .channel('debug')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'trips'
  }, (payload) => {
    console.log('REALTIME EVENT:', payload);
  })
  .subscribe((status) => {
    console.log('Subscription status:', status);
  });
```

---

## 📞 Contact Met Web Platform Team

**Als je vast loopt, vraag dan:**

1. **Database vragen**: "Welke columns heeft table X?" → Check migrations files
2. **RLS vragen**: "Waarom kan ik geen Y lezen?" → Controleer policies in migrations
3. **Edge Function vragen**: "Bestaat functie Z al?" → Check `supabase/functions/` folder
4. **Feature vragen**: "Hoe werkt X in de web app?" → Check source code in `src/components/`

---

## 🚀 Success Criteria

**Je app is af als:**

✅ Agent kan inloggen met bestaande credentials
✅ Agent ziet alleen data van zijn eigen brand
✅ Agent kan trips browsen uit catalog
✅ Agent kan voice offer maken
✅ Agent kan offer submitten naar brand
✅ Agent krijgt notificatie bij approval
✅ Agent kan clients beheren
✅ Agent kan profiel bekijken/editen
✅ Real-time sync werkt (web → mobile en vice versa)
✅ App werkt offline (cached data)

---

## 🎉 Ready to Build!

**Je hebt nu alles wat je nodig hebt:**

- 🗄️ Database structure & RLS policies (al gedaan!)
- 🔐 Auth system (al gedaan!)
- 🔌 API endpoints & Edge Functions (meeste al gedaan!)
- 📱 Mobile app specs (in dit document!)
- 🎤 Voice integration strategy (uitgelegd!)
- 🔄 Real-time sync patterns (voorbeelden gegeven!)

**Veel succes! 💪**

*P.S. Deze app is GEEN standalone product. Het is een mobile interface op het bestaande platform. Think of it as "Instagram vs Facebook Web" - same data, different UX!*

---

**Document Version:** 1.0
**Last Updated:** 2025-12-29
**Maintained By:** Platform Team
**Questions?** Check web project source code or database migrations!
