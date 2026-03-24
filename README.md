# ◉ Echo

> **A place to speak freely. No names. No profiles.**

Echo is an anonymous, voice-only social network. Instead of typing, you record short voice notes. Instead of likes and follower counts, you get empathy reactions. Everything disappears after 24 hours. No accounts, no clout, no noise — just human voices and feelings.

---

## Table of Contents

- [What is Echo?](#what-is-echo)
- [Core Philosophy](#core-philosophy)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Database Setup](#1-database-setup)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
- [Environment Variables](#environment-variables)
- [How It Works](#how-it-works)
- [Moderation & Safety](#moderation--safety)
- [Roadmap](#roadmap)

---

## What is Echo?

Echo is inspired by the feed and threading model of X (Twitter), but replaces all text with short voice notes. Think of it as an anonymous audio diary that's open to the world — where anyone can listen, reply, and react, but nobody knows who you are.

- You record a voice note (10–60 seconds)
- You pick a mood tag (Lonely, Hopeful, Angry, Grateful…)
- It posts anonymously and disappears in 24 hours
- Others can listen, react with empathy, and reply with their own voice

---

## Core Philosophy

| Principle | Over |
|---|---|
| 🎙 Voice | Text |
| 💬 Emotion | Virality |
| 🎭 Anonymity | Identity |
| 👂 Listening | Posting |
| 🛡 Safety | "Free speech absolutism" |

---

## Features

### MVP (Built)
- ✅ Anonymous identity — random local ID, no sign-up, no email
- ✅ Voice feed — scrollable cards with animated waveforms
- ✅ Hold-to-record — up to 60 seconds, with circular progress arc
- ✅ Mood tags — 8 emotional moods with color coding
- ✅ Voice threads — reply to any post with your own voice (max 45s)
- ✅ Empathy reactions — 🤍 I hear you · 🫂 Same here · 💭 Thinking of you
- ✅ Explore screen — filter by mood and time window
- ✅ Auto-expiry — all posts and replies deleted after 24 hours
- ✅ Auto-moderation — speech-to-text + toxicity detection on upload
- ✅ Shadow banning — 3 reports triggers automatic shadow ban
- ✅ No likes count, no follower count, no reposts

### Explicitly Not Built (Out of Scope)
- ❌ Text posts
- ❌ Direct messages
- ❌ User profiles
- ❌ Followers / following
- ❌ Ads or monetization
- ❌ Public engagement metrics
- ❌ Livestreaming

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Web Audio API |
| Styling | Pure CSS with CSS variables, Google Fonts |
| Backend | FastAPI (Python 3.12), async |
| Database | MySQL 8 via SQLAlchemy + aiomysql |
| Audio Storage | Local filesystem (dev) / AWS S3 (prod) |
| Moderation | Keyword blocklist (dev) / OpenAI Whisper + Perspective API (prod) |
| Environment | python-dotenv, venv |

---

## Project Structure

```
echo/
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx                    Root — screen router + global state
│       ├── components/
│       │   ├── common/
│       │   │   ├── Waveform.jsx       Animated waveform bars
│       │   │   ├── NavBar.jsx         Top bar with logo + tabs
│       │   │   ├── TabBar.jsx         Fixed bottom navigation
│       │   │   └── Toast.jsx          Floating notification
│       │   ├── onboard/
│       │   │   └── OnboardScreen.jsx  First-launch welcome screen
│       │   ├── feed/
│       │   │   ├── FeedScreen.jsx     Chronological voice feed
│       │   │   └── VoiceCard.jsx      Single post card with player
│       │   ├── explore/
│       │   │   └── ExploreScreen.jsx  Mood + time filter view
│       │   ├── thread/
│       │   │   └── ThreadScreen.jsx   Post + threaded replies
│       │   └── record/
│       │       └── RecordScreen.jsx   Hold-to-record overlay
│       ├── hooks/
│       │   ├── useAudioPlayer.js      Playback state management
│       │   ├── useAudioRecorder.js    MediaRecorder + mic permission
│       │   └── useToast.js            Toast notification lifecycle
│       ├── api/
│       │   ├── posts.js               Feed, create, report
│       │   ├── replies.js             Fetch and create replies
│       │   └── reactions.js           Toggle empathy reactions
│       ├── constants/
│       │   ├── moods.js               8 moods with colors + emojis
│       │   └── reactions.js           3 empathy reaction types
│       ├── utils/
│       │   ├── waveform.js            Wave generation helpers
│       │   └── time.js                timeAgo + fmtSeconds
│       └── styles/
│           └── globals.css            All CSS variables + animations
│
└── backend/
    ├── main.py                        FastAPI app factory + startup
    ├── database.py                    Async engine + session factory
    ├── schema.sql                     MySQL DDL — run once to init DB
    ├── requirements.txt
    ├── .env.example
    ├── .env                           Your local config (never commit)
    ├── models/
    │   └── models.py                  ORM: User, VoicePost, VoiceReply,
    │                                       Reaction, Report
    ├── schemas/
    │   └── schemas.py                 Pydantic request/response models
    ├── routes/
    │   ├── posts.py                   GET + POST /posts
    │   ├── replies.py                 GET + POST /posts/:id/replies
    │   └── reactions.py               POST /posts/:id/reactions
    └── services/
        ├── storage.py                 Save audio locally or to S3
        └── moderation.py             STT + toxicity classification
```

---

## Database Schema

```sql
users         — Anonymous user, identified by random local ID
voice_posts   — Voice note (audio URL, mood, duration, 24h expiry)
voice_replies — Threaded reply, expires with parent post
reactions     — One empathy reaction per user per post
reports       — User report; 3 reports = automatic shadow ban
```

| Table | Key Columns |
|---|---|
| `users` | `id`, `device_hash`, `shadow_ban`, `created_at` |
| `voice_posts` | `audio_url`, `duration`, `mood`, `flagged`, `expires_at` |
| `voice_replies` | `post_id`, `audio_url`, `duration`, `mood`, `expires_at` |
| `reactions` | `post_id`, `user_id`, `emoji` |
| `reports` | `post_id`, `reporter_id`, `reason` |

Posts and replies auto-delete via a MySQL scheduled event that runs every hour:
```sql
CREATE EVENT cleanup_expired_posts
  ON SCHEDULE EVERY 1 HOUR
  DO DELETE FROM voice_posts WHERE expires_at < NOW();
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/posts` | Paginated feed, newest first, live only |
| `GET` | `/posts/:id` | Single post with reply count |
| `POST` | `/posts` | Upload new voice post (multipart) |
| `POST` | `/posts/:id/report` | Report a post |
| `GET` | `/posts/:id/replies` | All replies for a post |
| `POST` | `/posts/:id/replies` | Upload voice reply (multipart) |
| `POST` | `/posts/:id/reactions` | Toggle empathy reaction |
| `GET` | `/health` | Health check |

Interactive API docs are auto-generated by FastAPI and available at:
```
http://localhost:8000/docs
```

---

## Getting Started

### Prerequisites

Make sure you have these installed:

- Python 3.10+
- Node.js 18+
- MySQL 8+

### 1. Database Setup

```bash
mysql -u root -p < backend/schema.sql
```

This creates the `echo_db` database and all five tables.

### 2. Backend Setup

```bash
# Navigate to the project root
cd echo

# Create virtual environment inside backend/
cd backend
python -m venv venv

# Activate it
source venv/bin/activate        # Mac / Linux
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Open .env and set DB_PASSWORD to your MySQL password

# Go back to project root and run
cd ..
uvicorn backend.main:app --reload
```

Server runs at: `http://localhost:8000`

### 3. Frontend Setup

Open a new terminal:

```bash
cd echo/frontend

# Install dependencies
npm install

# Create frontend env file
echo "VITE_API_URL=http://localhost:8000" > .env

# Start dev server
npm run dev
```

App runs at: `http://localhost:5173`

---

## Environment Variables

### Backend — `backend/.env`

```bash
# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=echo_db
DB_USER=root
DB_PASSWORD=your_password_here

# Storage — "local" for dev, "s3" for production
STORAGE_BACKEND=local
UPLOAD_DIR=uploads
PUBLIC_BASE_URL=http://localhost:8000/uploads

# Moderation — "simple" for dev, "openai" for production
MODERATION_BACKEND=simple
```

### Frontend — `frontend/.env`

```bash
VITE_API_URL=http://localhost:8000
```

---

## How It Works

### Posting a Voice Note

```
User holds mic button
  → useAudioRecorder captures audio via MediaRecorder API
  → RecordScreen shows live timer + progress arc
  → User picks a mood and taps "Post Anonymously"
  → api/posts.js sends multipart POST /posts
      → routes/posts.py receives the request
          → services/moderation.py runs STT + toxicity check
          → services/storage.py saves audio file
          → VoicePost row saved to MySQL with 24h expiry
          ← returns post JSON
  → FeedScreen prepends new post optimistically
  → Toast shows "✓ Posted anonymously"
```

### Anonymous Identity

No accounts are created. On first load, the frontend generates a random ID:

```js
"anon_" + Math.random().toString(36).slice(2, 12)
```

This is stored in `localStorage` and sent with every request. The backend creates a `users` row on first post. Nothing ties this ID to a real person.

### Content Lifecycle

```
Post created → expires_at = now + 24 hours
  ├── Replies inherit the parent's expires_at
  └── MySQL event deletes expired rows every hour
```

---

## Moderation & Safety

Echo runs automatic moderation on every upload before it goes live:

1. **Speech-to-text** — audio is transcribed (Whisper API in production)
2. **Toxicity check** — transcript is scanned for hate speech and harmful content
3. **Auto-flag** — flagged posts are blocked before appearing in the feed

User-driven safety:
- Any user can report a post with a reason
- **3 reports** → post is flagged and author is shadow-banned
- Shadow-banned users can post but their content is never shown to others
- Repeat offenders can be device-level banned

---

## Roadmap

These features are planned but not yet built:

- [ ] Real-time waveform visualization while recording
- [ ] WebSocket live feed — new posts appear without refreshing
- [ ] Web Push notifications — "Someone replied to your voice"
- [ ] Audio compression before upload (Opus codec)
- [ ] Mood rooms — live filtered feed per mood
- [ ] Daily voice prompt to spark posts
- [ ] PWA support — installable, works offline
- [ ] Admin moderation dashboard
- [ ] CDN integration for audio delivery
- [ ] Rate limiting per anonymous ID

---

## .gitignore

Make sure these are excluded from version control:

```
backend/.env
backend/venv/
backend/uploads/
frontend/node_modules/
frontend/.env
```

---

*Echo — No names. No profiles. Just voices.*
