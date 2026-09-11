// ============================================================
// KEMETED SAVEUR — lien de désinscription newsletter (clic direct
// depuis l'email, pas d'authentification requise).
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function page(message: string) {
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#FCEBDD;color:#2A1A14;display:grid;place-items:center;height:100vh;margin:0">
    <div style="text-align:center;max-width:400px;padding:24px">
      <p style="font-size:22px;font-weight:700;color:#7A1F38">🐦‍⬛ Kemeted Saveur</p>
      <p style="font-size:15px">${message}</p>
    </div>
  </body></html>`;
}

Deno.serve(async (req) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return new Response(page("Lien de désinscription invalide."), { status: 400, headers: { "Content-Type": "text/html" } });
  }

  await supabase.from("subscribers").update({ unsubscribed_at: new Date().toISOString() }).eq("id", id);

  return new Response(page("Tu es désinscrit·e de la newsletter. Croa, à bientôt peut-être ! 🐦‍⬛"), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
});
