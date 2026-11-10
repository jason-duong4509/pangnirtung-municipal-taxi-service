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
  try {
    const { error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: emailAddress,
      subject: emailSubject,
      html: messageBody,
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (e) {
    if (e instanceof Error) {
      throw e;
    }
  }
}
