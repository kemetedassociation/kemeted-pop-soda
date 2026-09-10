// ============================================================
// KEMETED SAVEUR — webhook Stripe → crédit de points fidélité
// Déployée en Supabase Edge Function. Voir supabase/README.md
// pour les instructions de déploiement et de configuration.
// ============================================================
import Stripe from "npm:stripe@17.4.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// 1 point par euro dépensé — ajuste cette valeur si besoin
const POINTS_PER_EURO = 1;

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      webhookSecret,
    );
  } catch (err) {
    console.error("signature invalide:", err);
    return new Response(`Webhook signature invalide: ${err}`, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response("ignored", { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const email = session.customer_details?.email ?? session.customer_email ?? "";
  const amountTotal = session.amount_total ?? 0;

  // on privilégie client_reference_id (posé par le site quand l'acheteur
  // est connecté), sinon on retrouve le client par email
  let customerId: string | null = session.client_reference_id || null;
  if (!customerId && email) {
    const { data } = await supabase
      .from("customers")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    customerId = data?.id ?? null;
  }

  const pointsEarned = customerId
    ? Math.floor((amountTotal / 100) * POINTS_PER_EURO)
    : 0;

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      customer_id: customerId,
      stripe_session_id: session.id,
      email,
      amount_total: amountTotal,
      currency: session.currency ?? "eur",
      points_earned: pointsEarned,
    })
    .select()
    .single();

  if (orderErr) {
    // contrainte unique sur stripe_session_id -> webhook déjà traité (Stripe
    // peut renvoyer le même événement plusieurs fois), on l'ignore sans erreur
    console.log("commande déjà enregistrée ou erreur:", orderErr.message);
    return new Response("ok", { status: 200 });
  }

  if (customerId && pointsEarned > 0) {
    await supabase.from("point_transactions").insert({
      customer_id: customerId,
      delta: pointsEarned,
      reason: "Achat — session " + session.id,
      order_id: order.id,
    });
    await supabase.rpc("increment_points", {
      p_customer_id: customerId,
      p_delta: pointsEarned,
    });
  }

  // décrémente le stock des articles limités (ex. coffret de lancement),
  // posé en metadata par create-checkout-session au moment de la commande
  try {
    const promoStock = JSON.parse(session.metadata?.promo_stock || "{}") as Record<string, number>;
    for (const [stockId, qty] of Object.entries(promoStock)) {
      if (qty > 0) await supabase.rpc("decrement_stock", { p_id: stockId, p_qty: qty });
    }
  } catch (err) {
    console.error("décrément stock échoué:", err);
  }

  return new Response("ok", { status: 200 });
});
