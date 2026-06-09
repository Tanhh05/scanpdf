import { z } from "zod";
import { sendTestEmail } from "../src/services/mail.service.js";

const recipient = z.email().parse(process.env.MAIL_TEST_TO);
const sent = await sendTestEmail(recipient);

if (!sent) {
  throw new Error("Mail chưa được cấu hình. Cần RESEND_API_KEY hoặc đầy đủ SMTP.");
}

console.log(`Test email sent to ${recipient}`);
