-- ============================================================
-- KEMETED SAVEUR — planification des relances automatiques
-- (déjà exécutée depuis Claude Code — gardé ici pour référence /
-- reproductibilité si tu recrées le projet un jour)
-- ============================================================

select cron.schedule(
  'kemeted-abandoned-cart-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://kpsuwkbrovbuudcndaot.supabase.co/functions/v1/send-abandoned-cart-reminders',
    headers := jsonb_build_object('x-cron-secret', 'REPLACE_WITH_CRON_SECRET', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'kemeted-review-requests',
  '0 9 * * *',
  $$
  select net.http_post(
    url := 'https://kpsuwkbrovbuudcndaot.supabase.co/functions/v1/send-review-requests',
    headers := jsonb_build_object('x-cron-secret', 'REPLACE_WITH_CRON_SECRET', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
