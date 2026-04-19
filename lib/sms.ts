import twilio from "twilio";

export async function sendSMS(to: string, message: string) {
  if (process.env.NODE_ENV !== 'production' && !process.env.TWILIO_SID) {
    console.log(`\n[MOCK SMS SEND LOG]\nTo: ${to}\nMessage: ${message}\n`);
    return true;
  }
  
  if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn("SMS Integration missing Twilio Credentials");
    return false;
  }

  try {
    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER || 'LAKSHAN',
      to: to,
    });
    return true;
  } catch (err) {
    console.error("SMS Failed:", err);
    return false;
  }
}
