# Job Application Assistant

An AI-powered web app that analyzes a job posting against your profile, scores the fit, and writes a tailored cover letter. Every analysis is saved so you can track your applications.

**Live demo:** https://job-application-assistant-beryl.vercel.app

## What it does

- Paste your profile and a job posting, and get back the job title, company, a fit score (0-100%), a short summary of strengths and gaps, and a cover letter.
- The cover letter is based only on the profile you provide, so it doesn't invent experience.
- Every analysis is saved to a Postgres database and shown as a card with a color-coded score.
- Visitors can try the demo without logging in (limited to 10 analyses per day). Only the owner can delete entries, using a password.
- Shows an "Analyzing..." state and disables the button while the request is running.
- Mobile-first layout with automatic dark mode.

## Tech stack

- **Next.js** (App Router, Server Actions)
- **PostgreSQL** on Neon
- **Anthropic API (Claude)** for the analysis and the cover letter
- **Vercel** for deployment, connected to this repository

## How I built it

I built this project entirely from my iPhone, with no computer. I wrote and edited the code in GitHub's web editor, and every commit deployed automatically on Vercel. I used Claude as a pair programmer: I described what I wanted, tested each version on my phone, and iterated.

1. First I prototyped the idea on a single page.
2. Then I moved it to Next.js with a real database.
3. Finally I published it on Vercel and added the AI analysis.
4. After that I improved it: design, dark mode, logo, owner password and a daily demo limit.

**Problems I had to solve:**

- The first deploys failed. I read the Build Logs in Vercel to find the errors and fix them.
- While testing I tapped the button several times and created duplicates, so I added a pending state that disables the button while it analyzes.
- The keys (database and API) are stored as environment variables, never in the code.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `DATABASE_URL` | Postgres connection string (Neon) |
| `APP_PASSWORD` | Owner password (enables deleting entries) |

## Author

Lucas Aragón
