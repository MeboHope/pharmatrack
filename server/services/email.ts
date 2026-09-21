import { Resend } from "resend";

const RESEND_API_KEY =
  process.env.RESEND_API_KEY;

const EMAIL_FROM =
  process.env.EMAIL_FROM;

if (!RESEND_API_KEY) {
  throw new Error(
    "RESEND_API_KEY must be configured.",
  );
}

if (!EMAIL_FROM) {
  throw new Error(
    "EMAIL_FROM must be configured.",
  );
}

const resend =
  new Resend(RESEND_API_KEY);

const escapeHtml = (
  value: string,
): string => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const sendVerificationEmail =
  async ({
    to,
    name,
    code,
    expiresInMinutes = 15,
  }: {
    to: string;
    name: string;
    code: string;
    expiresInMinutes?: number;
  }) => {
    const safeName =
      escapeHtml(name);

    const result =
      await resend.emails.send({
        from: EMAIL_FROM,
        to: [to],
        subject:
          "Verify your PharmaTrack account",
        html: `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
              />
              <title>
                Verify your PharmaTrack account
              </title>
            </head>

            <body
              style="
                margin: 0;
                padding: 0;
                background: #f8fafc;
                font-family: Arial, Helvetica, sans-serif;
                color: #0f172a;
              "
            >
              <div
                style="
                  max-width: 600px;
                  margin: 40px auto;
                  padding: 24px;
                "
              >
                <div
                  style="
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 32px;
                  "
                >
                  <div
                    style="
                      text-align: center;
                      margin-bottom: 24px;
                    "
                  >
                    <h1
                      style="
                        margin: 0;
                        color: #22577a;
                        font-size: 24px;
                      "
                    >
                      PharmaTrack
                    </h1>
                  </div>

                  <p
                    style="
                      font-size: 16px;
                      line-height: 1.6;
                    "
                  >
                    Hello ${safeName},
                  </p>

                  <p
                    style="
                      font-size: 15px;
                      line-height: 1.6;
                      color: #475569;
                    "
                  >
                    Thank you for creating your
                    PharmaTrack account. Please use
                    the verification code below to
                    confirm ownership of your email
                    address.
                  </p>

                  <div
                    style="
                      margin: 28px 0;
                      padding: 20px;
                      background: #f1f5f9;
                      border-radius: 12px;
                      text-align: center;
                    "
                  >
                    <div
                      style="
                        font-size: 12px;
                        color: #64748b;
                        margin-bottom: 8px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                      "
                    >
                      Verification Code
                    </div>

                    <div
                      style="
                        font-size: 32px;
                        font-weight: 700;
                        letter-spacing: 8px;
                        color: #22577a;
                      "
                    >
                      ${code}
                    </div>
                  </div>

                  <p
                    style="
                      font-size: 14px;
                      line-height: 1.6;
                      color: #64748b;
                    "
                  >
                    This code expires in
                    ${expiresInMinutes} minutes.
                    If you did not create a
                    PharmaTrack account, you can
                    safely ignore this email.
                  </p>

                  <hr
                    style="
                      border: 0;
                      border-top: 1px solid #e2e8f0;
                      margin: 28px 0;
                    "
                  />

                  <p
                    style="
                      margin: 0;
                      font-size: 12px;
                      line-height: 1.5;
                      color: #94a3b8;
                      text-align: center;
                    "
                  >
                    PharmaTrack secure account
                    verification
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

    if (result.error) {
      console.error(
        "Resend email error:",
        result.error,
      );

      throw new Error(
        "Unable to send the verification email.",
      );
    }

    return result.data;
  };

export default sendVerificationEmail;