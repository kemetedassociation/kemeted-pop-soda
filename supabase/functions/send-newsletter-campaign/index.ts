// ============================================================
// KEMETED SAVEUR — envoi d'une campagne (nouveauté, lancement...) à
// tous les abonnés newsletter. Déclenchement MANUEL uniquement (voir
// supabase/README.md) — jamais appelée depuis le site public.
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, emailShell } from "../_shared/resend.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const FUNCTIONS_URL = Deno.env.get("SUPABASE_URL")! + "/functions/v1";

Deno.serve(async (req) => {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== Deno.env.get("ADMIN_SECRET")) {
    return new Response("unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const subject: string = body.subject;
    const message: string = body.message; // texte ou HTML simple du corps du message
    if (!subject || !message) {
      return new Response(JSON.stringify({ error: "subject et message requis" }), { status: 400 });
    }

    const { data: subs, error } = await supabase
      .from("subscribers")
      .select("id, email")
      .is("unsubscribed_at", null);

    if (error) throw error;

    let sent = 0;
    const failures: string[] = [];
    for (const sub of subs || []) {
      const html = emailShell(`
        ${message}
        <p style="font-size:11px;color:#8a7166;margin-top:28px">
          Tu reçois cet email car tu es inscrit·e à la newsletter Kemeted Saveur.
          <a href="${FUNCTIONS_URL}/unsubscribe?id=${sub.id}" style="color:#8a7166">Se désinscrire</a>
        </p>
      `);
      try {
        await sendEmail({ to: sub.email, subject, html });
        sent++;
      } catch (err) {
        console.error("échec envoi à", sub.email, err);
        failures.push(sub.email);
      }
    }

    return new Response(JSON.stringify({ total: (subs || []).length, sent, failures }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
