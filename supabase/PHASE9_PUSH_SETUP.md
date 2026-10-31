# Phase 9: PWA and Web Push setup

The repository changes prepare the PWA and push system. Hosted deployment still requires the database migration, Edge Function, VAPID secrets, and a Cron job. The migration does not deploy itself.

## HTTPS and PWA

Serve the production site over HTTPS. Browsers permit service workers and push on HTTPS; `localhost` is accepted for local development. The app registers `public/sw.js`, links `public/manifest.webmanifest`, and includes PNG icons at 192 and 512 pixels. Check **Application > Manifest** and **Application > Service Workers** in Chromium DevTools after serving a production build. No hosting provider is configured in this repository, so HTTPS enforcement must be enabled at the selected host/CDN.

Install guidance is available in Settings. On iOS/iPadOS, use Safari's Share > Add to Home Screen. The app intentionally does not show an in-page notification as proof that Web Push works.

## VAPID keys and Edge Function secrets

Generate one VAPID pair for this application and keep the private key in a password manager/secret manager:

```powershell
npx --yes web-push@3.6.7 generate-vapid-keys --json
```

Put only the public key in the frontend `.env.local`:

```dotenv
VITE_VAPID_PUBLIC_KEY=<public-key>
```

Set these secrets for the Supabase project using **Project Settings > Edge Functions > Secrets** (or an approved secret manager):

- `VAPID_PUBLIC_KEY` — same public key as the frontend.
- `VAPID_PRIVATE_KEY` — private VAPID key; never use a `VITE_` name or commit it.
- `VAPID_SUBJECT` — a contact URI, for example `mailto:admin@example.com`.
- `PUSH_CRON_SECRET` — a separate high-entropy random secret used only by Cron.

Supabase injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into Edge Functions. The service role is used only inside the sender. Do not copy it to browser configuration.

## Deployment order

1. Apply `20261103000000_pwa_push_notifications.sql` after reviewing it for the target project.
2. Deploy `supabase/functions/push-notifications` with the secrets above. The repository config disables platform JWT verification for this one function; the function requires the separate `x-cron-secret` header itself.
3. Enable `pg_cron`, `pg_net`, and Vault in the hosted project if they are not already enabled.
4. Store the project URL, publishable key, and `PUSH_CRON_SECRET` in Vault. Substitute actual values in the SQL Editor; do not commit them. The publishable key is not privileged; the separate random header is validated by the function:

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'my_skin_diary_project_url');
select vault.create_secret('<project-publishable-key>', 'my_skin_diary_publishable_key');
select vault.create_secret('<random PUSH_CRON_SECRET>', 'my_skin_diary_push_cron_secret');
```

5. Schedule the sender once per minute. This SQL only creates/updates the named Cron job; the sender uses Asia/Jakarta wall-clock values when deciding what is due:

```sql
select cron.schedule(
  'my-skin-diary-push',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'my_skin_diary_project_url') || '/functions/v1/push-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'my_skin_diary_publishable_key'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'my_skin_diary_push_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Run the `cron.schedule` statement only once. If replacing it, unschedule the existing job first by its `jobid` from `cron.job`. Confirm the job and recent runs in the Supabase Cron dashboard. `pg_net` temporarily stores outbound request headers while requests are queued; the publishable key has no elevated privileges, but the random Cron secret can trigger the sender. Limit database access and never put the VAPID private key or service role key in Cron headers.

## Local development

1. Start Supabase locally and apply migrations using the established local workflow.
2. Put a test VAPID public key in `.env.local` and the matching public/private keys, subject, and random cron secret in `supabase/functions/.env` (never commit that file).
3. Serve the function locally with `supabase functions serve push-notifications --env-file supabase/functions/.env`.
4. Use the local stack's HTTPS-capable browser context or `localhost`, install the PWA, then subscribe from Settings.
5. Invoke the local function with `POST` and `x-cron-secret` set to the same local secret to exercise its queue. Local `pg_cron`/`pg_net` extension availability depends on the local Supabase stack configuration.

## Closed-app device test

Use a real device and a supported browser. Android Chrome is a straightforward first target; on iOS/iPadOS, install the site to the Home Screen and use a supported OS/browser version. Ensure production is HTTPS, install the PWA, allow notifications in both browser and OS settings, enable push from Settings, and verify that a row appears in `push_subscriptions` for the signed-in user. Set a routine reminder time a minute or two ahead in Asia/Jakarta and ensure an active routine exists for that weekday. Close all app tabs (and the installed PWA window), wait for the scheduled Cron run, then verify the notification arrives. Finally inspect `notification_logs`, `notification_deliveries`, and Cron/Edge Function logs. Repeat with the device offline briefly and then online to check push-service delivery/retry behavior.

This repository implementation has not been deployed to a hosted project or tested on a real closed app/device. A notification shown by the page while open does not verify background Web Push.
