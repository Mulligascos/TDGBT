// supabase/functions/send-club-email/index.ts
// Deploy with: supabase functions deploy send-club-email
//
// Required environment variables (set in Supabase dashboard → Settings → Edge Functions):
//   SENDGRID_API_KEY   — your SendGrid API key
//   FROM_EMAIL         — verified sender address e.g. noreply@yourclub.com
//   FROM_NAME          — e.g. "Tauranga Disc Golf"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { subject, body, recipients } = await req.json();
    // recipients = [{ email: "...", name: "..." }, ...]

    if (!subject || !body || !recipients?.length) {
      return new Response(JSON.stringify({ error: "Missing subject, body or recipients" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    const FROM_EMAIL       = Deno.env.get("FROM_EMAIL") || "noreply@club.com";
    const FROM_NAME        = Deno.env.get("FROM_NAME")  || "Disc Golf Club";

    if (!SENDGRID_API_KEY) {
      return new Response(JSON.stringify({ error: "SENDGRID_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Send one email with all recipients as personalizations (BCC-style, each gets own email)
    // Split into batches of 100 (SendGrid limit per request)
    const batchSize = 100;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const payload = {
        personalizations: batch.map((r: { email: string; name: string }) => ({
          to: [{ email: r.email, name: r.name }],
        })),
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        content: [
          {
            type: "text/html",
            value: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #0d4a1a; padding: 16px 20px; border-radius: 10px 10px 0 0;">
                  <h2 style="color: #4ade80; margin: 0; font-size: 18px;">${FROM_NAME}</h2>
                </div>
                <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
                  <h3 style="color: #111827; margin-top: 0;">${subject}</h3>
                  <div style="color: #374151; line-height: 1.6; white-space: pre-wrap;">${body}</div>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    You received this message because you are a member of ${FROM_NAME}.
                  </p>
                </div>
              </div>
            `,
          },
        ],
      };

      const res = await fetch(SENDGRID_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok || res.status === 202) {
        sent += batch.length;
      } else {
        const err = await res.text();
        console.error("SendGrid error:", err);
        failed += batch.length;
      }
    }

    return new Response(JSON.stringify({ sent, failed }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
