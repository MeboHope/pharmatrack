import React, { useState, useEffect } from 'react';
import { 
  User, 
  FileText, 
  Pill, 
  CreditCard, 
  Receipt as ReceiptIcon, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  Printer, 
  Tag, 
  ArrowLeft, 
  ArrowRight,
  ChevronRight,
  Clock,
  RotateCcw
} from 'lucide-react';
import { 
  Drug, 
  DispenseTransaction, 
  PrescriptionItem, 
  PharmacySettings,
  HealthcareFrequency,
  HealthcareRoute,
  PatientRecord
} from '../types';
import { initialPatients } from '../data/mockData';
import { DatePicker } from './DatePicker';

interface DispensingProps {
  drugs: Drug[];
  settings: PharmacySettings;
  transactions: DispenseTransaction[];
  patients?: PatientRecord[];
  onCompleteTransaction: (transaction: DispenseTransaction) => void;
}

const FREQUENCIES: HealthcareFrequency[] = [
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

const ROUTES: HealthcareRoute[] = [
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

export const Dispensing: React.FC<DispensingProps> = ({
  drugs,
  settings,
  transactions,
  patients = initialPatients,
  onCompleteTransaction,
}) => {
  const [dispenseView, setDispenseView] = useState<'new' | 'history'>('new');
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Patient
  const [patientType, setPatientType] = useState<'Walk-in Patient' | 'Registered Patient'>('Walk-in Patient');
  const [patientName, setPatientName] = useState('John Mark');
  const [patientPhone, setPatientPhone] = useState('0712345678');
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [selectedRegisteredPatient, setSelectedRegisteredPatient] = useState<PatientRecord | null>(null);
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);

  // Step 2: Prescription
  const [clinicianName] = useState(settings.clinicianName || 'Dr. Sarah Jenkins');
  const [prescriptionDate, setPrescriptionDate] = useState(new Date().toISOString().slice(0, 10));
  const [diagnosis, setDiagnosis] = useState('');

  // Step 3: Drugs
  const [drugSearch, setDrugSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<PrescriptionItem[]>([]);

  // Step 4: Payment
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'M-Pesa'>('Cash');
  const [cashTendered, setCashTendered] = useState<number | ''>('');
  const [mpesaCode, setMpesaCode] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Completed Transaction State for Step 5
  const [completedTxn, setCompletedTxn] = useState<DispenseTransaction | null>(null);
  const [historyReceiptTxn, setHistoryReceiptTxn] = useState<DispenseTransaction | null>(null);
  const [activeReceiptModal, setActiveReceiptModal] = useState<boolean>(false);
  const [activeLabelModal, setActiveLabelModal] = useState<boolean>(false);

  // Dedicated receipt printing helper using standard browser window.print()
  const handlePrint = (txnOverride?: unknown) => {
    if (txnOverride && typeof txnOverride === 'object' && 'id' in (txnOverride as object) && typeof (txnOverride as DispenseTransaction).id === 'string') {
      setHistoryReceiptTxn(txnOverride as DispenseTransaction);
      setTimeout(() => {
        window.print();
      }, 100);
    } else {
      window.print();
    }
  };

  const handleOpenHistoryReceipt = (txn: DispenseTransaction, autoPrint: boolean = false) => {
    setHistoryReceiptTxn(txn);
    if (autoPrint) {
      setTimeout(() => {
        window.print();
      }, 100);
    }
  };

  // Global Ctrl+P / Cmd+P listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        window.print();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Calculations
  const subtotal = selectedItems.reduce((acc, item) => acc + item.lineTotal, 0);
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const numCashTendered = typeof cashTendered === 'number' ? cashTendered : (parseFloat(cashTendered) || 0);
  const changeAmount = paymentMethod === 'Cash' ? Math.max(0, numCashTendered - totalAmount) : 0;

  // Search matching drugs
  const matchingDrugs = drugs.filter(
    (d) =>
      d.status !== 'Expired' &&
      d.qty > 0 &&
      (d.name.toLowerCase().includes(drugSearch.toLowerCase()) ||
        d.genericName.toLowerCase().includes(drugSearch.toLowerCase()) ||
        d.batchNo.toLowerCase().includes(drugSearch.toLowerCase()) ||
        d.code.toLowerCase().includes(drugSearch.toLowerCase()))
  );

  // Add drug to order (latest drug placed at top for intuitive workflow)
  const handleAddDrugToOrder = (drug: Drug) => {
    const existingIndex = selectedItems.findIndex((i) => i.drugId === drug.id);
    if (existingIndex >= 0) {
      // Increment and move to top
      const item = selectedItems[existingIndex];
      const newQty = item.qty + 1;
      const updatedItem: PrescriptionItem = {
        ...item,
        qty: newQty,
        lineTotal: newQty * item.unitPrice,
      };
      const remaining = selectedItems.filter((_, i) => i !== existingIndex);
      setSelectedItems([updatedItem, ...remaining]);
    } else {
      const newItem: PrescriptionItem = {
        drugId: drug.id,
        drugCode: drug.code,
        drugName: drug.name,
        batchNo: drug.batchNo,
        expiryDate: drug.expiryDate,
        availableQty: drug.qty,
        qty: 1,
        unitPrice: drug.sellingPrice,
        frequency: 'OD (Once daily)',
        route: 'Oral',
        duration: 5,
        durationUnit: 'Days',
        specialInstructions: 'Take after meals',
        lineTotal: drug.sellingPrice,
      };
      setSelectedItems([newItem, ...selectedItems]);
    }
    setDrugSearch('');
  };

  // Update item quantity (Up / Down buttons & typing)
  const handleQtyChange = (index: number, newQty: number) => {
    if (newQty < 1) return;
    const updated = [...selectedItems];
    const item = updated[index];
    const qtyClamped = Math.min(newQty, item.availableQty);
    updated[index] = {
      ...item,
      qty: qtyClamped,
      lineTotal: qtyClamped * item.unitPrice,
    };
    setSelectedItems(updated);
  };

  // Update line item details
  const handleItemFieldChange = (index: number, field: keyof PrescriptionItem, value: any) => {
    const updated = [...selectedItems];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedItems(updated);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  // Submit Transaction
  const handleCompleteAndRecord = () => {
    if (selectedItems.length === 0) {
      alert('Please add at least one drug to the dispensing order.');
      return;
    }
    if (paymentMethod === 'M-Pesa' && !mpesaCode) {
      alert('Please enter the M-Pesa transaction code or last 4 digits.');
      return;
    }

    const nextId = `TXN-${String(transactions.length + 4).padStart(4, '0')}`;
    const nowStr = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newTxn: DispenseTransaction = {
      id: nextId,
      date: nowStr,
      patientType,
      patientName: patientName || 'Walk-in Customer',
      phone: patientPhone,
      clinicianName,
      prescriptionDate,
      diagnosis,
      items: selectedItems,
      subtotal,
      discount: discountAmount,
      totalAmount,
      paymentMethod,
      cashTendered: paymentMethod === 'Cash' ? (typeof cashTendered === 'number' ? cashTendered : parseFloat(cashTendered) || 0) : undefined,
      changeAmount: paymentMethod === 'Cash' ? changeAmount : undefined,
      mpesaCode: paymentMethod === 'M-Pesa' ? mpesaCode : undefined,
      status: 'Completed',
    };

    onCompleteTransaction(newTxn);
    setCompletedTxn(newTxn);
    setCurrentStep(5);
  };

  // Reset for new dispensing
  const handleStartNewDispensing = () => {
    setCurrentStep(1);
    setPatientName('John Mark');
    setPatientPhone('0712345678');
    setSelectedItems([]);
    setCompletedTxn(null);
    setCashTendered('');
    setMpesaCode('');
  };

  // Step Indicators data
  const steps = [
    { num: 1, label: 'Patient', icon: <User className="w-4 h-4" /> },
    { num: 2, label: 'Prescription', icon: <FileText className="w-4 h-4" /> },
    { num: 3, label: 'Drugs', icon: <Pill className="w-4 h-4" /> },
    { num: 4, label: 'Payment', icon: <CreditCard className="w-4 h-4" /> },
    { num: 5, label: 'Receipt', icon: <ReceiptIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Title Header with Sub-Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dispensing & Sales</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Point of Sale prescription dispensing & receipt generation
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            id="tab-dispense-new"
            onClick={() => setDispenseView('new')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              dispenseView === 'new'
                ? 'bg-white text-[#22577A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            New Dispensing
          </button>
          <button
            id="tab-dispense-history"
            onClick={() => setDispenseView('history')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              dispenseView === 'history'
                ? 'bg-white text-[#22577A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-slate-500" />
            History ({transactions.length})
          </button>
        </div>
      </div>

      {/* VIEW 1: NEW DISPENSING WIZARD */}
      {dispenseView === 'new' && (
        <div className="space-y-4">
          {/* 5-Step Progress Stepper EXACT MATCHING Page 3 */}
          <div className="bg-white py-3 px-6 rounded-xl border border-slate-200 shadow-xs max-w-4xl mx-auto overflow-x-auto no-print">
            <div className="flex items-center justify-between min-w-[580px]">
              {steps.map((step, idx) => {
                const isCompleted = currentStep > step.num;
                const isCurrent = currentStep === step.num;
                return (
                  <React.Fragment key={step.num}>
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          isCompleted
                            ? 'bg-[#57CC99] text-white shadow-xs'
                            : isCurrent
                            ? 'bg-[#22577A] text-white ring-3 ring-sky-100 shadow-xs'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                        style={isCompleted ? { backgroundColor: '#0d8065' } : {}}
                      >
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step.icon}
                      </div>
                      <div>
                        <div
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            isCurrent
                              ? 'text-[#22577A]'
                              : isCompleted
                              ? 'text-emerald-700'
                              : 'text-slate-400'
                          }`}
                        >
                          Step {step.num}
                        </div>
                        <div className="text-xs font-semibold text-slate-800">{step.label}</div>
                      </div>
                    </div>
                    {idx < steps.length - 1 && (
                      <div className="flex-1 max-w-[60px] h-0.5 mx-2 bg-slate-200">
                        <div
                          className="h-full bg-[#57CC99] transition-all duration-300"
                          style={{
                            width: currentStep > step.num ? '100%' : '0%',
                            backgroundColor: '#0d8065',
                          }}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* STEP 1: PATIENT */}
          {currentStep === 1 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 max-w-3xl mx-auto space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Patient Details</h2>
                <p className="text-xs text-slate-500 mt-0.5">Select patient type and enter contact information</p>
                <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                  Fields marked with <span className="text-red-500 font-bold">*</span> are required
                </p>
              </div>

              {/* Patient Type Radio Switcher */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPatientType('Walk-in Patient');
                    setSelectedRegisteredPatient(null);
                  }}
                  className={`p-3 rounded-xl border text-left font-medium transition-all ${
                    patientType === 'Walk-in Patient'
                      ? 'border-[#22577A] bg-slate-50 text-[#22577A] ring-2 ring-[#22577A]/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-sm">Walk-in Patient</div>
                  <div className="text-xs text-slate-500 mt-0.5">Standard over-the-counter dispensing</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPatientType('Registered Patient');
                    setIsPatientDropdownOpen(true);
                  }}
                  className={`p-3 rounded-xl border text-left font-medium transition-all ${
                    patientType === 'Registered Patient'
                      ? 'border-[#22577A] bg-slate-50 text-[#22577A] ring-2 ring-[#22577A]/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-sm">Registered Patient</div>
                  <div className="text-xs text-slate-500 mt-0.5">Search & link existing patient record</div>
                </button>
              </div>

              {patientType === 'Walk-in Patient' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Patient Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Mark"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 07xxxxxxx"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Search Patient Database <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by patient name, ID (e.g. PAT-001) or phone..."
                        value={patientSearchQuery}
                        onChange={(e) => {
                          setPatientSearchQuery(e.target.value);
                          setIsPatientDropdownOpen(true);
                        }}
                        onFocus={() => setIsPatientDropdownOpen(true)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
                      />
                      {patientSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setPatientSearchQuery('');
                            setIsPatientDropdownOpen(false);
                          }}
                          className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Patient Dropdown Menu */}
                    {isPatientDropdownOpen && (
                      <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100 z-20 relative">
                        {patients.filter(p => 
                          p.name.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
                          p.id.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
                          p.phone.toLowerCase().includes(patientSearchQuery.toLowerCase())
                        ).length === 0 ? (
                          <div className="p-2.5 text-xs text-slate-500 text-center">
                            No matching patient records found in database.
                          </div>
                        ) : (
                          patients.filter(p => 
                            p.name.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
                            p.id.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
                            p.phone.toLowerCase().includes(patientSearchQuery.toLowerCase())
                          ).map((pat) => (
                            <div
                              key={pat.id}
                              onClick={() => {
                                setPatientName(pat.name);
                                setPatientPhone(pat.phone);
                                setSelectedRegisteredPatient(pat);
                                setIsPatientDropdownOpen(false);
                                setPatientSearchQuery('');
                              }}
                              className="p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                            >
                              <div>
                                <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                                  {pat.name}
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-100 text-[#22577A] rounded">
                                    {pat.id}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  Phone: {pat.phone} {pat.age ? `• Age: ${pat.age}` : ''} {pat.gender ? `• ${pat.gender}` : ''}
                                </div>
                                {pat.allergies && (
                                  <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
                                    ⚠️ Allergies: {pat.allergies}
                                  </div>
                                )}
                              </div>
                              <span className="text-xs font-bold text-[#22577A] shrink-0 ml-2">Select</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected Patient Details Card */}
                  {selectedRegisteredPatient ? (
                    <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                            Selected Patient
                          </span>
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-200 text-emerald-900 rounded">
                            {selectedRegisteredPatient.id}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-slate-900">{selectedRegisteredPatient.name}</div>
                        <div className="text-xs text-slate-600">
                          Phone: {selectedRegisteredPatient.phone || 'N/A'} {selectedRegisteredPatient.email ? `• ${selectedRegisteredPatient.email}` : ''}
                        </div>
                        {selectedRegisteredPatient.allergies && (
                          <div className="text-xs text-amber-800 font-semibold bg-amber-100/80 px-2 py-0.5 rounded-md inline-block mt-0.5">
                            ⚠️ Allergies: {selectedRegisteredPatient.allergies}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRegisteredPatient(null);
                          setPatientName('');
                          setPatientPhone('');
                          setIsPatientDropdownOpen(true);
                        }}
                        className="text-xs font-bold text-[#22577A] hover:underline shrink-0"
                      >
                        Change Patient
                      </button>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                      Please use the search box above to select a registered patient from the database.
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setPatientName('');
                    setPatientPhone('');
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Clear
                </button>
                <button
                  type="button"
                  id="btn-step1-next"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2 text-sm font-bold text-white bg-[#22577A] hover:bg-[#1b4662] rounded-xl shadow-xs transition-colors flex items-center gap-2"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PRESCRIPTION */}
          {currentStep === 2 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-2xl mx-auto space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Prescription Details</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Prescription details are optional for OTC purchases but required for controlled substances.
                </p>
              </div>

              <div className="space-y-4">
                {/* Clinician Name (Automatic from settings) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Clinician Name
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={clinicianName}
                    className="w-full px-4 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Automatic From settings (login)</p>
                </div>

                {/* NOTE: License / Registration No SECTION REMOVED per PDF page 3 callout */}

                <div>
                  <DatePicker
                    label="Prescription Date"
                    value={prescriptionDate}
                    onChange={(val) => setPrescriptionDate(val)}
                    quickPresetType="prescription"
                    placeholder="YYYY-MM-DD"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Diagnosis / Indication
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Hypertension, Infection, Mild Pain"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  id="btn-step2-next"
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-[#22577A] hover:bg-[#1b4662] rounded-xl shadow-sm transition-colors flex items-center gap-2"
                >
                  Add Drugs <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DRUGS (ADD DRUGS TO PRESCRIPTION ORDER) */}
          {currentStep === 3 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Add Drugs to Prescription</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Search and select medications. Adjust quantities, dosage frequencies, and routes.
                </p>
              </div>

              {/* Drug Search Combobox */}
              <div className="relative max-w-xl">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, generic name or batch..."
                  value={drugSearch}
                  onChange={(e) => setDrugSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-[#22577A] focus:outline-hidden"
                />

                {/* Auto-complete dropdown */}
                {drugSearch.trim().length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {matchingDrugs.length === 0 ? (
                      <div className="p-4 text-xs text-slate-500 text-center">
                        No available in-stock drugs found.
                      </div>
                    ) : (
                      matchingDrugs.map((drug) => (
                        <button
                          key={drug.id}
                          type="button"
                          onClick={() => handleAddDrugToOrder(drug)}
                          className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-center justify-between text-sm"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{drug.name}</span>
                            <span className="text-xs text-slate-400 ml-2">({drug.genericName})</span>
                          </div>
                          <div className="text-xs text-right">
                            <span className="font-bold text-[#22577A]">
                              {settings.currency} {(drug.sellingPrice || 0).toFixed(2)}
                            </span>
                            <span className="text-slate-400 ml-2">In stock: {drug.qty}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Added Items List */}
              <div className="space-y-4">
                {selectedItems.length === 0 ? (
                  <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-sm">
                    No drugs added yet. Use the search bar above to select medications.
                  </div>
                ) : (
                  selectedItems.map((item, idx) => (
                    <div
                      key={`${item.drugId}-${idx}`}
                      className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4 shadow-2xs"
                    >
                      {/* Drug Header */}
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div>
                          <h4 className="font-bold text-slate-900 text-base">{item.drugName}</h4>
                          <p className="text-xs text-slate-500">
                            Batch: {item.batchNo} | Expires: {item.expiryDate} | In stock: {item.availableQty}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Interactive Controls matching Page 3 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Qty with Up and Down Buttons */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Qty</label>
                          <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleQtyChange(idx, item.qty - 1)}
                              className="px-3 py-2 text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={item.availableQty}
                              value={item.qty}
                              onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                              className="w-full text-center text-sm font-bold text-slate-900 focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => handleQtyChange(idx, item.qty + 1)}
                              className="px-3 py-2 text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Unit Price (KES) */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Unit Price ({settings.currency})
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={`${(item.unitPrice || 0).toFixed(2)}`}
                            className="w-full px-3 py-2 text-sm font-semibold bg-slate-100 border border-slate-200 rounded-lg text-slate-700"
                          />
                        </div>

                        {/* Frequency Dropdown */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Frequency</label>
                          <select
                            value={item.frequency}
                            onChange={(e) =>
                              handleItemFieldChange(idx, 'frequency', e.target.value as HealthcareFrequency)
                            }
                            className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:border-[#22577A] focus:outline-hidden"
                          >
                            {FREQUENCIES.map((freq) => (
                              <option key={freq} value={freq}>
                                {freq}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Route Dropdown */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Route</label>
                          <select
                            value={item.route}
                            onChange={(e) =>
                              handleItemFieldChange(idx, 'route', e.target.value as HealthcareRoute)
                            }
                            className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:border-[#22577A] focus:outline-hidden"
                          >
                            {ROUTES.map((rt) => (
                              <option key={rt} value={rt}>
                                {rt}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Duration & Special Instructions */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Duration</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              value={item.duration}
                              onChange={(e) =>
                                handleItemFieldChange(idx, 'duration', parseInt(e.target.value) || 1)
                              }
                              className="w-20 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden"
                            />
                            <select
                              value={item.durationUnit}
                              onChange={(e) => handleItemFieldChange(idx, 'durationUnit', e.target.value)}
                              className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-hidden"
                            >
                              <option value="Days">Days</option>
                              <option value="Weeks">Weeks</option>
                              <option value="Months">Months</option>
                            </select>
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Special Instructions
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Take with food, after meals"
                            value={item.specialInstructions || ''}
                            onChange={(e) => handleItemFieldChange(idx, 'specialInstructions', e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden"
                          />
                        </div>
                      </div>

                      {/* Line Total */}
                      <div className="text-right pt-2 border-t border-slate-200">
                        <span className="text-xs text-slate-500 font-medium">Line Total: </span>
                        <span className="text-sm font-bold text-[#22577A]">
                          {settings.currency} {(item.lineTotal || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer Total & Navigation Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Subtotal Due</div>
                    <div className="text-xl font-bold text-slate-900">
                      {settings.currency} {(subtotal || 0).toFixed(2)}
                    </div>
                  </div>
                  <button
                    type="button"
                    id="btn-step3-next"
                    disabled={selectedItems.length === 0}
                    onClick={() => setCurrentStep(4)}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-[#22577A] hover:bg-[#1b4662] disabled:opacity-50 rounded-xl shadow-sm transition-colors flex items-center gap-2"
                  >
                    Payment <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PAYMENT */}
          {currentStep === 4 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Payment Methods Left Column */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Payment Method</h2>
                  <p className="text-xs text-slate-500 mt-1">Select cash or mobile money payment</p>
                  <p className="text-[11px] text-slate-500 font-normal mt-1">
                    Fields marked with <span className="text-red-500 font-bold">*</span> are required
                  </p>
                </div>

                {/* Payment Method Tabs (Remove Insurance button per PDF) */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Cash')}
                    className={`p-4 rounded-xl border text-center font-bold text-sm transition-all ${
                      paymentMethod === 'Cash'
                        ? 'border-[#22577A] bg-slate-50 text-[#22577A] ring-2 ring-[#22577A]/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Cash Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('M-Pesa')}
                    className={`p-4 rounded-xl border text-center font-bold text-sm transition-all ${
                      paymentMethod === 'M-Pesa'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    M-Pesa Payment
                  </button>
                </div>

                {/* CASH DETAILS */}
                {paymentMethod === 'Cash' && (
                  <div className="space-y-4 p-5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cash Tendered ({settings.currency}) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={totalAmount}
                        step="0.01"
                        placeholder="0.00"
                        value={cashTendered}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCashTendered(val === '' ? '' : parseFloat(val) || 0);
                        }}
                        className="w-full px-4 py-2.5 text-base font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
                      />
                    </div>

                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        Change Due:
                      </span>
                      <span className="text-xl font-bold text-emerald-700">
                        {settings.currency} {(changeAmount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* M-PESA DETAILS (Section to add last four digits per PDF) */}
                {paymentMethod === 'M-Pesa' && (
                  <div className="space-y-4 p-5 bg-emerald-50/60 rounded-xl border border-emerald-200">
                    <div>
                      <label className="block text-xs font-semibold text-emerald-900 mb-1">
                        M-Pesa Transaction Code (or last 4 digits) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. QK89 or QK89X4029"
                        value={mpesaCode}
                        onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                        className="w-full px-4 py-2.5 text-base font-bold text-emerald-900 uppercase bg-white border border-emerald-300 rounded-xl focus:border-emerald-600 focus:outline-hidden"
                      />
                      <p className="text-xs text-emerald-700 mt-1">
                        In MPESA there should be a section to add last four digits of transaction code
                      </p>
                    </div>
                  </div>
                )}

                {/* Discount optional */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Discount ({settings.currency})</label>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="button"
                    id="btn-complete-record"
                    onClick={handleCompleteAndRecord}
                    className="px-6 py-3 text-sm font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-2"
                    style={{ backgroundColor: '#0d8065' }}
                  >
                    <CheckCircle2 className="w-5 h-5" /> Complete & Record
                  </button>
                </div>
              </div>

              {/* Order Summary Right Panel */}
              <div className="bg-[#22577A] text-white rounded-xl p-6 shadow-sm space-y-6 flex flex-col justify-between h-auto">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/80 border-b border-white/20 pb-3">
                    Order Summary
                  </h3>

                  {/* Patient Info */}
                  <div className="py-3 border-b border-white/20 text-xs text-white/90 space-y-1">
                    <div><strong>Patient:</strong> {patientName}</div>
                    <div><strong>Method:</strong> {paymentMethod}</div>
                    <div><strong>Dr:</strong> {clinicianName}</div>
                  </div>

                  {/* Items List - Autoscales in length based on ordered items */}
                  <div className="py-3 space-y-2">
                    {selectedItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-0.5 border-b border-white/10 last:border-0">
                        <span className="text-white/90 truncate pr-2 font-medium">
                          {item.drugName} × {item.qty}
                        </span>
                        <span className="font-bold text-white shrink-0">
                          {settings.currency} {(item.lineTotal || 0).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/20">
                  <div className="flex justify-between text-xs text-white/80 font-medium">
                    <span>Subtotal</span>
                    <span>{settings.currency} {(subtotal || 0).toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-xs text-emerald-300 font-medium">
                      <span>Discount</span>
                      <span>-{settings.currency} {(discountAmount || 0).toFixed(2)}</span>
                    </div>
                  )}

                  {/* Prominent High-Visibility Total Due Display for Cashiers */}
                  <div className="bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/20 space-y-1 mt-2">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-white/80">Total Due</span>
                    <div className="text-3xl sm:text-4xl font-black text-[#57CC99] tracking-tight">
                      {settings.currency} {(totalAmount || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: RECEIPT & SUCCESS */}
          {currentStep === 5 && completedTxn && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Success Banner */}
              <div className="p-4 bg-emerald-600 text-white rounded-xl shadow-md flex items-center justify-between no-print">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 shrink-0 text-white" />
                  <div>
                    <h3 className="font-bold text-base">Transaction completed successfully!</h3>
                    <p className="text-xs text-emerald-100 font-medium">
                      {completedTxn.id} — {settings.currency} {(completedTxn.totalAmount || 0).toFixed(2)} via {completedTxn.paymentMethod}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs no-print">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" /> Print Receipt
                  </button>
                  <button
                    onClick={() => setActiveLabelModal(true)}
                    className="px-4 py-2 text-xs font-bold text-[#22577A] bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Tag className="w-4 h-4" /> Drug Labels
                  </button>
                </div>
                <button
                  id="btn-new-dispensing-success"
                  onClick={handleStartNewDispensing}
                  className="px-5 py-2 text-xs font-bold text-white rounded-lg shadow-xs transition-colors"
                  style={{ backgroundColor: '#0d8065' }}
                >
                  + New Dispensing
                </button>
              </div>

              {/* RECEIPT PRINT CARD (Monospace font as specified on page 3) */}
              <div className={`printable-area bg-white p-8 rounded-xl border border-slate-300 shadow-md max-w-md mx-auto font-mono text-xs text-slate-800 space-y-4 ${historyReceiptTxn || activeLabelModal ? 'no-print' : ''}`}>
                <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-4">
                  <h2 className="text-base font-bold uppercase">{settings.pharmacyName}</h2>
                  <p className="text-[11px] text-slate-600">{settings.address}</p>
                  <p className="text-[11px] text-slate-600">Tel: {settings.phone}</p>
                  <div className="font-bold text-sm tracking-widest pt-1 uppercase">RECEIPT</div>
                </div>

                <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
                  <div className="flex justify-between">
                    <span>TXN ID:</span>
                    <span className="font-bold">{completedTxn.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{completedTxn.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Patient:</span>
                    <span>{completedTxn.patientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Method:</span>
                    <span>{completedTxn.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dr:</span>
                    <span>{completedTxn.clinicianName}</span>
                  </div>
                </div>

                {/* Items Table */}
                <div className="space-y-2 border-b border-dashed border-slate-300 pb-3">
                  {(completedTxn?.items || []).map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="font-bold text-slate-900">{item.drugName}</div>
                      <div className="flex justify-between text-[11px] text-slate-600">
                        <span>
                          {item.qty} x {(item.unitPrice || 0).toFixed(2)} ({item.frequency ? item.frequency.split(' ')[0] : 'Oral'})
                        </span>
                        <span className="font-bold">
                          {settings.currency} {(item.lineTotal || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-1.5 text-xs pt-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{settings.currency} {(completedTxn.subtotal ?? completedTxn.totalAmount ?? 0).toFixed(2)}</span>
                  </div>
                  {(completedTxn.discount || 0) > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount:</span>
                      <span>-{settings.currency} {(completedTxn.discount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm border-t border-slate-300 pt-1">
                    <span>TOTAL:</span>
                    <span>{settings.currency} {(completedTxn.totalAmount || 0).toFixed(2)}</span>
                  </div>
                  {completedTxn.paymentMethod === 'Cash' && (
                    <>
                      <div className="flex justify-between text-[11px] text-slate-600">
                        <span>Tendered:</span>
                        <span>{settings.currency} {(completedTxn.cashTendered || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-900">
                        <span>Change:</span>
                        <span>{settings.currency} {(completedTxn.changeAmount || 0).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  {completedTxn.paymentMethod === 'M-Pesa' && (
                    <div className="flex justify-between text-[11px] font-bold text-emerald-800">
                      <span>M-Pesa Ref:</span>
                      <span>{completedTxn.mpesaCode}</span>
                    </div>
                  )}
                </div>

                {/* Receipt Footer */}
                <div className="text-center text-[10px] text-slate-500 border-t border-dashed border-slate-300 pt-4 space-y-1">
                  <p>Thank you for your business. Quick recovery!</p>
                  <p className="font-mono text-[9px] text-slate-400">Software: PharmaTrack POS</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: HISTORY TABLE */}
      {dispenseView === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Dispensing Transaction Log</h2>
            <button
              onClick={() => {
                setDispenseView('new');
                handleStartNewDispensing();
              }}
              className="px-4 py-2 text-xs font-bold text-white rounded-lg shadow-xs"
              style={{ backgroundColor: '#0d8065' }}
            >
              + New Dispensing
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">TXN ID</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Patient Name</th>
                  <th className="py-3.5 px-4">Items Count</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {(transactions || []).map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#22577A]">{txn.id}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">{txn.date}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{txn.patientName}</td>
                    <td className="py-3.5 px-4 text-xs font-semibold">{(txn.items || []).length} item(s)</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {settings.currency} {txn.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-800">
                        {txn.paymentMethod} {txn.mpesaCode ? `(${txn.mpesaCode})` : ''}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                        Completed
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenHistoryReceipt(txn, true)}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-[#22577A] hover:bg-[#1a4460] rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          title="Print Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print Receipt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenHistoryReceipt(txn, false)}
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-[#22577A] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="View Transaction Receipt"
                        >
                          <ReceiptIcon className="w-3.5 h-3.5" /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* POS Receipt Modal for Dispensing History */}
      {historyReceiptTxn && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 no-print">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Transaction Receipt</h3>
                <p className="text-xs text-slate-500 font-medium">Txn ID: {historyReceiptTxn.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryReceiptTxn(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* RECEIPT PRINTABLE AREA */}
            <div className="overflow-y-auto flex-1 p-2">
              <div className="printable-area pos-receipt-printable bg-white p-6 rounded-xl border border-slate-300 shadow-xs max-w-sm mx-auto font-mono text-xs text-slate-800 space-y-3">
                {/* Header */}
                <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-3">
                  <h2 className="text-sm font-bold uppercase">{settings.pharmacyName}</h2>
                  <p className="text-[10px] text-slate-600">{settings.address}</p>
                  <p className="text-[10px] text-slate-600">Tel: {settings.phone}</p>
                  <div className="font-bold text-xs tracking-widest pt-1 uppercase text-slate-900">RECEIPT</div>
                </div>

                {/* Transaction Metadata */}
                <div className="space-y-1 text-[10px] border-b border-dashed border-slate-300 pb-2">
                  <div className="flex justify-between">
                    <span>TXN ID:</span>
                    <span className="font-bold">{historyReceiptTxn.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{historyReceiptTxn.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Patient:</span>
                    <span className="font-bold">{historyReceiptTxn.patientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Method:</span>
                    <span>{historyReceiptTxn.paymentMethod}</span>
                  </div>
                  {historyReceiptTxn.clinicianName && (
                    <div className="flex justify-between">
                      <span>Clinician:</span>
                      <span>{historyReceiptTxn.clinicianName}</span>
                    </div>
                  )}
                </div>

                {/* Items Breakdown */}
                <div className="space-y-2 border-b border-dashed border-slate-300 pb-3">
                  <div className="text-[10px] font-bold uppercase text-slate-500 pb-0.5 border-b border-slate-200 flex justify-between">
                    <span>ITEM</span>
                    <span>TOTAL</span>
                  </div>
                  {(historyReceiptTxn?.items || []).map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="font-bold text-slate-900 text-xs">{item.drugName}</div>
                      <div className="flex justify-between text-[10px] text-slate-600">
                        <span>
                          {item.qty} x {(item.unitPrice || 0).toFixed(2)} ({item.frequency?.split(' ')[0] || 'Oral'})
                        </span>
                        <span className="font-bold text-slate-800">
                          {settings.currency} {(item.lineTotal || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Financial Totals */}
                <div className="space-y-1 text-xs pt-1">
                  <div className="flex justify-between text-[11px]">
                    <span>Subtotal:</span>
                    <span>{settings.currency} {(historyReceiptTxn.subtotal || historyReceiptTxn.totalAmount || 0).toFixed(2)}</span>
                  </div>
                  {(historyReceiptTxn.discount || 0) > 0 && (
                    <div className="flex justify-between text-[11px] text-emerald-700 font-semibold">
                      <span>Discount:</span>
                      <span>-{settings.currency} {(historyReceiptTxn.discount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm border-t border-slate-300 pt-1 text-slate-900">
                    <span>TOTAL:</span>
                    <span>{settings.currency} {(historyReceiptTxn.totalAmount || 0).toFixed(2)}</span>
                  </div>
                  {historyReceiptTxn.paymentMethod === 'Cash' && (
                    <>
                      <div className="flex justify-between text-[10px] text-slate-600 pt-0.5">
                        <span>Cash Tendered:</span>
                        <span>{settings.currency} {(historyReceiptTxn.cashTendered || historyReceiptTxn.totalAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-800">
                        <span>Change:</span>
                        <span>{settings.currency} {(historyReceiptTxn.changeAmount || 0).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  {historyReceiptTxn.paymentMethod === 'M-Pesa' && historyReceiptTxn.mpesaCode && (
                    <div className="flex justify-between text-[10px] font-bold text-emerald-800 pt-0.5">
                      <span>M-Pesa Ref:</span>
                      <span>{historyReceiptTxn.mpesaCode}</span>
                    </div>
                  )}
                </div>

                {/* Receipt Footer */}
                <div className="text-center text-[10px] text-slate-500 border-t border-dashed border-slate-300 pt-3 space-y-0.5">
                  <p>Thank you for visiting {settings.pharmacyName}</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 no-print">
              <button
                type="button"
                onClick={() => setHistoryReceiptTxn(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-bold text-white bg-[#22577A] hover:bg-[#1a4460] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drug Label Modal */}
      {activeLabelModal && completedTxn && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 no-print">
              <h3 className="font-bold text-slate-900 text-base">Prescription Bottle Labels</h3>
              <button onClick={() => setActiveLabelModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="space-y-3 printable-area">
              {(completedTxn?.items || []).map((item, idx) => (
                <div key={idx} className="p-4 border-2 border-slate-800 rounded-xl bg-amber-50/40 text-xs font-mono space-y-1">
                  <div className="font-bold uppercase text-slate-900">{settings.pharmacyName}</div>
                  <div>Patient: <strong>{completedTxn?.patientName}</strong> Date: {completedTxn?.prescriptionDate || (completedTxn?.date || '').slice(0, 10)}</div>
                  <div className="border-t border-slate-400 my-1 pt-1 font-bold text-sm text-[#22577A]">{item.drugName}</div>
                  <div>Inst: <strong>{item.frequency}</strong> via <strong>{item.route}</strong></div>
                  <div>Duration: {item.duration} {item.durationUnit}</div>
                  {item.specialInstructions && <div className="text-[10px] text-slate-600 italic">Note: {item.specialInstructions}</div>}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 no-print">
              <button onClick={() => setActiveLabelModal(false)} className="px-4 py-2 text-xs font-medium bg-slate-100 rounded-lg">
                Close
              </button>
              <button type="button" onClick={() => window.print()} className="px-4 py-2 text-xs font-bold text-white bg-[#22577A] rounded-lg cursor-pointer">
                Print Bottle Labels
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
