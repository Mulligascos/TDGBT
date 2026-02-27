# 🥏 Disc Golf Club — Member Portal

A full-featured disc golf club member app built with React + Vite + Supabase, deployable to Vercel.

## Features

| Page | Members | Admins |
|------|---------|--------|
| **Home** | News feed + upcoming events | — |
| **News** | Read posts | Create / edit / delete posts |
| **Events** | View + RSVP | Create / edit / delete events |
| **Scores** | Log rounds, view history | Same |
| **Bag Tags** | Leaderboard, record challenges | Same |
| **Members** | View directory | Edit, activate/deactivate, manage roles |
| **Profile** | Edit own details + photo | Same |

## Setup

### 1. Supabase Project

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase-schema.sql` in the **SQL Editor**
3. Go to **Storage** → create a bucket called `member-photos`, set it to **Public**
4. Go to **Authentication → Email Templates** → disable "Confirm email" (magic links handle this)
5. Go to **Authentication → URL Configuration** → set Site URL to your Vercel domain

### 2. Environment Variables

```bash
cp .env.example .env
# Fill in:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Local Development

```bash
npm install
npm run dev
```

### 4. Deploy to Vercel

1. Push to GitHub
2. Import in [vercel.com](https://vercel.com)
3. Add env vars in Vercel project settings
4. Deploy

### 5. First Login & Admin Setup

1. Open the app and sign in with your email (you'll get a magic link)
2. In Supabase SQL Editor, run:
```sql
UPDATE member_profiles 
SET role = 'admin', full_name = 'Your Name' 
WHERE email = 'your@email.com';
```
3. Refresh the app — you now have admin access

## Tech Stack

- **Frontend**: React 18, React Router v6, Vite
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Auth**: Magic link (passwordless email)
- **Hosting**: Vercel
- **Fonts**: Bebas Neue, DM Sans, JetBrains Mono
