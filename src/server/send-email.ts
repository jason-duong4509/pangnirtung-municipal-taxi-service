import "server-only";
import { Resend } from "resend";

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
    const resend = new Resend(process.env.RESEND_KEY!);
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
    throw e instanceof Error ? e : new Error(`${e}`);
  }
}
