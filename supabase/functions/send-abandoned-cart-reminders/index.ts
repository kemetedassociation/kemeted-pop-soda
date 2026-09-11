// ============================================================
// KEMETED SAVEUR — relance panier abandonné (2h sans finaliser)
// Déclenchée par un cron (voir supabase/README.md), jamais par le client.
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, emailShell, PRODUCT_NAMES } from "../_shared/resend.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const DELAY_HOURS = 2;
const ROOT_URL = Deno.env.get("SITE_URL") || "https://kemetedassociation.github.io/kemeted-pop-soda/project/";

Deno.serve(async (req) => {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== Deno.env.get("CRON_SECRET")) {
    return new Response("unauthorized", { status: 401 });
  }

  const cutoff = new Date(Date.now() - DELAY_HOURS * 3600 * 1000).toISOString();

  const { data: carts, error } = await supabase
    .from("carts")
    .select("customer_id, items, updated_at")
    .lt("updated_at", cutoff)
    .is("reminder_sent_at", null);

  if (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;
  for (const cart of carts || []) {
    const items = Array.isArray(cart.items) ? cart.items : [];
    if (!items.length) continue;

    // déjà commandé depuis la mise à jour du panier ? on saute, et on
    // nettoie le panier converti pour ne plus le revoir
    const { data: recentOrder } = await supabase
      .from("orders")
      .select("id")
      .eq("customer_id", cart.customer_id)
      .gt("created_at", cart.updated_at)
      .limit(1)
      .maybeSingle();

    if (recentOrder) {
      await supabase.from("carts").delete().eq("customer_id", cart.customer_id);
      continue;
    }

    const { data: customer } = await supabase
      .from("customers")
      .select("email")
      .eq("id", cart.customer_id)
      .maybeSingle();
    if (!customer?.email) continue;

    const itemsHtml = items
      .map((i: { id: string; qty: number }) => `<li>${PRODUCT_NAMES[i.id] || i.id} × ${i.qty}</li>`)
      .join("");

    const html = emailShell(`
      <p style="font-size:18px;font-weight:700;color:#7A1F38;margin:0 0 12px">Croa ! Tu as oublié quelque chose 🐦‍⬛</p>
      <p style="font-size:14px;line-height:1.6;margin:0 0 16px">Ton panier t'attend toujours :</p>
      <ul style="font-size:14px;line-height:1.8;padding-left:20px;margin:0 0 20px">${itemsHtml}</ul>
      <a href="${ROOT_URL}panier.html" style="display:inline-block;background:#7A1F38;color:#fff;text-decoration:none;padding:12px 24px;border-radius:30px;font-weight:700;font-size:14px">Finaliser ma commande →</a>
    `);

    try {
      await sendEmail({ to: customer.email, subject: "Ton panier Kemeted t'attend 🌿", html });
      await supabase.from("carts").update({ reminder_sent_at: new Date().toISOString() }).eq("customer_id", cart.customer_id);
      sent++;
    } catch (err) {
      console.error("échec envoi relance panier:", err);
    }
  }

  return new Response(JSON.stringify({ checked: (carts || []).length, sent }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
