/**
 * Sends a WhatsApp text message via Blueticks (blueticks.co).
 * Unlike Twilio's WhatsApp Business Platform, Blueticks sends free-form text
 * directly — no pre-approved Meta message template required.
 */
export async function sendWhatsApp(to: string, message: string) {
  if (process.env.NODE_ENV !== 'production' && !process.env.BLUETICKS_API_KEY) {
    console.log(`\n[MOCK WHATSAPP SEND LOG]\nTo: ${to}\nMessage: ${message}\n`);
    return true;
  }

  const apiKey = process.env.BLUETICKS_API_KEY;
  if (!apiKey) {
    console.warn("WhatsApp integration missing BLUETICKS_API_KEY");
    return false;
  }

  try {
    const res = await fetch(`https://api.blueticks.co/v1/scheduled-messages/${encodeURIComponent(to)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "text", text: message }),
    });

    if (!res.ok) {
      console.error("WhatsApp send failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("WhatsApp send failed:", err);
    return false;
  }
}
