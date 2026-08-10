/**
 * Seeds a Supabase project with the PharmaTrack demo data and demo user accounts.
 *
 * Usage: npm run seed
 * Requires VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  initialAdjustments,
  initialDrugs,
  initialPatients,
  initialSettings,
  initialSuppliers,
  initialTransactions,
  initialUsers,
} from '../src/data/mockData';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const demoPasswords: Record<string, string> = {
  'sarah.jenkins@afyalinkpharmacy.co.ke': 'Password123!',
  'john.doe@afyalinkpharmacy.co.ke': 'Pharma2026!',
};

const fail = (context: string, error: { message: string } | null) => {
  if (error) {
    console.error(`${context}: ${error.message}`);
    process.exit(1);
  }
};

const seedUsers = async () => {
  for (const user of initialUsers) {
    const password = demoPasswords[user.email];
    if (!password) continue;

    const { data, error } = await admin.auth.admin.createUser({
      email: user.email,
      password,
      email_confirm: true,
      user_metadata: { name: user.name, phone: user.phone ?? '', role: user.role },
    });

    if (error) {
      if (!error.message.toLowerCase().includes('already')) fail('Creating demo user', error);
      console.log(`  user ${user.email} already exists, skipping`);
      continue;
    }

    if (data.user) {
      fail(
        'Updating demo profile',
        (
          await admin
            .from('profiles')
            .update({ name: user.name, phone: user.phone ?? null, role: user.role })
            .eq('id', data.user.id)
        ).error
      );
    }
    console.log(`  created user ${user.email}`);
  }
};

const seed = async () => {
  console.log('Seeding users...');
  await seedUsers();

  console.log('Seeding pharmacy settings...');
  fail(
    'Settings',
    (
      await admin.from('pharmacy_settings').upsert({
        id: 1,
        pharmacy_name: initialSettings.pharmacyName,
        tagline: initialSettings.tagline,
        address: initialSettings.address,
        phone: initialSettings.phone,
        email: initialSettings.email,
        currency: initialSettings.currency,
        clinician_name: initialSettings.clinicianName,
        expiry_alert_days: initialSettings.expiryAlertDays,
        reorder_alert_level: initialSettings.reorderAlertLevel,
        logo_url: initialSettings.logoUrl ?? null,
      })
    ).error
  );

  console.log(`Seeding ${initialDrugs.length} drugs...`);
  fail(
    'Drugs',
    (
      await admin.from('drugs').upsert(
        initialDrugs.map((d) => ({
          id: d.id,
          code: d.code,
          name: d.name,
          generic_name: d.genericName,
          category: d.category,
          formulation: d.formulation,
          batch_no: d.batchNo,
          manufacture_date: d.manufactureDate ?? null,
          expiry_date: d.expiryDate,
          qty: d.qty,
          unit: d.unit,
          buying_price: d.buyingPrice,
          selling_price: d.sellingPrice,
          markup_percent: d.markupPercent,
          status: d.status,
          notes: d.notes ?? null,
          created_at: d.createdAt,
        }))
      )
    ).error
  );

  console.log(`Seeding ${initialPatients.length} patients...`);
  fail(
    'Patients',
    (
      await admin.from('patients').upsert(
        initialPatients.map((p) => ({
          id: p.id,
          name: p.name,
          phone: p.phone,
          email: p.email ?? null,
          age: p.age ?? null,
          gender: p.gender ?? null,
          address: p.address ?? null,
          allergies: p.allergies ?? null,
          total_visits: p.totalVisits,
          created_at: p.createdAt,
        }))
      )
    ).error
  );

  console.log(`Seeding ${initialSuppliers.length} suppliers...`);
  fail(
    'Suppliers',
    (
      await admin.from('suppliers').upsert(
        initialSuppliers.map((s) => ({
          id: s.id,
          name: s.name,
          contact_person: s.contactPerson,
          phone: s.phone,
          email: s.email,
          address: s.address,
          lead_time_days: s.leadTimeDays,
        }))
      )
    ).error
  );

  console.log(`Seeding ${initialTransactions.length} transactions...`);
  fail(
    'Transactions',
    (
      await admin.from('transactions').upsert(
        initialTransactions.map((t) => ({
          id: t.id,
          date: t.date,
          patient_type: t.patientType,
          patient_name: t.patientName,
          phone: t.phone ?? null,
          clinician_name: t.clinicianName,
          prescription_date: t.prescriptionDate ?? null,
          diagnosis: t.diagnosis ?? null,
          items: t.items,
          subtotal: t.subtotal,
          discount: t.discount,
          total_amount: t.totalAmount,
          payment_method: t.paymentMethod,
          cash_tendered: t.cashTendered ?? null,
          change_amount: t.changeAmount ?? null,
          mpesa_code: t.mpesaCode ?? null,
          status: t.status,
        }))
      )
    ).error
  );

  console.log(`Seeding ${initialAdjustments.length} stock adjustments...`);
  fail(
    'Stock adjustments',
    (
      await admin.from('stock_adjustments').upsert(
        initialAdjustments.map((a) => ({
          id: a.id,
          date: a.date,
          drug_id: a.drugId,
          drug_name: a.drugName,
          batch_no: a.batchNo,
          previous_qty: a.previousQty,
          adjusted_qty: a.adjustedQty,
          type: a.type,
          reason: a.reason,
          adjusted_by: a.adjustedBy,
        }))
      )
    ).error
  );

  console.log('Seed complete.');
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
