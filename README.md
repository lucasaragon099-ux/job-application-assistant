# Job Application Assistant

An AI-powered web app that analyzes a job posting against your profile, shows **why** it fits (or doesn't), flags warning signs in the posting, compares several postings side by side, and writes a tailored cover letter.

**Live demo:** https://job-application-assistant-beryl.vercel.app

## What it does

- **Requirements breakdown:** every requirement of the posting is marked as met, partial or missing, with the evidence taken from your profile. The fit score is calculated by the code from these results (required items count double, partial counts half), not guessed by the AI.
- **Posting alerts:** detects warning signs in the text of the posting, such as asking the candidate to pay money, early requests for ID or bank details, contradictory requirements or unrealistic pay. Postings with serious alerts get a red "High risk" badge. It only judges the text, it does not verify the company.
- **Comparison:** select 2 or 3 saved postings and get a ranking, the requirements they share, the synergy between them, shared skill gaps and what to learn first.
- - **Skills dashboard:** groups the requirements of all saved postings by skill, shows how many postings ask for each one and your status (met, partial, missing), and suggests what to learn or prove first. Postings flagged as high risk are excluded.
- **Cover letter:** written only from the profile you provide, so it doesn't invent experience, with a one-tap copy button.
- Every analysis is saved in a Postgres database and shown as a card with a color-coded score.
- Your profile is remembered in your own browser so you don't have to paste it every time.
- Mobile-first layout with automatic dark mode.

## Public demo and access control

- Visitors can try the app without logging in (up to 10 analyses and 5 comparisons per day) to keep API costs under control.
- Only the owner can delete entries, using a password stored as an environment variable.

## Tech stack

- **Next.js** (App Router, Server Actions)
- **PostgreSQL** on Neon
- **Anthropic API (Claude)** for the analysis, the alerts, the comparison and the cover letter
- **Vercel** for deployment, connected to this repository

## How I built it

I built this project entirely from my iPhone, with no computer. I wrote and edited the code in GitHub's web editor, and every commit deployed automatically on Vercel. I used Claude as a pair programmer: I described what I wanted, tested each version on my phone, and iterated.

1. First I prototyped the idea on a single page.
2. Then I moved it to Next.js with a real database.
3. Then I published it on Vercel and added the AI analysis.
4. After that I kept improving it: design, dark mode, logo, owner password and daily limits.
5. Finally I made the analysis more verifiable (requirements with evidence, posting alerts) and added the comparison of postings.

**Problems I had to solve:**

- The first deploys failed. I read the Build Logs in Vercel to find the errors and fix them.
- While testing I tapped the button several times and created duplicates, so I added a pending state that disables the button while it analyzes.
- The keys (database and API) are stored as environment variables, never in the code.
- To test the alerts and the comparison I wrote fictional candidates and job postings, including a fake scam posting, and checked that the app flagged it.

## Limitations

- The fit score depends on how detailed the profile is, and the AI interprets the requirements, so it is a guide, not a verdict.
- The alerts only analyze the text of the posting, they do not check the company.
- There are no user accounts yet: all results are shared in the public demo.

## Next steps

- User accounts, so each person has their own profile and applications.
- A skills dashboard across all saved postings.
- Company research with web search.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `DATABASE_URL` | Postgres connection string (Neon) |
| `APP_PASSWORD` | Owner password (enables deleting entries) |

## Author

Lucas Aragón
