# TrailSync — Treksin

A complete Trekking Operating System with AI-powered trip planning, trail intelligence (TrekPulse), expedition booking, smart journey automation, adventure passport, and a social community.

## Tech Stack

| Layer | Tech |
|-------|------|
| **Framework** | React 19 + TypeScript |
| **Build** | Vite 8 |
| **Routing** | React Router v7 |
| **State** | Zustand |
| **Styling** | Tailwind CSS 3 |
| **Animation** | Framer Motion, GSAP, Lenis |
| **Icons** | Lucide React, Tabler Icons |
| **3D** | react-globe.gl, Three.js |
| **Charts** | Recharts |
| **Auth** | Supabase Auth (email/password + Google OAuth) |
| **Database** | Supabase PostgreSQL |
| **Backend** | Express.js (`server/`) |
| **Automation** | Supabase Edge Functions |

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | **Home** | Hero with FlipWords, trek categories, featured treks, 3D globe |
| `/explore` | **Explore** | Search/filter treks by continent, country, difficulty, budget |
| `/explore/pulse` | **TrekPulse** | Trail Intelligence System — interactive map with color-coded markers, live scores, community reports |
| `/treks/:id` | **Trek Details** | Full trek info, booking card, weather, essentials, Plan This Trek |
| `/treks/:id/book` | **Expedition Booking** | Multi-step: departure, participants, readiness checklist, review |
| `/passport` | **Adventure Passport** | Digital trekking identity — stamps, stats, achievements, adventure map |
| `/community` | **Community** | Stories, photo feed, challenges, leaderboard, group treks |
| `/community/activity` | **Activity** | Notifications, likes, follows, safety alerts |
| `/community/search` | **Search** | Search posts and people |
| `/community/people` | **People** | Popular and suggested trekkers |
| `/community/profile/:id` | **Profile** | User profile, posts, followers/following |
| `/ai-planner` | **AI Planner** | 5-step questionnaire → personalized AI trek plan |
| `/saved-treks` | **Saved Treks** | Bookmarked treks |
| `/my-expeditions` | **My Expeditions** | Booked expedition packages |
| `/my-expeditions/:bookingId` | **Booking Details** | Single booking info |
| `/journeys` | **My Journeys** | Self-planned treks with gear & readiness tracking |
| `/journeys/:id` | **Journey Detail** | Timeline, gear checklist, readiness, completion + XP |
| `/notifications` | **Notifications** | All notifications with social/treks/journeys/safety tabs |
| `/admin` | **Admin Panel** | Dashboard, users, treks, expeditions, bookings, moderation, safety, challenges |

## Key Features

- **Auth** — Email/password + Google OAuth via Supabase; role-based (user/moderator/admin)
- **TrekPulse** — Trail Intelligence System with live scores, interactive world map, color-coded markers, community reports, automated alert matching
- **Adventure Passport** — Digital trekking identity with explorer levels, trek stamps, achievements, adventure map, lifetime stats
- **Expedition Booking** — Multi-step booking with departure selection, participant management, readiness checklist
- **Smart Journey Automation** — Plan a trek → automated reminders, gear checklists, readiness tracking, XP rewards
- **Demo Mode** — Instant automation demo button that triggers the next pending journey task on demand
- **Notifications** — Real-time bell badge with dedicated `/notifications` page (social, treks, journeys, safety tabs)
- **Safety Reports** — Community safety reports with automatic journey matching, TrekPulse alerts
- **Admin Panel** — Full CRUD for treks, expeditions, bookings, user moderation, analytics, trail intelligence dashboard
- **3D Globe** — Interactive globe with continent pin markers
- **Community** — Posts, likes, comments, follows, stories, challenges, leaderboard

## Getting Started

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 8080
```

Open `http://localhost:8080`.

## Build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── shared/           # Navbar, Footer
│   ├── ui/               # Globe, Carousel, FlipWords, StickyCard, Toast, FloatingDock
│   ├── journey/          # PlanTrekModal, JourneyCard, JourneyTimeline, GearChecklist, ReadinessChecklist
│   ├── trekpulse/        # TrailIntelligenceCard, TrekPulseMap, ReportCard
│   ├── passport/         # TrekStamp, AchievementCard
│   ├── community/        # BottomNav, CreatePostModal, CommentsDrawer, StoryViewer, AuthModal
│   └── admin/            # AdminLayout, AdminRouteGuard
├── data/                 # globalTreks.ts (11 treks across 7 continents)
├── lib/                  # Supabase client, journeys, expeditions, community, trekRepository, admin, trekpulse, passport
├── hooks/                # useAuth, use-admin
├── layouts/              # MainLayout, CommunityLayout, AdminLayout
├── pages/                # All route pages including TrekPulse, Passport, JourneyDetail
├── pages/admin/          # AdminDashboard, AdminTrekPulse, plus all admin CRUD pages
├── store/                # Zustand store
└── supabase/
    ├── migrations/       # 14 SQL migrations (last: 00014_trekpulse_and_passport)
    └── functions/        # Edge Functions (process-journey-tasks)
```

## Automation System

Journeys create 6 scheduled tasks: preparation → conditions check → readiness → trek start → completion prompt → share experience. A Supabase Edge Function (`process-journey-tasks`) runs on a cron schedule (every 15 min) to process due tasks and create notifications. The demo button allows instant task processing for presentations.

## TrekPulse Scoring

Each trek receives a live Trail Intelligence Score (0-100) based on:
- Community reports (severity penalties)
- Active journey activity (popularity bonus)
- Recent community posts (activity score)
- Safety report frequency
- Weather data (future-ready)

Score updates via `calculate_trekpulse_score()` RPC. TrekPulse Reports created through community safety reports automatically match against upcoming journeys and create `journey_safety` notifications.

## Adventure Passport

- Trek stamps automatically created on journey completion
- 11 achievements (First Trek → Adventure Master, 100KM Club → 500KM Club)
- Explorer levels (Explorer → Trekking Master)
- Lifetime stats (countries, distance, elevation, streaks)
- Interactive adventure map showing completed treks
- Available from Profile tab and Navbar dropdown
