import "dotenv/config";

import express from "express";
import cors from "cors";

import { prisma } from "./prisma.js";

import authRouter from "./routes/auth.js";
import organizationsRouter from "./routes/organizations.js";
import usersRouter from "./routes/users.js";
import drugsRouter from "./routes/drugs.js";
import patientsRouter from "./routes/patients.js";
import suppliersRouter from "./routes/suppliers.js";
import transactionsRouter from "./routes/transactions.js";
import stockAdjustmentsRouter from "./routes/stock-adjustments.js";
import settingsRouter from "./routes/settings.js";
import dashboardRouter from "./routes/dashboard.js";
import auditLogsRouter from "./routes/audit-logs.js";
import stockReceivingRouter from "./routes/stock-receiving.js";
import accountRouter from "./routes/account.js";
import superAdminRouter from "./routes/super-admin.js";
import superAdminPlatformRouter from "./routes/super-admin-platform.js";

import { generalApiRateLimiter } from "./middleware/rateLimit.js";
import { securityHeaders } from "./middleware/security.js";
import invitationsRouter from "./routes/invitations.js";

import { verifyPassword } from "./services/auth.js";

const app = express();

const PORT = Number(process.env.API_PORT || 4000);

/* ============================================================
   CORS CONFIGURATION
   ============================================================

   Local development origins are always allowed.

   Production origins are supplied through:
     CORS_ORIGINS

   Example:
     CORS_ORIGINS=https://your-frontend.vercel.app

   Multiple origins may be separated by commas.
   ============================================================ */

const localOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3002",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const configuredOrigins = (
  process.env.CORS_ORIGINS || ""
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...localOrigins,
  ...configuredOrigins,
]);

/* ============================================================
   SECURITY HEADERS
   ============================================================ */

app.use(securityHeaders);

/* ============================================================
   CORS
   ============================================================ */

app.use(
  cors({
    origin: (origin, callback) => {
      /*
       * Requests without an Origin header include:
       * - server-to-server requests
       * - health checks
       * - some development tools
       *
       * These are allowed.
       */
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(
        new Error(
          `CORS blocked origin: ${origin}`,
        ),
      );
    },

    credentials: true,
  }),
);

/* ============================================================
   REQUEST BODY PARSING
   ============================================================ */

app.use(
  express.json({
    limit: "2mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "2mb",
  }),
);

/* ============================================================
   GENERAL API RATE LIMIT
   ============================================================ */

app.use(
  "/api",
  generalApiRateLimiter,
);

app.use(
  "/api/invitations",
  invitationsRouter,
);

/* ============================================================
   API ROOT
   ============================================================ */

app.get(
  "/api",
  (_request, response) => {
    response.json({
      success: true,
      message: "PharmaTrack API",
      version: "1.0.0",

      endpoints: {
        health: "/api/health",
        auth: "/api/auth",
        account: "/api/account",
        organizations: "/api/organizations",
        superAdmin: "/api/super-admin",
        users: "/api/users",
        drugs: "/api/drugs",
        patients: "/api/patients",
        suppliers: "/api/suppliers",
        transactions: "/api/transactions",
        stockAdjustments:
          "/api/stock-adjustments",
        stockReceiving:
          "/api/stock-receiving",
        settings: "/api/settings",
        dashboard: "/api/dashboard",
        auditLogs: "/api/audit-logs",
      },
    });
  },
);

/* ============================================================
   HEALTH CHECK
   ============================================================ */

app.get(
  "/api/health",
  async (_request, response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;

      response.json({
        success: true,
        message:
          "PharmaTrack API is running",
        database: "connected",
        timestamp:
          new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        "Database health check failed:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "API is running but database connection failed",
        database: "disconnected",
        timestamp:
          new Date().toISOString(),
      });
    }
  },
);

/* ============================================================
   TEMPORARY AUTHENTICATION DIAGNOSTIC
   ============================================================

   PURPOSE:
   This endpoint is temporary and is only being used to
   diagnose the current production login problem.

   It never returns:
   - the supplied password
   - the stored password hash
   - JWT_SECRET
   - DATABASE_URL
   - access tokens
   - refresh tokens

   It requires:
       AUTH_DIAGNOSTIC_KEY

   Vercel environment variable.

   Request:
       POST /api/diagnostics/auth

   Headers:
       x-diagnostic-key: <temporary diagnostic key>

   Body:
       {
         "email": "...",
         "password": "..."
       }

   IMPORTANT:
   Remove this endpoint after the production login problem
   has been identified.
   ============================================================ */

