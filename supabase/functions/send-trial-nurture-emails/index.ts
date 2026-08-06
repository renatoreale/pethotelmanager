import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MID_TRIAL_DAY = 7;
const EXPIRING_WINDOW_DAYS = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

async function sendEmail(to: string, subject: string, html: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@pethotelmanager.com";
  if (!resendKey) throw new Error("RESEND_API_KEY non configurata");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `PetHotelManager <${fromEmail}>`,
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error("Resend error: " + err);
  }
}

function midTrialEmailHtml(firstName: string, loginUrl: string): string {
  const greeting = firstName ? `Ciao ${firstName},` : "Ciao,";
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
      <h2 style="color:#c45a12;margin:0 0 24px;">PetHotelManager</h2>
      <p>${greeting}</p>
      <p>Sei a metà della tua prova gratuita e non ti abbiamo ancora visto entrare a provare il gestionale.</p>
      <p>Bastano 2 minuti per capire se fa al caso tuo: entra e crea la tua prima prenotazione di prova, così vedi subito come funziona il calendario e il preventivo automatico.</p>
      <a href="${loginUrl}"
         style="display:inline-block;margin:24px 0;padding:14px 32px;background:#c45a12;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;">
        Accedi e provalo ora
      </a>
      <p style="color:#555;font-size:14px;">
        Se hai domande o qualcosa non è chiaro, rispondi pure a questa email — ti rispondo io direttamente.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
      <p style="color:#999;font-size:12px;">PetHotelManager — Il gestionale per la tua pensione per animali</p>
    </div>
  `;
}

function expiringEmailHtml(firstName: string, loginUrl: string, daysLeft: number): string {
  const greeting = firstName ? `Ciao ${firstName},` : "Ciao,";
  const daysText = daysLeft <= 0
    ? "La tua prova gratuita scade oggi."
    : `Ti restano solo ${daysLeft} giorn${daysLeft === 1 ? "o" : "i"} di prova gratuita.`;
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
      <h2 style="color:#c45a12;margin:0 0 24px;">PetHotelManager</h2>
      <p>${greeting}</p>
      <p>${daysText} Dopo la scadenza perderai l'accesso ai dati che hai inserito, a meno di attivare un piano.</p>
      <p>Se ti sta tornando utile, attiva ora il tuo piano senza interrompere il lavoro fatto finora.</p>
      <a href="${loginUrl}"
         style="display:inline-block;margin:24px 0;padding:14px 32px;background:#c45a12;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;">
        Accedi e attiva il tuo piano
      </a>
      <p style="color:#555;font-size:14px;">
        Hai dubbi sul piano più adatto a te? Rispondi a questa email, ti aiuto a scegliere.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
      <p style="color:#999;font-size:12px;">PetHotelManager — Il gestionale per la tua pensione per animali</p>
    </div>
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const siteUrl = Deno.env.get("SITE_URL") || "https://pethotelmanager.com";
    const loginUrl = `${siteUrl}/login`;
    const now = new Date();

    const { data: trials, error: trialsError } = await supabaseAdmin
      .from("trial_registrations")
      .select("id, user_id, email, full_name, trial_start, trial_end, mid_trial_email_sent_at, expiring_email_sent_at")
      .eq("is_converted", false)
      .gt("trial_end", now.toISOString());

    if (trialsError) throw trialsError;

    let midSent = 0;
    let expiringSent = 0;
    const errors: { trial_id: string; error: string }[] = [];

    for (const t of trials || []) {
      const firstName = (t.full_name || "").trim().split(/\s+/)[0] || "";
      const trialStart = new Date(t.trial_start);
      const trialEnd = new Date(t.trial_end);
      const daysSinceStart = (now.getTime() - trialStart.getTime()) / MS_PER_DAY;
      const daysUntilEnd = (trialEnd.getTime() - now.getTime()) / MS_PER_DAY;

      try {
        // Day 7+ nudge: only if they've never created a booking/preventivo (real usage signal)
        if (!t.mid_trial_email_sent_at && daysSinceStart >= MID_TRIAL_DAY) {
          const { count, error: countError } = await supabaseAdmin
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("created_by", t.user_id);
          if (countError) throw countError;

          if (!count) {
            await sendEmail(t.email, "Come sta andando la tua prova? — PetHotelManager", midTrialEmailHtml(firstName, loginUrl));
            const { error: updateError } = await supabaseAdmin
              .from("trial_registrations")
              .update({ mid_trial_email_sent_at: now.toISOString() })
              .eq("id", t.id);
            if (updateError) throw updateError;
            midSent++;
          }
        }

        // Expiring nudge: last EXPIRING_WINDOW_DAYS days of the trial, regardless of usage
        if (!t.expiring_email_sent_at && daysUntilEnd <= EXPIRING_WINDOW_DAYS) {
          const daysLeft = Math.max(0, Math.ceil(daysUntilEnd));
          await sendEmail(t.email, "La tua prova gratuita sta per scadere — PetHotelManager", expiringEmailHtml(firstName, loginUrl, daysLeft));
          const { error: updateError } = await supabaseAdmin
            .from("trial_registrations")
            .update({ expiring_email_sent_at: now.toISOString() })
            .eq("id", t.id);
          if (updateError) throw updateError;
          expiringSent++;
        }
      } catch (perTrialError) {
        console.error(`[send-trial-nurture-emails] Error for trial ${t.id}:`, perTrialError);
        errors.push({ trial_id: t.id, error: (perTrialError as Error).message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, checked: trials?.length || 0, midSent, expiringSent, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("send-trial-nurture-emails error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
