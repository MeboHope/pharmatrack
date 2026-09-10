import { prisma } from "../prisma";

export interface PharmacySettingsData {
  id: string;
  pharmacyName: string;
  tagline?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  currency: string;
  clinicianName?: string | null;
  expiryAlertDays: number;
  reorderAlertLevel: number;
  logoUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_SETTINGS = {
  pharmacyName: "AfyaLink Pharmacy",
  tagline: "Healthcare & Wellness Center",
  address: "Moi Avenue, Nairobi",
  phone: "0700111222",
  email: "info@afyalinkpharmacy.co.ke",
  currency: "KES",
  clinicianName: "Dr. Sarah Jenkins",
  expiryAlertDays: 90,
  reorderAlertLevel: 10,
  logoUrl: "/logo/logo.png",
};

const getSettingsRecord =
  async (): Promise<PharmacySettingsData> => {
    let settings =
      await prisma.pharmacySettings.findFirst({
        orderBy: {
          createdAt: "asc",
        },
      });

    if (!settings) {
      settings =
        await prisma.pharmacySettings.create({
          data: DEFAULT_SETTINGS,
        });
    }

    return settings;
  };

export const getSettings =
  async (): Promise<PharmacySettingsData> => {
    return getSettingsRecord();
  };

export const updateSettings =
  async (
    settings: Partial<
      Omit<
        PharmacySettingsData,
        | "id"
        | "createdAt"
        | "updatedAt"
      >
    >,
  ): Promise<PharmacySettingsData> => {
    const existing =
      await getSettingsRecord();

    return prisma.pharmacySettings.update({
      where: {
        id: existing.id,
      },
      data: {
        pharmacyName:
          settings.pharmacyName ??
          existing.pharmacyName,

        tagline:
          settings.tagline ??
          existing.tagline,

        address:
          settings.address ??
          existing.address,

        phone:
          settings.phone ??
          existing.phone,

        email:
          settings.email ??
          existing.email,

        currency:
          settings.currency ??
          existing.currency,

        clinicianName:
          settings.clinicianName ??
          existing.clinicianName,

        expiryAlertDays:
          settings.expiryAlertDays ??
          existing.expiryAlertDays,

        reorderAlertLevel:
          settings.reorderAlertLevel ??
          existing.reorderAlertLevel,

        logoUrl:
          settings.logoUrl ??
          existing.logoUrl,
      },
    });
  };

export default {
  getSettings,
  updateSettings,
};