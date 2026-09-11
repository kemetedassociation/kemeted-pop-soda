// Petit client Resend partagé par les fonctions d'emailing.
export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY non configurée");
  const from = Deno.env.get("RESEND_FROM") || "Kemeted Saveur <onboarding@resend.dev>";

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Resend error ${resp.status}: ${text}`);
  }
  return resp.json();
}

export function emailShell(bodyHtml: string) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#FCEBDD;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#2A1A14">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px">
    <div style="text-align:center;margin-bottom:24px">
      <span style="font-size:22px;font-weight:700;color:#7A1F38">🐦‍⬛ Kemeted Saveur</span>
    </div>
    <div style="background:#ffffff;border-radius:20px;padding:32px 28px">
      ${bodyHtml}
    </div>
    <p style="text-align:center;font-size:12px;color:#8a7166;margin-top:24px">
      Kemeted &amp; Association — Bois vivant.<br>
      <a href="mailto:kemeted.association@gmail.com" style="color:#7A1F38">kemeted.association@gmail.com</a>
    </p>
  </div>
</body>
</html>`;
}

// miroir minimal de project/pop/pop-products.js, pour composer les emails
export const PRODUCT_NAMES: Record<string, string> = {
  bissap: "Bissap",
  blanc: "Bissap Blanc",
  ditakh: "Ditakh",
  bouye: "Bouye",
  donut: "Donuts fourrés à la gelée de bissap",
  bonbon: "Bonbons gélatine cœurs bouye",
  pate: "Pâtes de fruits ditakh",
  coffret: "Coffret Découverte — Lancement",
};