app.post(
  "/api/diagnostics/auth",
  async (request, response) => {
    const configuredDiagnosticKey =
      process.env.AUTH_DIAGNOSTIC_KEY;

    if (
      !configuredDiagnosticKey
    ) {
      response.status(404).json({
        success: false,
        message:
          "Diagnostic endpoint is not enabled.",
      });

      return;
    }

    const suppliedDiagnosticKey =
      request.header(
        "x-diagnostic-key",
      );

    if (
      !suppliedDiagnosticKey ||
      suppliedDiagnosticKey !==
        configuredDiagnosticKey
    ) {
      response.status(404).json({
        success: false,
        message:
          "Diagnostic endpoint is not available.",
      });

      return;
    }

    const {
      email,
      password,
    } = request.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      response.status(400).json({
        success: false,
        message:
          "Email and password are required.",
      });

      return;
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    try {
      const user =
        await prisma.user.findUnique({
          where: {
            email: normalizedEmail,
          },
          select: {
            id: true,
            email: true,
            role: true,
            isVerified: true,
            passwordHash: true,
          },
        });

      if (!user) {
        response.json({
          success: true,
          diagnostic: {
            userFound: false,
            passwordVerification:
              false,
          },
        });

        return;
      }

      const hashParts =
        user.passwordHash.split(":");

      const salt =
        hashParts[0] ?? "";

      const key =
        hashParts[1] ?? "";

      let passwordVerification =
        false;

      try {
        passwordVerification =
          verifyPassword(
            password,
            user.passwordHash,
          );
      } catch {
        passwordVerification =
          false;
      }

      const membershipCount =
        await prisma.organizationMembership.count(
          {
            where: {
              userId: user.id,
            },
          },
        );

      const activeMembershipCount =
        await prisma.organizationMembership.count(
          {
            where: {
              userId: user.id,
              organization: {
                status: "ACTIVE",
              },
            },
          },
        );

      response.json({
        success: true,

        diagnostic: {
          userFound: true,

          emailMatchesRequested:
            user.email ===
            normalizedEmail,

          role: user.role,

          isVerified:
            user.isVerified,

          passwordHash: {
            length:
              user.passwordHash.length,

            hasColon:
              hashParts.length === 2,

            saltLength:
              salt.length,

            keyLength:
              key.length,

            expectedScryptFormat:
              salt.length === 32 &&
              key.length === 128,
          },

          passwordVerification,

          membershipCount,

          activeMembershipCount,

          environment: {
            vercel:
              process.env.VERCEL === "1",
          },
        },
      });
    } catch (error) {
      console.error(
        "Authentication diagnostic failed:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Authentication diagnostic failed.",
      });
    }
  },
);

/* ============================================================
   AUTHENTICATION
   ============================================================ */

app.use(
  "/api/auth",
  authRouter,
);

/* ============================================================
   ACCOUNT
   ============================================================ */

app.use(
  "/api/account",
  accountRouter,
);

/* ============================================================
   ORGANIZATION CONTEXT
   ============================================================ */

app.use(
  "/api/organizations",
  organizationsRouter,
);

/* ============================================================
   SUPER ADMIN PLATFORM ROUTES
   ============================================================ */

app.use(
  "/api/super-admin",
  superAdminRouter,
);

app.use(
  "/api/super-admin",
  superAdminPlatformRouter,
);

/* ============================================================
   USER MANAGEMENT
   ============================================================ */

app.use(
  "/api/users",
  usersRouter,
);

/* ============================================================
   PHARMACY OPERATIONAL ROUTES
   ============================================================ */

app.use(
  "/api/drugs",
  drugsRouter,
);

app.use(
  "/api/patients",
  patientsRouter,
);

app.use(
  "/api/suppliers",
  suppliersRouter,
);

app.use(
  "/api/transactions",
  transactionsRouter,
);

app.use(
  "/api/stock-adjustments",
  stockAdjustmentsRouter,
);

/* ============================================================
   STOCK RECEIVING
   ============================================================ */

app.use(
  "/api/stock-receiving",
  stockReceivingRouter,
);

/* ============================================================
   SETTINGS
   ============================================================ */

app.use(
  "/api/settings",
  settingsRouter,
);

/* ============================================================
   DASHBOARD
   ============================================================ */

