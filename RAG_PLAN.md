# SafeDoge RAG + PostgreSQL + AI Agents Plan

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Mobile App (Expo/React Native)                         │
│  ├── useAuth.jsx          → Firebase Auth (unchanged)   │
│  ├── UploadScreen.jsx     → POST /api/incidents         │
│  ├── MapScreen.jsx        → GET /api/streets + WS       │
│  ├── AlertsScreen.jsx     → GET /api/incidents (real)   │
│  ├── ChatScreen.jsx       → NEW: POST /api/chat         │
│  └── lib/api.js           → NEW: API client             │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTP + WebSocket
┌──────────────────▼──────────────────────────────────────┐
│  FastAPI Backend (existing + expanded)                  │
│  ├── POST /analyze          (existing)                   │
│  ├── POST /api/incidents     (new)                       │
│  ├── GET  /api/incidents     (new)                       │
│  ├── GET  /api/streets       (new)                       │
│  ├── POST /api/route-danger  (new)                       │
│  ├── POST /api/chat          (new)                       │
│  ├── WS   /ws/incidents      (new)                       │
│  └── GET  /health            (extended)                  │
│                                                          │
│  AI Agents: RouteAgent, SafetyAgent, IncidentAgent       │
│  RAG Pipeline: Ollama + pgvector                         │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│  PostgreSQL + pgvector (self-hosted)                     │
│  ├── incidents, street_risk                              │
│  ├── knowledge_docs, doc_embeddings                      │
│  └── incident_embeddings                                 │
└─────────────────────────────────────────────────────────┘
         ▲                          ▲
  Firebase Auth              Cloudinary
  (unchanged)                (unchanged)
```

## PostgreSQL Schema

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reported_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_name TEXT,
    behavior TEXT,
    dog_count INTEGER,
    reported_attack BOOLEAN DEFAULT FALSE,
    description TEXT,
    photo_urls TEXT[],
    risk_score INTEGER,
    risk_level TEXT,
    risk_color TEXT,
    detected_breed TEXT,
    detected_emotion TEXT,
    detected_posture TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_incidents_location ON incidents (latitude, longitude);
CREATE INDEX idx_incidents_created ON incidents (created_at DESC);

CREATE TABLE street_risk (
    osm_way_id TEXT PRIMARY KEY,
    street_name TEXT,
    highway_type TEXT,
    coordinates JSONB,
    avg_risk_score DOUBLE PRECISION,
    max_risk_score INTEGER,
    incident_count INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE knowledge_docs (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE doc_embeddings (
    id SERIAL PRIMARY KEY,
    doc_id INTEGER REFERENCES knowledge_docs(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding VECTOR(768),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_doc_emb_cosine ON doc_embeddings
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

CREATE TABLE incident_embeddings (
    id SERIAL PRIMARY KEY,
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inc_emb_cosine ON incident_embeddings
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
```

## New Files

### Backend
| File | Purpose |
|------|---------|
| backend/db/connection.py | Async PostgreSQL pool (asyncpg) |
| backend/db/incidents.py | CRUD incidents |
| backend/db/streets.py | CRUD street risk |
| backend/db/knowledge.py | Knowledge docs + vector search |
| backend/rag/embedder.py | Ollama nomic-embed-text wrapper |
| backend/rag/retriever.py | pgvector similarity search |
| backend/rag/chunker.py | Text chunking |
| backend/rag/pipeline.py | End-to-end RAG |
| backend/agents/base.py | Base agent |
| backend/agents/route_agent.py | Route danger analysis |
| backend/agents/safety_agent.py | Safety Q&A |
| backend/agents/orchestrator.py | Intent routing |
| backend/migration/firestore_to_pg.py | Firestore → PostgreSQL |
| backend/migration/seed_knowledge.py | Seed breed info + safety guides |
| backend/migration/generate_embeddings.py | Embed docs via Ollama |

### Frontend
| File | Purpose |
|------|---------|
| src/lib/api.js | Backend API client |
| src/screens/ChatScreen.jsx | AI agent chat |
| src/screens/RouteSafetyScreen.jsx | Route planner |
| src/screens/ForgotPasswordScreen.jsx | Password reset |
| src/screens/PhoneAuthScreen.jsx | Phone OTP auth |

### Config
| File | Purpose |
|------|---------|
| docker-compose.yml | PostgreSQL + pgvector |
| schema.sql | Full database schema |
| backend/.env.example | DATABASE_URL, OLLAMA_URL |

## Modified Files

| File | Changes |
|------|---------|
| backend/main.py | New API routes, WebSocket |
| backend/requirements.txt | asyncpg, pgvector, ollama |
| src/screens/MapScreen.jsx | API calls instead of Firestore |
| src/screens/UploadScreen.jsx | POST to backend |
| src/screens/AlertsScreen.jsx | Real data from API |
| src/screens/LoginScreen.jsx | Google + Phone auth buttons |
| src/hooks/useAuth.jsx | Google, phone, reset methods |
| src/navigation/TabNavigator.jsx | Add Chat tab |
| app.json | Auth plugins |
| package.json | google-signin dep |

## Unchanged Files

- src/lib/firebase.js
- src/lib/cloudinary.js
- src/lib/risk.js
- src/lib/overpass.js
- backend/detector.py, models.py, risk.py, config.py

## Implementation Order

| Phase | What | Files |
|-------|------|-------|
| 1 | PostgreSQL setup | docker-compose, schema.sql, connection.py |
| 2 | Ollama install + pull models | — |
| 3 | Backend CRUD endpoints | db/*.py, main.py routes |
| 4 | RAG pipeline | rag/*.py |
| 5 | AI agents | agents/*.py |
| 6 | API routes + WebSocket | main.py |
| 7 | Migration scripts | migration/*.py |
| 8 | Frontend API client + screen mods | api.js, modify screens |
| 9 | New screens (Chat, RouteSafety) | New .jsx files |
| 10 | Integration testing | — |

## Auth Enhancements

### Google Sign-In
- Library: @react-native-google-signin/google-signin
- Configure GoogleSignin.configure({ webClientId })
- signInWithCredential(GoogleAuthProvider.credential(idToken))

### Phone Auth
- Firebase signInWithPhoneNumber('+91XXXXXXXXXX')
- confirmation.confirm('123456')
- Built-in reCAPTCHA with @react-native-firebase/auth

### Forgot Password
- auth().sendPasswordResetEmail(email)

## Ollama Setup

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.1
ollama pull nomic-embed-text
```

Cost: Free locally. Railway: $300+/mo (not recommended for student project).
