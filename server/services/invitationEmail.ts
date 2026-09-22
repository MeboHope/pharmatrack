import { Resend } from "resend";

export type InvitationRole = "ADMIN" | "PHARMACIST" | "CLINICIAN";

interface SendInvitationEmailInput {
  to: string;
  recipientName: string;
  organizationName: string;
  role: InvitationRole;
  invitationToken: string;
  expiresAt: Date;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatRole(role: InvitationRole): string {
  switch (role) {
    case "ADMIN":
      return "Administrator";

    case "PHARMACIST":
      return "Pharmacist";

    case "CLINICIAN":
      return "Clinician";
  }
}

export async function sendInvitationEmail(
  input: SendInvitationEmailInput,
): Promise<void> {
  const resendApiKey = getRequiredEnv("RESEND_API_KEY");
  const emailFrom = getRequiredEnv("EMAIL_FROM");
  const appUrl =
    process.env.APP_URL || "http://localhost:3000";

  const resend = new Resend(resendApiKey);

  const invitationUrl =
    `${appUrl.replace(/\/$/, "")}/accept-invitation?token=` +
    encodeURIComponent(input.invitationToken);

  const recipientName = escapeHtml(input.recipientName);
  const organizationName = escapeHtml(
    input.organizationName,
  );
  const roleName = escapeHtml(
    formatRole(input.role),
  );

  const expiryText =
    input.expiresAt.toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <title>PharmaTrack Invitation</title>
      </head>

      <body
        style="
          margin: 0;
          padding: 0;
          background: #f1f5f9;
          font-family: Arial, Helvetica, sans-serif;
          color: #0f172a;
        "
      >
        <div style="padding: 40px 16px;">
          <div
            style="
              max-width: 620px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
            "
          >
            <div
              style="
                background: #22577a;
                padding: 28px 32px;
                color: #ffffff;
              "
            >
              <h1
                style="
                  margin: 0;
                  font-size: 26px;
                  line-height: 1.2;
                "
              >
                PharmaTrack
              </h1>

              <p
                style="
                  margin: 8px 0 0;
                  font-size: 14px;
                  opacity: 0.9;
                "
              >
                Pharmacy &amp; Clinic Management Platform
              </p>
            </div>

            <div style="padding: 32px;">
              <p
                style="
                  margin: 0 0 18px;
                  font-size: 16px;
                "
              >
                Hello ${recipientName},
              </p>

              <p
                style="
                  margin: 0 0 18px;
                  font-size: 16px;
                  line-height: 1.6;
                "
              >
                You have been invited to join
                <strong>${organizationName}</strong>
                on PharmaTrack.
              </p>

              <div
                style="
                  background: #f8fafc;
                  border: 1px solid #e2e8f0;
                  border-radius: 12px;
                  padding: 18px;
                  margin: 24px 0;
                "
              >
                <p
                  style="
                    margin: 0 0 8px;
                    font-size: 14px;
                  "
                >
                  <strong>Organization:</strong>
                  ${organizationName}
                </p>

                <p
                  style="
                    margin: 0;
                    font-size: 14px;
                  "
                >
                  <strong>Role:</strong>
                  ${roleName}
                </p>
              </div>

              <p
                style="
                  margin: 0 0 24px;
                  font-size: 15px;
                  line-height: 1.6;
                  color: #475569;
                "
              >
                Click the button below to accept the invitation
                and create your PharmaTrack account password.
              </p>

              <div
                style="
                  text-align: center;
                  margin: 30px 0;
                "
              >
                <a
                  href="${invitationUrl}"
                  style="
                    display: inline-block;
                    background: #22577a;
                    color: #ffffff;
                    text-decoration: none;
                    padding: 14px 24px;
                    border-radius: 10px;
                    font-weight: 700;
                    font-size: 15px;
                  "
                >
                  Accept Invitation
                </a>
              </div>

              <p
                style="
                  margin: 0 0 10px;
                  font-size: 13px;
                  line-height: 1.5;
                  color: #64748b;
                "
              >
                This invitation expires on
                ${escapeHtml(expiryText)}.
              </p>

              <p
                style="
                  margin: 0;
                  font-size: 13px;
                  line-height: 1.5;
                  color: #64748b;
                "
              >
                If you were not expecting this invitation,
                you can safely ignore this email.
              </p>
            </div>

            <div
              style="
                border-top: 1px solid #e2e8f0;
                padding: 20px 32px;
                color: #64748b;
                font-size: 12px;
                line-height: 1.5;
              "
            >
              This is an automated message from PharmaTrack.
              Please do not reply directly to this email.
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const result = await resend.emails.send({
    from: emailFrom,
    to: [input.to],
    subject:
      `You're invited to join ${input.organizationName} on PharmaTrack`,
    html,
  });

  if (result.error) {
    throw new Error(
      result.error.message ||
        "Failed to send invitation email.",
    );
  }
}