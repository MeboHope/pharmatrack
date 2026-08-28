
import React, {
  useMemo,
  useState,
} from 'react';

import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react';

import type {
  DispenseTransaction,
  Drug,
  HealthcareFrequency,
  HealthcareRoute,
  PatientRecord,
  PharmacySettings,
  PrescriptionItem,
} from '../types';

import {
  transactionService,
  type CreateTransactionInput,
} from '../services/transactions';

interface DispensingProps {
  drugs: Drug[];
  settings: PharmacySettings;
  transactions: DispenseTransaction[];
  patients: PatientRecord[];
  onCompleteTransaction: (
    transaction: DispenseTransaction,
  ) => void;
}

interface CartItem {
  drug: Drug;
  qty: number;
  frequency: HealthcareFrequency;
  route: HealthcareRoute;
  duration: number;
  durationUnit: string;
  specialInstructions: string;
}

const frequencies: HealthcareFrequency[] = [
  'OD (Once daily)',
  'BD / BID (Twice daily)',
  'TID (Three times daily)',
  'QID (Four times daily)',
  'STAT (Immediately)',
  'PRN (As needed)',
  'Q4H (Every 4 hours)',
  'Q6H (Every 6 hours)',
  'Q8H (Every 8 hours)',
  'Q12H (Every 12 hours)',
  'ON (At night)',
];

const routes: HealthcareRoute[] = [
  'Oral',
  'Topical',
  'Intravenous (IV)',
  'Intramuscular (IM)',
  'Subcutaneous',
  'Inhalation',
  'Ophthalmic',
  'Otic',
  'Rectal',
  'Sublingual',
];

const createTransactionId = (
  transactions: DispenseTransaction[],
) => {
  const numbers = transactions
    .map((transaction) => {
      const match =
        transaction.id.match(/(\d+)$/);

      return match
        ? Number(match[1])
        : 0;
    })
    .filter((number) =>
      Number.isFinite(number),
    );

  const next =
    Math.max(0, ...numbers) + 1;

  return `TXN-${String(next).padStart(4, '0')}`;
};

export const Dispensing: React.FC<
  DispensingProps
