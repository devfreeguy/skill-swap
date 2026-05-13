import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.SMTP_HOST) {
    console.log("SMTP not configured — skipping email");
    return;
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "noreply@skillswap.app",
    to,
    subject,
    html,
  });
}
