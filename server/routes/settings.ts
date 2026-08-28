import { Router } from "express";

import { prisma } from "../prisma.js";
import {
authenticate,
type AuthenticatedRequest,
} from "../middleware/auth.js";
import { recordAudit } from "../middleware/audit.js";

const router = Router();

router.use(authenticate);

const canManageSettings = (
request: AuthenticatedRequest,
): boolean => {
const role = request.auth?.role;

return role === "ADMIN" || role === "PHARMACIST";
};

const normalizeSettings = (settings: {
id: string;
pharmacyName: string;
tagline: string | null;
address: string | null;
phone: string | null;
email: string | null;
currency: string;
clinicianName: string | null;
expiryAlertDays: number;
reorderAlertLevel: number;
logoUrl: string | null;
createdAt: Date;
updatedAt: Date;
}) => ({
id: settings.id,
pharmacyName: settings.pharmacyName,
tagline: settings.tagline ?? "",
address: settings.address ?? "",
phone: settings.phone ?? "",
email: settings.email ?? "",
currency: settings.currency,
clinicianName: settings.clinicianName ?? "",
expiryAlertDays: settings.expiryAlertDays,
reorderAlertLevel: settings.reorderAlertLevel,
logoUrl: settings.logoUrl ?? "",
createdAt: settings.createdAt.toISOString(),
updatedAt: settings.updatedAt.toISOString(),
});

router.get("/", async (_request, response, next) => {
try {
let settings = await prisma.pharmacySettings.findFirst({
orderBy: {
createdAt: "asc",
},
});


if (!settings) {
  settings = await prisma.pharmacySettings.create({
    data: {
      pharmacyName: "AfyaLink Pharmacy",
      tagline: "Healthcare & Wellness Center",
      address: "Moi Avenue, Nairobi",
      phone: "0700111222",
      email: "info@afyalinkpharmacy.co.ke",
      currency: "KES",
      clinicianName: "",
      expiryAlertDays: 90,
      reorderAlertLevel: 10,
      logoUrl: "/logo/logo.png",
    },
  });
}

response.json({
  success: true,
  data: normalizeSettings(settings),
});


} catch (error) {
next(error);
}
});

router.put(
"/",
async (
request: AuthenticatedRequest,
response,
next,
) => {
try {
if (!canManageSettings(request)) {
response.status(403).json({
success: false,
message:
"You do not have permission to manage pharmacy settings.",
});
return;
}


  const body = request.body ?? {};

  const pharmacyName =
    typeof body.pharmacyName === "string"
      ? body.pharmacyName.trim()
      : "";

  if (!pharmacyName) {
    response.status(400).json({
      success: false,
      message: "Pharmacy name is required.",
    });
    return;
  }

  const expiryAlertDays =
    Number(body.expiryAlertDays);

  const reorderAlertLevel =
    Number(body.reorderAlertLevel);

  if (
    !Number.isInteger(expiryAlertDays) ||
    expiryAlertDays < 0 ||
    expiryAlertDays > 3650
  ) {
    response.status(400).json({
      success: false,
      message:
        "Expiry alert days must be a valid number between 0 and 3650.",
    });
    return;
  }

  if (
    !Number.isInteger(reorderAlertLevel) ||
    reorderAlertLevel < 0 ||
    reorderAlertLevel > 1000000
  ) {
    response.status(400).json({
      success: false,
      message:
        "Reorder alert level must be a valid non-negative number.",
    });
    return;
  }

  const existing =
    await prisma.pharmacySettings.findFirst({
      orderBy: {
        createdAt: "asc",
      },
    });

  const data = {
    pharmacyName,
    tagline:
      typeof body.tagline === "string"
        ? body.tagline.trim() || null
        : null,
    address:
      typeof body.address === "string"
        ? body.address.trim() || null
        : null,
    phone:
      typeof body.phone === "string"
        ? body.phone.trim() || null
        : null,
    email:
      typeof body.email === "string"
        ? body.email.trim().toLowerCase() || null
        : null,
    currency:
      typeof body.currency === "string" &&
      body.currency.trim()
        ? body.currency.trim().toUpperCase()
        : "KES",
    clinicianName:
      typeof body.clinicianName === "string"
        ? body.clinicianName.trim() || null
        : null,
    expiryAlertDays,
    reorderAlertLevel,
    logoUrl:
      typeof body.logoUrl === "string"
        ? body.logoUrl.trim() || null
        : null,
  };

  const settings = existing
    ? await prisma.pharmacySettings.update({
        where: {
          id: existing.id,
        },
        data,
      })
    : await prisma.pharmacySettings.create({
        data,
      });

  await recordAudit(request, {
    action: "SETTINGS_UPDATE",
    entity: "PharmacySettings",
    entityId: settings.id,
    details: {
      message:
        "Pharmacy settings updated.",
    },
  });

  response.json({
    success: true,
    message:
      "Pharmacy settings saved successfully.",
    data: normalizeSettings(settings),
  });
} catch (error) {
  next(error);
}

},
);

export default router;
