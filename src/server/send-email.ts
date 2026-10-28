import "server-only";
import { Resend } from "resend";

const RESEND_SECRET = process.env.RESEND_KEY!;
const resend = new Resend(RESEND_SECRET);

export async function sendEmail({
  emailAddress,
  messageBody,
  emailSubject,
}: {
  emailAddress: string;
  messageBody: string;
  emailSubject: string;
}) {
  resend.emails.send({
    from: "onboarding@resend.dev",
    to: emailAddress,
    subject: emailSubject,
    html: messageBody,
  });
}
