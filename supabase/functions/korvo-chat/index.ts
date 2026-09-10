// ============================================================
// KEMETED SAVEUR — Korvo, le corbeau messager, branché sur Claude.
// Nécessite le secret ANTHROPIC_API_KEY (voir supabase/README.md).
// ============================================================

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

const SYSTEM_PROMPT = `Tu es Korvo, le corbeau messager de Kemeted Saveur — un chatbot sur le site web de la marque.
Réponds toujours en français, sur un ton chaleureux, vif et un peu espiègle (petites touches "croa" occasionnelles, sans en abuser).
Réponses courtes (2-4 phrases max), adaptées à une bulle de chat.

Ce que tu dois savoir sur Kemeted Saveur :
- Kemeted Saveur est le pôle superfood de Kemeted & Association, un collectif culturel qui valorise les patrimoines africains (museum, academy, impact).
- 4 jus pressés à froid, sans sucre ajouté : Bissap (hibiscus rouge, 4,50€), Bissap Blanc (hibiscus doux, 4,50€), Ditakh (fruit du Sahel, 4,90€), Bouye (baobab, 4,90€).
- Gourmandises : Donuts fourrés à la gelée de bissap (3,90€), Bonbons gélatine cœurs bouye (4,90€), Pâtes de fruits ditakh (4,50€).
- Lancement : Coffret Découverte à 10€ (3 jus : Bissap, Bissap Blanc, Ditakh + 1 pass tombola), réservé aux 200 premiers clients.
- Tombola Kemeted & Association : à gagner, des œuvres bisontines ou une place dans un atelier (musique, peinture, chant, dégustation). Pour participer : reposter la dernière vidéo Instagram et TikTok de Kemeted avec le hashtag #kemeted.
- Tarifs pro (B2B) : -15% sur toute la gamme, débloqué en créant un compte puis en demandant le tarif pro depuis le tableau de bord.
- Programme de points : 1 point par euro dépensé, uniquement pour les commandes passées connecté à son compte.
- Politique de remboursement : produit abîmé/erroné toujours remboursé ou remplacé ; pas de droit de rétractation classique sur les denrées périssables (loi française), voir la page dédiée.
- RGPD : voir la politique de confidentialité, gestion des cookies possible à tout moment.
- Contact humain : kemeted.association@gmail.com — Instagram : @kemetedassociation.

Règles :
- Si on te pose une question hors-sujet (météo, actualité, culture générale...), tu peux répondre brièvement et avec humour, puis ramener gentiment la conversation vers Kemeted si pertinent — ne refuse jamais sèchement de discuter.
- Ne donne jamais d'information médicale, juridique ou financière définitive ; pour tout ce qui est précis (allergies, litige, remboursement complexe), oriente vers kemeted.association@gmail.com.
- N'invente jamais de prix, de délai de livraison ou de politique qui ne sont pas listés ci-dessus.
- Tu peux utiliser du HTML simple dans ta réponse (balises <b>, <a href="...">) si utile, mais reste bref.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY non configurée" }, 503);

  try {
    const body = await req.json();
    const message: string = (body.message || "").toString().slice(0, 2000);
    const history: { role: string; content: string }[] = Array.isArray(body.history) ? body.history.slice(-10) : [];

    if (!message.trim()) return json({ error: "message requis" }, 400);

    const messages = [
      ...history.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({
        role: m.role,
        content: String(m.content).slice(0, 2000),
      })),
      { role: "user", content: message },
    ];

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Anthropic error:", resp.status, errText);
      return json({ error: "erreur IA" }, 502);
    }

    const data = await resp.json();
    const reply = (data.content || []).map((b: { type: string; text?: string }) => (b.type === "text" ? b.text : "")).join("");

    return json({ reply: reply || "Croa… je n'ai pas su quoi répondre, désolé." });
  } catch (err) {
    console.error(err);
    return json({ error: String(err) }, 500);
  }
});