> = ({
  drugs = [],
  settings,
  transactions = [],
  patients = [],
  onCompleteTransaction,
}) => {
  const [search, setSearch] =
    useState('');

  const [patientType, setPatientType] =
    useState<
      'Walk-in Patient' | 'Registered Patient'
    >('Walk-in Patient');

  const [patientId, setPatientId] =
    useState('');

  const [patientName, setPatientName] =
    useState('');

  const [phone, setPhone] =
    useState('');

  const [diagnosis, setDiagnosis] =
    useState('');

  const [clinicianName, setClinicianName] =
    useState(
      settings?.clinicianName || '',
    );

  const [discount, setDiscount] =
    useState(0);

  const [paymentMethod, setPaymentMethod] =
    useState<'Cash' | 'M-Pesa'>(
      'Cash',
    );

  const [cashTendered, setCashTendered] =
    useState<number | ''>('');

  const [mpesaCode, setMpesaCode] =
    useState('');

  const [cart, setCart] =
    useState<CartItem[]>([]);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const [showRecent, setShowRecent] =
    useState(false);

  const [selectedDrug, setSelectedDrug] =
    useState<Drug | null>(null);

  const [selectedQty, setSelectedQty] =
    useState(1);

  const filteredDrugs = useMemo(() => {
    const term =
      search.trim().toLowerCase();

    if (!term) {
      return drugs
        .filter(
          (drug) =>
            drug.qty > 0 &&
            drug.status !== 'Expired',
        )
        .slice(0, 20);
    }

    return drugs
      .filter((drug) => {
        if (
          drug.qty <= 0 ||
          drug.status === 'Expired'
        ) {
          return false;
        }

        return (
          drug.name
            .toLowerCase()
            .includes(term) ||
          drug.genericName
            .toLowerCase()
            .includes(term) ||
          drug.code
            .toLowerCase()
            .includes(term) ||
          drug.batchNo
            .toLowerCase()
            .includes(term)
        );
      })
      .slice(0, 20);
  }, [drugs, search]);

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total +
          item.qty *
            Number(item.drug.sellingPrice || 0),
        0,
      ),
    [cart],
  );

  const safeDiscount = Math.min(
    Math.max(
      Number(discount) || 0,
      0,
    ),
    subtotal,
  );

  const totalAmount =
    subtotal - safeDiscount;

  const changeAmount =
    paymentMethod === 'Cash' &&
    typeof cashTendered === 'number'
      ? Math.max(
          cashTendered - totalAmount,
          0,
        )
      : 0;

  const selectedPatient = patients.find(
    (patient) =>
      patient.id === patientId,
  );

  const addDrugToCart = (
    drug: Drug,
    quantity = 1,
  ) => {
    setError('');

    if (
      drug.status === 'Expired' ||
      drug.qty <= 0
    ) {
      setError(
        `${drug.name} cannot be dispensed because it is unavailable.`,
      );
      return;
    }

    const existing = cart.find(
      (item) =>
        item.drug.id === drug.id,
    );

    const newQuantity =
      (existing?.qty || 0) + quantity;

    if (newQuantity > drug.qty) {
      setError(
        `Only ${drug.qty} ${drug.unit} of ${drug.name} are available.`,
      );
      return;
    }

    if (existing) {
      setCart((current) =>
        current.map((item) =>
          item.drug.id === drug.id
            ? {
                ...item,
                qty: newQuantity,
              }
            : item,
        ),
      );
    } else {
      setCart((current) => [
        ...current,
        {
          drug,
          qty: quantity,
          frequency:
            'OD (Once daily)',
          route: 'Oral',
          duration: 1,
          durationUnit: 'Days',
          specialInstructions: '',
        },
      ]);
    }

    setSearch('');
    setSelectedDrug(null);
    setSelectedQty(1);
  };

  const updateCartItem = (
    drugId: string,
    changes: Partial<CartItem>,
  ) => {
    setCart((current) =>
      current.map((item) =>
        item.drug.id === drugId
          ? {
              ...item,
              ...changes,
            }
          : item,
      ),
    );
  };

  const removeCartItem = (
    drugId: string,
  ) => {
    setCart((current) =>
      current.filter(
        (item) =>
          item.drug.id !== drugId,
      ),
    );
  };

  const handlePatientChange = (
    id: string,
  ) => {
    setPatientId(id);

    const patient = patients.find(
      (item) => item.id === id,
    );

    if (patient) {
      setPatientName(patient.name);
      setPhone(patient.phone);
    }
  };

  const resetForm = () => {
    setSearch('');
    setPatientType('Walk-in Patient');
    setPatientId('');
    setPatientName('');
    setPhone('');
    setDiagnosis('');
    setDiscount(0);
    setPaymentMethod('Cash');
    setCashTendered('');
    setMpesaCode('');
    setCart([]);
    setError('');
  };

  const handleComplete = async () => {
    setError('');
    setSuccess('');

    if (!patientName.trim()) {
      setError(
        'Patient name is required.',
      );
      return;
    }

    if (!clinicianName.trim()) {
      setError(
        'Clinician name is required.',
      );
      return;
    }

    if (!cart.length) {
      setError(
        'Add at least one medicine before completing the transaction.',
      );
      return;
    }

    if (
      paymentMethod === 'Cash' &&
      (cashTendered === '' ||
        Number(cashTendered) <
          totalAmount)
    ) {
      setError(
        'Cash tendered is less than the transaction total.',
      );
      return;
    }

    if (
      paymentMethod === 'M-Pesa' &&
      !mpesaCode.trim()
    ) {
      setError(
        'Enter the M-Pesa transaction code.',
      );
      return;
    }

    setSaving(true);

    try {
      const items: PrescriptionItem[] =
        cart.map((item) => ({
          drugId: item.drug.id,
          drugCode: item.drug.code,
          drugName: item.drug.name,
          batchNo: item.drug.batchNo,
          expiryDate:
            item.drug.expiryDate,
          availableQty: item.drug.qty,
          qty: item.qty,
          unitPrice:
            Number(
              item.drug.sellingPrice,
            ),
          frequency:
            item.frequency,
          route: item.route,
          duration: item.duration,
          durationUnit:
            item.durationUnit,
          specialInstructions:
            item.specialInstructions ||
            undefined,
          lineTotal:
            item.qty *
            Number(
              item.drug.sellingPrice,
            ),
        }));

      const input: CreateTransactionInput =
        {
          patientType,
          patientId:
            patientId || undefined,
          patientName:
            patientName.trim(),
          phone:
            phone.trim() || undefined,
          clinicianName:
            clinicianName.trim(),
          prescriptionDate:
            new Date()
              .toISOString()
              .slice(0, 10),
          diagnosis:
            diagnosis.trim() ||
            undefined,
          items,
          subtotal,
          discount: safeDiscount,
          totalAmount,
          paymentMethod,
          cashTendered:
            paymentMethod === 'Cash'
              ? Number(cashTendered)
              : undefined,
          changeAmount:
            paymentMethod === 'Cash'
              ? changeAmount
              : undefined,
          mpesaCode:
            paymentMethod === 'M-Pesa'
              ? mpesaCode.trim()
              : undefined,
        };

      const created =
        await transactionService.create(
          input,
        );

      const transaction: DispenseTransaction =
        {
          ...created,
          id:
            created.id ||
            createTransactionId(
              transactions,
            ),
        };

      onCompleteTransaction(
        transaction,
      );

      setSuccess(
        `Transaction ${
          transaction.id
        } completed successfully.`,
      );

      setCart([]);
      setDiscount(0);
      setCashTendered('');
      setMpesaCode('');
      setSearch('');
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to complete the transaction.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Dispensing & POS
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Dispense medicines, record prescriptions,
            and process payments.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setShowRecent(
              (current) => !current,
            )
          }
          className="px-4 py-2 text-sm font-semibold text-[#22577A] bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          {showRecent
            ? 'Hide Recent Transactions'
            : 'Recent Transactions'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm">
            {error}
          </span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm">
            {success}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">
              Patient Details
            </h2>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setPatientType(
                    'Walk-in Patient',
                  )
                }
                className={`py-2 rounded-lg text-sm font-semibold border ${
                  patientType ===
                  'Walk-in Patient'
                    ? 'bg-[#22577A] text-white border-[#22577A]'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                Walk-in Patient
              </button>

              <button
                type="button"
                onClick={() =>
                  setPatientType(
                    'Registered Patient',
                  )
                }
                className={`py-2 rounded-lg text-sm font-semibold border ${
                  patientType ===
                  'Registered Patient'
                    ? 'bg-[#22577A] text-white border-[#22577A]'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                Registered Patient
              </button>
            </div>

            {patientType ===
              'Registered Patient' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Patient
                </label>

                <select
                  value={patientId}
                  onChange={(event) =>
                    handlePatientChange(
                      event.target.value,
                    )
                  }
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">
                    Select registered patient
                  </option>

                  {patients.map(
                    (patient) => (
                      <option
                        key={patient.id}
                        value={patient.id}
                      >
                        {patient.name} —{' '}
                        {patient.phone}
                      </option>
                    ),
                  )}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Patient Name *
                </label>

                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />

                  <input
                    value={patientName}
                    onChange={(event) =>
                      setPatientName(
                        event.target.value,
                      )
                    }
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm"
                    placeholder="Patient name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone
                </label>

                <input
                  value={phone}
                  onChange={(event) =>
                    setPhone(
                      event.target.value,
                    )
                  }
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm"
                  placeholder="07XXXXXXXX"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clinician *
                </label>

                <input
                  value={clinicianName}
                  onChange={(event) =>
                    setClinicianName(
                      event.target.value,
                    )
                  }
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Diagnosis / Reason
                </label>

                <input
                  value={diagnosis}
                  onChange={(event) =>
                    setDiagnosis(
                      event.target.value,
                    )
                  }
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm"
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">
              Medicine Search
            </h2>
          </div>

          <div className="p-5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm"
                placeholder="Search medicine, code, generic name..."
              />
            </div>

            {(search ||
              filteredDrugs.length > 0) && (
              <div className="mt-3 max-h-72 overflow-y-auto border border-slate-200 rounded-lg divide-y">
                {filteredDrugs.map(
                  (drug) => (
                    <button
                      key={drug.id}
                      type="button"
                      onClick={() =>
                        setSelectedDrug(
                          drug,
                        )
                      }
                      className="w-full text-left p-3 hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {drug.name}
                          </p>

                          <p className="text-xs text-slate-500">
                            {drug.code} ·{' '}
                            {drug.batchNo}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-bold text-[#22577A]">
                            {settings.currency}{' '}
                            {Number(
                              drug.sellingPrice,
                            ).toFixed(2)}
                          </p>

                          <p className="text-xs text-slate-500">
                            {drug.qty}{' '}
                            {drug.unit}
                          </p>
                        </div>
                      </div>
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {selectedDrug && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-slate-900">
                  Add Medicine
                </h3>

                <p className="text-xs text-slate-500">
                  {selectedDrug.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedDrug(null)
                }
                className="p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quantity
            </label>

            <input
              type="number"
              min={1}
              max={selectedDrug.qty}
              value={selectedQty}
              onChange={(event) =>
                setSelectedQty(
                  Math.max(
                    1,
                    Math.min(
                      selectedDrug.qty,
                      Number(
                        event.target.value,
                      ) || 1,
                    ),
                  ),
                )
              }
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg mb-4"
            />

            <button
              type="button"
              onClick={() =>
                addDrugToCart(
                  selectedDrug,
                  selectedQty,
                )
              }
              className="w-full py-2.5 bg-[#22577A] text-white rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add to Dispensing List
            </button>
          </div>
        </div>
      )}

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900">
              Dispensing List
            </h2>

            <p className="text-xs text-slate-500">
              {cart.length} medicine item
              {cart.length === 1
                ? ''
                : 's'}
            </p>
          </div>
        </div>

        {cart.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">
            No medicines added yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-5 py-3">
                    Medicine
                  </th>
                  <th className="px-3 py-3">
                    Qty
                  </th>
                  <th className="px-3 py-3">
                    Frequency
                  </th>
                  <th className="px-3 py-3">
                    Route
                  </th>
                  <th className="px-3 py-3">
                    Duration
                  </th>
                  <th className="px-5 py-3 text-right">
                    Total
                  </th>
                  <th />
                </tr>
              </thead>

              <tbody className="divide-y">
                {cart.map(
                  (item) => (
                    <tr key={item.drug.id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {item.drug.name}
                        </p>

                        <p className="text-xs text-slate-500">
                          {settings.currency}{' '}
                          {Number(
                            item.drug.sellingPrice,
                          ).toFixed(2)}{' '}
                          / {item.drug.unit}
                        </p>
                      </td>

                      <td className="px-3 py-4">
                        <input
                          type="number"
                          min={1}
                          max={item.drug.qty}
                          value={item.qty}
                          onChange={(event) => {
                            const qty =
                              Math.max(
                                1,
                                Math.min(
                                  item.drug.qty,
                                  Number(
                                    event.target
                                      .value,
                                  ) || 1,
                                ),
                              );

                            updateCartItem(
                              item.drug.id,
                              { qty },
                            );
                          }}
                          className="w-20 px-2 py-1.5 border rounded"
                        />
                      </td>

                      <td className="px-3 py-4">
                        <select
                          value={
                            item.frequency
                          }
                          onChange={(event) =>
                            updateCartItem(
                              item.drug.id,
                              {
                                frequency:
                                  event.target
                                    .value as HealthcareFrequency,
                              },
                            )
                          }
                          className="px-2 py-1.5 border rounded text-xs"
                        >
                          {frequencies.map(
                            (frequency) => (
                              <option
                                key={
                                  frequency
                                }
                                value={
                                  frequency
                                }
                              >
                                {frequency}
                              </option>
                            ),
                          )}
                        </select>
                      </td>

                      <td className="px-3 py-4">
                        <select
                          value={
                            item.route
                          }
                          onChange={(event) =>
                            updateCartItem(
                              item.drug.id,
                              {
                                route:
                                  event.target
                                    .value as HealthcareRoute,
                              },
                            )
                          }
                          className="px-2 py-1.5 border rounded text-xs"
                        >
                          {routes.map(
                            (route) => (
                              <option
                                key={route}
                                value={route}
                              >
                                {route}
                              </option>
                            ),
                          )}
                        </select>
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex gap-1">
                          <input
                            type="number"
                            min={1}
                            value={
                              item.duration
                            }
                            onChange={(event) =>
                              updateCartItem(
                                item.drug.id,
                                {
                                  duration:
                                    Math.max(
                                      1,
                                      Number(
                                        event
                                          .target
                                          .value,
                                      ) || 1,
                                    ),
                                },
                              )
                            }
                            className="w-16 px-2 py-1.5 border rounded"
                          />

                          <select
                            value={
                              item.durationUnit
                            }
                            onChange={(event) =>
                              updateCartItem(
                                item.drug.id,
                                {
                                  durationUnit:
                                    event.target
                                      .value,
                                },
                              )
                            }
                            className="px-2 py-1.5 border rounded text-xs"
                          >
                            <option>
                              Days
                            </option>
                            <option>
                              Weeks
                            </option>
                            <option>
                              Months
                            </option>
                          </select>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right font-bold">
                        {settings.currency}{' '}
                        {(
                          item.qty *
                          Number(
                            item.drug
                              .sellingPrice,
                          )
                        ).toFixed(2)}
                      </td>

                      <td className="px-3 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            removeCartItem(
                              item.drug.id,
                            )
                          }
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                          aria-label="Remove medicine"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-bold text-slate-900 mb-4">
            Payment
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              onClick={() =>
                setPaymentMethod('Cash')
              }
              className={`py-2.5 rounded-lg border font-semibold text-sm ${
                paymentMethod === 'Cash'
                  ? 'bg-[#22577A] text-white border-[#22577A]'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              Cash
            </button>

            <button
              type="button"
              onClick={() =>
                setPaymentMethod('M-Pesa')
              }
              className={`py-2.5 rounded-lg border font-semibold text-sm ${
                paymentMethod === 'M-Pesa'
                  ? 'bg-[#22577A] text-white border-[#22577A]'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              M-Pesa
            </button>
          </div>

          {paymentMethod === 'Cash' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cash Tendered
              </label>

              <input
                type="number"
                min={0}
                value={cashTendered}
                onChange={(event) =>
                  setCashTendered(
                    event.target.value === ''
                      ? ''
                      : Number(
                          event.target.value,
                        ),
                  )
                }
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                M-Pesa Transaction Code
              </label>

              <input
                value={mpesaCode}
                onChange={(event) =>
                  setMpesaCode(
                    event.target.value,
                  )
                }
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg"
                placeholder="e.g. QK89X4029"
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">
                Subtotal
              </span>

              <span className="font-semibold">
                {settings.currency}{' '}
                {subtotal.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">
                Discount
              </span>

              <input
                type="number"
                min={0}
                max={subtotal}
                value={discount}
                onChange={(event) =>
                  setDiscount(
                    Math.max(
                      0,
                      Number(
                        event.target.value,
                      ) || 0,
                    ),
                  )
                }
                className="w-28 px-2 py-1.5 border rounded text-right"
              />
            </div>

            <div className="border-t pt-3 flex justify-between text-lg">
              <span className="font-bold">
                Total
              </span>

              <span className="font-bold text-[#22577A]">
                {settings.currency}{' '}
                {totalAmount.toFixed(2)}
              </span>
            </div>

            {paymentMethod ===
              'Cash' && (
              <div className="flex justify-between text-sm text-emerald-700">
                <span>Change</span>
                <span className="font-bold">
                  {settings.currency}{' '}
                  {changeAmount.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleComplete}
            disabled={
              saving ||
              cart.length === 0
            }
            className="mt-5 w-full py-3 bg-[#22577A] hover:bg-[#1b4662] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />

            {saving
              ? 'Processing...'
              : 'Complete Dispensing'}
          </button>

          <button
            type="button"
            onClick={resetForm}
            disabled={saving}
            className="mt-2 w-full py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            Clear Form
          </button>
        </div>
      </section>

      {showRecent && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">
              Recent Transactions
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-5 py-3">
                    ID
                  </th>
                  <th className="text-left px-5 py-3">
                    Patient
                  </th>
                  <th className="text-left px-5 py-3">
                    Date
                  </th>
                  <th className="text-left px-5 py-3">
                    Payment
                  </th>
                  <th className="text-right px-5 py-3">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {transactions
                  .slice(0, 10)
                  .map(
                    (transaction) => (
                      <tr
                        key={
                          transaction.id
                        }
                      >
                        <td className="px-5 py-3 font-semibold text-[#22577A]">
                          {transaction.id}
                        </td>

                        <td className="px-5 py-3">
                          {
                            transaction.patientName
                          }
                        </td>

                        <td className="px-5 py-3 text-slate-500">
                          {
                            transaction.date
                          }
                        </td>

                        <td className="px-5 py-3">
                          {
                            transaction.paymentMethod
                          }
                        </td>

                        <td className="px-5 py-3 text-right font-semibold">
                          {
                            settings.currency
                          }{' '}
                          {Number(
                            transaction.totalAmount ||
                              0,
                          ).toFixed(2)}
                        </td>
                      </tr>
                    ),
                  )}

                {transactions.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-slate-500"
                    >
                      No transactions
                      recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default Dispensing;