app.use(
  "/api/dashboard",
  dashboardRouter,
);

/* ============================================================
   AUDIT LOGS
   ============================================================ */

app.use(
  "/api/audit-logs",
  auditLogsRouter,
);

/* ============================================================
   API 404 HANDLER
   ============================================================ */

app.use(
  "/api",
  (
    _request,
    response,
  ) => {
    response.status(404).json({
      success: false,
      message:
        "API endpoint not found",
    });
  },
);

/* ============================================================
   GLOBAL ERROR HANDLER
   ============================================================ */

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(
      "Unhandled API error:",
      error,
    );

    if (
      error instanceof Error &&
      error.message.startsWith(
        "CORS blocked",
      )
    ) {
      response.status(403).json({
        success: false,
        message:
          error.message,
      });

      return;
    }

    response.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  },
);

/* ============================================================
   VERCEL / SERVERLESS EXPORT
   ============================================================ */

export { app };

export default app;

/* ============================================================
   LOCAL SERVER
   ============================================================

   Vercel imports the Express application and handles the
   serverless lifecycle itself.

   Local development still uses the existing:
       npm run server

   command and listens on API_PORT / 4000.
   ============================================================ */

if (!process.env.VERCEL) {
  const server = app.listen(
    PORT,
    () => {
      console.log("");

      console.log(
        "==========================================",
      );

      console.log(
        "       PharmaTrack API Server",
      );

      console.log(
        "==========================================",
      );

      console.log(
        `API:              http://localhost:${PORT}/api`,
      );

      console.log(
        `Health:           http://localhost:${PORT}/api/health`,
      );

      console.log(
        `Auth:             http://localhost:${PORT}/api/auth`,
      );

      console.log(
        `Account:          http://localhost:${PORT}/api/account`,
      );

      console.log(
        `Organizations:    http://localhost:${PORT}/api/organizations`,
      );

      console.log(
        `Super Admin:      http://localhost:${PORT}/api/super-admin`,
      );

      console.log(
        `Users:             http://localhost:${PORT}/api/users`,
      );

      console.log(
        `Drugs:             http://localhost:${PORT}/api/drugs`,
      );

      console.log(
        `Patients:          http://localhost:${PORT}/api/patients`,
      );

      console.log(
        `Suppliers:         http://localhost:${PORT}/api/suppliers`,
      );

      console.log(
        `Transactions:      http://localhost:${PORT}/api/transactions`,
      );

      console.log(
        `Stock Adjustments: http://localhost:${PORT}/api/stock-adjustments`,
      );

      console.log(
        `Stock Receiving:   http://localhost:${PORT}/api/stock-receiving`,
      );

      console.log(
        `Settings:          http://localhost:${PORT}/api/settings`,
      );

      console.log(
        `Dashboard:         http://localhost:${PORT}/api/dashboard`,
      );

      console.log(
        `Audit Logs:        http://localhost:${PORT}/api/audit-logs`,
      );

      console.log(
        "==========================================",
      );

      console.log("");
    },
  );

  /* ============================================================
     LOCAL SERVER ERROR HANDLING
     ============================================================ */

  server.on(
    "error",
    (
      error: NodeJS.ErrnoException,
    ) => {
      if (
        error.code ===
        "EADDRINUSE"
      ) {
        console.error("");

        console.error(
          `ERROR: Port ${PORT} is already being used.`,
        );

        console.error(
          "Stop the existing PharmaTrack server before starting another one.",
        );

        console.error("");

        process.exit(1);
      }

      console.error(
        "Server error:",
        error,
      );

      process.exit(1);
    },
  );

  /* ============================================================
     GRACEFUL LOCAL SHUTDOWN
     ============================================================ */

  let shuttingDown = false;

  const shutdown = async (
    signal: string,
  ) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    console.log("");

    console.log(
      `Received ${signal}. Shutting down PharmaTrack API...`,
    );

    server.close(
      async () => {
        try {
          await prisma.$disconnect();

          console.log(
            "Database connection closed.",
          );

          console.log(
            "PharmaTrack API stopped.",
          );

          process.exit(0);
        } catch (error) {
          console.error(
            "Error while disconnecting Prisma:",
            error,
          );

          process.exit(1);
        }
      },
    );
  };

  process.on(
    "SIGINT",
    () => {
      void shutdown("SIGINT");
    },
  );

  process.on(
    "SIGTERM",
    () => {
      void shutdown("SIGTERM");
    },
  );
}