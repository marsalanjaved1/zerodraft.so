# Technical Specification: AI Writing Assistant

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│   API Layer  │────▶│  AI Engine  │
│  (React)    │     │   (Next.js)  │     │  (Python)   │
└─────────────┘     └──────────────┘     └─────────────┘
       │                   │                    │
       ▼                   ▼                    ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  WebSocket  │     │   Supabase   │     │   Vector    │
│   (Yjs)     │     │   (Postgres) │     │    DB       │
└─────────────┘     └──────────────┘     └─────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Editor**: Tiptap with ProseMirror
- **State**: Zustand + React Query
- **Styling**: Tailwind CSS
- **Real-time**: Yjs with y-websocket

### Backend
- **API**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth + JWT
- **File Storage**: Supabase Storage
- **Search**: Typesense

### AI/ML
- **Primary Model**: Claude 3.5 Sonnet (via OpenRouter)
- **Embeddings**: OpenAI text-embedding-3-small
- **Vector DB**: Pinecone
- **Local Fallback**: Ollama with Mistral 7B

## Database Schema

### documents
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| title | text | NOT NULL |
| content | jsonb | |
| user_id | uuid | FK → users |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| is_archived | boolean | DEFAULT false |

### document_versions
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| document_id | uuid | FK → documents |
| version | int | |
| content | jsonb | |
| created_at | timestamptz | |
| created_by | uuid | FK → users |

## API Endpoints

### Documents
- `GET /api/documents` - List documents
- `POST /api/documents` - Create document
- `GET /api/documents/:id` - Get document
- `PATCH /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Archive document

### AI
- `POST /api/ai/complete` - Autocomplete text
- `POST /api/ai/suggest` - Get suggestions
- `POST /api/ai/summarize` - Summarize content
- `POST /api/ai/rewrite` - Rewrite with tone

## Performance Requirements
- **Cold start**: < 3s
- **P95 latency**: < 200ms for API calls
- **Editor input latency**: < 50ms
- **WebSocket reconnect**: < 1s
- **Concurrent users per doc**: 10

## Security Considerations
- All API endpoints require authentication
- Row-level security in Supabase
- Rate limiting: 100 req/min per user
- Content encryption at rest
- CORS restricted to allowed origins

## Technical Risks
1. **AI latency** - Mitigate with streaming responses
2. **WebSocket scaling** - Use Redis for horizontal scaling
3. **Large documents** - Implement chunked loading
4. **Offline mode** - Service worker + IndexedDB

## Dependencies
- OpenRouter API (Claude access)
- Supabase (database + auth)
- Pinecone (vector storage)
- Typesense (search)
- Vercel (hosting)

## Monitoring
- Vercel Analytics for frontend
- Supabase dashboard for database
- Sentry for error tracking
- Custom metrics via PostHog
