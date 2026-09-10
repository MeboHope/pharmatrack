export {
  authenticate,
  requireAuth,
  requireRole,
  requireAdmin,
  requirePharmacist,
  requireClinician,
  requirePharmacyStaff,
} from "./auth.js";

export type {
  AuthenticatedRequest,
} from "./auth.js";

export type AppRole =
  | "ADMIN"
  | "PHARMACIST"
  | "CLINICIAN";