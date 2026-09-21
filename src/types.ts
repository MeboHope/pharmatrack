export type TabType =
  | "dashboard"
  | "inventory"
  | "dispensing"
  | "suppliers"
  | "patients"
  | "reports"
  | "stock-adjustments"
  | "user-management"
  | "audit-logs"
  | "settings";

export type DrugCategory =
  | "Antidiabetics"
  | "Antihypertensives"
  | "Antihistamines"
  | "Antimalarials"
  | "Antiretrovirals"
  | "Dermatological"
  | "Gastrointestinal"
  | "Ophthalmic"
  | "Respiratory"
  | "Vitamins & Supplements"
  | "Analgesics"
  | "Antibiotics"
  | "Other";

export type DrugFormulation =
  | "Cream"
  | "Ointment"
  | "Gel"
  | "Drops"
  | "Inhaler"
  | "Injection"
  | "Powder"
  | "Suppository"
  | "Patch"
  | "Lotion"
  | "Solution"
  | "Tablets"
  | "Capsules";

export type HealthcareFrequency =
  | "OD (Once daily)"
  | "BD / BID (Twice daily)"
  | "TID (Three times daily)"
  | "QID (Four times daily)"
  | "STAT (Immediately)"
  | "PRN (As needed)"
  | "Q4H (Every 4 hours)"
  | "Q6H (Every 6 hours)"
  | "Q8H (Every 8 hours)"
  | "Q12H (Every 12 hours)"
  | "ON (At night)";

export type HealthcareRoute =
  | "Oral"
  | "Topical"
  | "Intravenous (IV)"
  | "Intramuscular (IM)"
  | "Subcutaneous"
  | "Inhalation"
  | "Ophthalmic"
  | "Otic"
  | "Rectal"
  | "Sublingual";

export interface Drug {
  id: string;
  code: string;
  name: string;
  genericName: string;
  category: DrugCategory;
  formulation: DrugFormulation;
  batchNo: string;
  manufactureDate?: string;
  expiryDate: string;
  qty: number;
  unit: string;
  buyingPrice: number;
  sellingPrice: number;
  markupPercent: number;
  status:
    | "In Stock"
    | "Low Stock"
    | "Expired"
    | "Out of Stock";
  notes?: string;
  createdAt: string;
}

export interface PrescriptionItem {
  drugId: string;
  drugCode: string;
  drugName: string;
  batchNo: string;
  expiryDate: string;
  availableQty: number;
  qty: number;
  unitPrice: number;
  frequency: HealthcareFrequency;
  route: HealthcareRoute;
  duration: number;
  durationUnit: string;
  specialInstructions?: string;
  lineTotal: number;
}

export interface PatientRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: "Male" | "Female" | "Other";
  address?: string;
  allergies?: string;
  totalVisits: number;
  createdAt: string;
}

export interface DispenseTransaction {
  id: string;
  date: string;
  patientType:
    | "Walk-in Patient"
    | "Registered Patient";
  patientName: string;
  phone?: string;
  clinicianName: string;
  prescriptionDate?: string;
  diagnosis?: string;
  items: PrescriptionItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: "Cash" | "M-Pesa";
  cashTendered?: number;
  changeAmount?: number;
  mpesaCode?: string;
  status:
    | "Completed"
    | "Cancelled"
    | "Pending";
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  leadTimeDays: number;
}

export interface StockAdjustment {
  id: string;
  date: string;
  drugId: string;
  drugName: string;
  batchNo: string;
  previousQty: number;
  adjustedQty: number;
  type:
    | "Loss / Damage"
    | "Expiry Removal"
    | "Audit Reconciliation"
    | "Return to Supplier";
  reason: string;
  adjustedBy: string;
}

export interface PharmacySettings {
  pharmacyName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  clinicianName: string;
  expiryAlertDays: number;
  reorderAlertLevel: number;
  logoUrl?: string;
}

/**
 * Organization type used by the multi-tenant platform.
 *
 * A tenant can represent either a pharmacy or a clinic.
 */
export type OrganizationType =
  | "PHARMACY"
  | "CLINIC";

/**
 * Organization lifecycle status.
 */
export type OrganizationStatus =
  | "ACTIVE"
  | "SUSPENDED";

/**
 * Role a user holds inside a specific organization.
 *
 * SUPER_ADMIN is deliberately excluded because Super Admin
 * operates at the platform level rather than as a tenant member.
 */
export type OrganizationRole =
  | "ADMIN"
  | "PHARMACIST"
  | "CLINICIAN";

/**
 * An organization available to the authenticated user.
 *
 * This is the data used by the organization switcher.
 */
export interface UserOrganization {
  id: string;
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  role: OrganizationRole;
}

/**
 * Authenticated application user.
 *
 * The role represents the user's effective role in the
 * currently selected organization.
 *
 * Super Admin is platform-level and therefore has no
 * current tenant organization.
 */
export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;

  role:
    | "Super Admin"
    | "Admin"
    | "Pharmacist"
    | "Clinician";

  passwordHash?: string;

  isVerified: boolean;

  createdAt: string;

  /**
   * Current organization context.
   *
   * Null for Super Admin.
   */
  organizationId?: string | null;

  organizationName?: string | null;

  organizationType?:
    | OrganizationType
    | null;

  /**
   * Effective membership role in the
   * currently selected organization.
   *
   * This is normally the same as `role`
   * for tenant users.
   */
  organizationRole?:
    | OrganizationRole
    | null;
}