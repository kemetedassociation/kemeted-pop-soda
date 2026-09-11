// ============================================================
// KEMETED SAVEUR — demande d'avis, 14 jours après la commande
// Déclenchée par un cron (voir supabase/README.md), jamais par le client.
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, emailShell } from "../_shared/resend.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const DELAY_DAYS = 14;

Deno.serve(async (req) => {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== Deno.env.get("CRON_SECRET")) {
    return new Response("unauthorized", { status: 401 });
  }

  const cutoff = new Date(Date.now() - DELAY_DAYS * 86400 * 1000).toISOString();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, email, customer_id")
    .lt("created_at", cutoff)
    .is("review_requested_at", null)
    .not("customer_id", "is", null);

  if (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;
  for (const order of orders || []) {
    if (!order.email) continue;

    const html = emailShell(`
      <p style="font-size:18px;font-weight:700;color:#7A1F38;margin:0 0 12px">Alors, ça a donné quoi ? 🐦‍⬛</p>
      <p style="font-size:14px;line-height:1.6;margin:0 0 20px">Ça fait deux semaines que ta commande Kemeted est arrivée — on adorerait savoir ce que tu en as pensé ! Un petit mot sur Instagram, ou juste une réponse à cet email, ça compte énormément pour une petite équipe comme la nôtre.</p>
      <a href="https://www.instagram.com/kemetedassociation/" style="display:inline-block;background:#7A1F38;color:#fff;text-decoration:none;padding:12px 24px;border-radius:30px;font-weight:700;font-size:14px">Nous taguer sur Instagram →</a>
      <p style="font-size:13px;line-height:1.6;margin:20px 0 0;opacity:.7">Tu peux aussi juste répondre directement à cet email.</p>
    `);

    try {
      await sendEmail({ to: order.email, subject: "Ton avis sur ta dernière commande Kemeted", html });
      await supabase.from("orders").update({ review_requested_at: new Date().toISOString() }).eq("id", order.id);
      sent++;
    } catch (err) {
      console.error("échec envoi demande d'avis:", err);
    }
  }

  return new Response(JSON.stringify({ checked: (orders || []).length, sent }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
