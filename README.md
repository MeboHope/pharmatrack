<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# PharmaTrack

Pharmacy inventory, dispensing and reporting app built with React + Vite, backed by a
Supabase (PostgreSQL) database with email/password authentication.

View your app in AI Studio: https://ai.studio/apps/49fda6da-abf0-4b9c-b7b6-532de4b24813

## Architecture

- **Frontend:** React 19 + Vite + Tailwind.
- **Database:** Supabase Postgres. Tables: `profiles`, `drugs`, `patients`, `suppliers`,
  `transactions`, `stock_adjustments`, `pharmacy_settings`. Schema lives in
  `supabase/migrations/`.
- **Auth:** Supabase Auth (email + password, password reset by email). A database trigger
  creates a `profiles` row for every new user.
- **Access control:** Row level security is on for every table. Pharmacy data is shared
  across all signed-in staff; profiles are only editable by their owner.

## Run locally

**Prerequisites:** Node.js, Docker (for the local Supabase stack), and the
[Supabase CLI](https://supabase.com/docs/guides/local-development).

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local database, auth and API:
   ```bash
   npm run db:start
   ```
   The CLI prints an `API_URL` and `ANON_KEY`.
3. Copy `.env.example` to `.env.local` and fill in:
   ```
   VITE_SUPABASE_URL=<API_URL>
   VITE_SUPABASE_ANON_KEY=<ANON_KEY>
   SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
   ```
4. Load the demo data and demo accounts:
   ```bash
   npm run seed
   ```
5. Run the app:
   ```bash
   npm run dev
   ```

Demo logins created by the seed script:

| Email | Password | Role |
| --- | --- | --- |
| sarah.jenkins@afyalinkpharmacy.co.ke | `Password123!` | Clinician |
| john.doe@afyalinkpharmacy.co.ke | `Pharma2026!` | Pharmacist |

Emails sent locally (confirmations, password resets) are captured by Mailpit at
http://127.0.0.1:54324. The database UI is at http://127.0.0.1:54323.

## Deploy against a hosted Supabase project

1. Create a project at https://supabase.com/dashboard.
2. Push the schema:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (from Settings → API) as environment
   variables in your hosting provider, then deploy the output of `npm run build`.
4. Optionally run `npm run seed` once with the project's service role key to load starter data.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server on port 3000 |
| `npm run build` | Production build |
| `npm run lint` | TypeScript typecheck |
| `npm run db:start` / `npm run db:stop` | Start / stop the local Supabase stack |
| `npm run db:reset` | Recreate the local database from the migrations |
| `npm run seed` | Load demo data and demo users |
