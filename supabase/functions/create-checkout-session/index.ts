// ============================================================
// KEMETED SAVEUR — création dynamique d'une session Stripe Checkout
// à partir d'un panier (plusieurs produits, quantités variables).
// Les prix viennent uniquement du catalogue ci-dessous, jamais du
// client, pour ne pas pouvoir être manipulés.
// ============================================================
import Stripe from "npm:stripe@17.4.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// miroir de project/pop/pop-products.js — source de vérité côté serveur
const CATALOG: Record<string, { name: string; price: number; priceB2B: number; stockId?: string }> = {
  bissap: { name: "Bissap", price: 450, priceB2B: 383 },
  blanc: { name: "Bissap Blanc", price: 450, priceB2B: 383 },
  ditakh: { name: "Ditakh", price: 490, priceB2B: 417 },
  bouye: { name: "Bouye", price: 490, priceB2B: 417 },
  donut: { name: "Donuts fourrés à la gelée de bissap", price: 390, priceB2B: 332 },
  bonbon: { name: "Bonbons gélatine cœurs bouye", price: 490, priceB2B: 417 },
  pate: { name: "Pâtes de fruits ditakh", price: 450, priceB2B: 383 },
  coffret: { name: "Coffret Découverte — Lancement (3 jus + pass tombola)", price: 1000, priceB2B: 1000, stockId: "coffret-decouverte" },
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const body = await req.json();
    const items: { id: string; qty: number }[] = Array.isArray(body.items) ? body.items : [];
    const successUrl: string = body.success_url;
    const cancelUrl: string = body.cancel_url;
    const clientReferenceId: string | undefined = body.client_reference_id || undefined;
    const email: string | undefined = body.email || undefined;

    if (!items.length || !successUrl || !cancelUrl) {
      return json({ error: "items, success_url et cancel_url requis" }, 400);
    }

    let tier = "b2c";
    if (clientReferenceId) {
      const { data } = await supabase
        .from("customers")
        .select("tier")
        .eq("id", clientReferenceId)
        .maybeSingle();
      if (data?.tier === "b2b") tier = "b2b";
    }

    const line_items = [];
    const promoQty: Record<string, number> = {};

    for (const item of items) {
      const p = CATALOG[item.id];
      if (!p) continue;
      const qty = Math.max(1, Math.min(50, Math.floor(Number(item.qty)) || 1));

      // articles à stock limité (coffret de lancement) : on vérifie le
      // stock restant avant de laisser passer la commande
      if (p.stockId) {
        const { data: stock } = await supabase
          .from("promo_stock")
          .select("remaining")
          .eq("id", p.stockId)
          .maybeSingle();
        if (!stock || stock.remaining < qty) {
          return json({ error: "stock épuisé pour « " + p.name + " »" }, 409);
        }
        promoQty[p.stockId] = (promoQty[p.stockId] || 0) + qty;
      }

      const unitAmount = tier === "b2b" ? p.priceB2B : p.price;
      line_items.push({
        price_data: {
          currency: "eur",
          product_data: { name: "Kemeted Saveur — " + p.name },
          unit_amount: unitAmount,
        },
        quantity: qty,
      });
    }

    if (!line_items.length) return json({ error: "aucun article valide" }, 400);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: clientReferenceId,
      customer_email: email,
      metadata: { promo_stock: JSON.stringify(promoQty) },
    });

    return json({ url: session.url });
  } catch (err) {
    console.error(err);
    return json({ error: String(err) }, 500);
  }
});
