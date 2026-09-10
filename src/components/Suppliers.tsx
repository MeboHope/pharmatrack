
import React, { useEffect, useState } from "react";
import {
  Pencil,
  Plus,
  Phone,
  Mail,
  MapPin,
  Clock,
  AlertCircle,
  X,
  RefreshCw,
  Trash2,
} from "lucide-react";

import type {
  Supplier,
  UserAccount,
} from "../types";

import {
  pharmacyDataService,
} from "../services/pharmacyData";

interface SuppliersProps {
  suppliers: Supplier[];
  currentUser: UserAccount;
  onAddSupplier: (supplier: Supplier) => void;
  onUpdateSupplier?: (supplier: Supplier) => void;
}

interface SupplierFormData {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  leadTimeDays: number;
}

const emptyForm: SupplierFormData = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  leadTimeDays: 2,
};

export const Suppliers: React.FC<SuppliersProps> = ({
  suppliers,
  currentUser,
  onAddSupplier,
  onUpdateSupplier,
}) => {
  const [items, setItems] =
    useState<Supplier[]>(suppliers);

  const [showModal, setShowModal] =
    useState(false);

  const [editingSupplier, setEditingSupplier] =
    useState<Supplier | null>(null);

  const [supplierToDelete, setSupplierToDelete] =
    useState<Supplier | null>(null);

  const [formData, setFormData] =
    useState<SupplierFormData>(emptyForm);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [error, setError] =
    useState("");

  const isAdmin =
    currentUser.role === "Admin";

  useEffect(() => {
    setItems(suppliers);
  }, [suppliers]);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingSupplier(null);
    setError("");
  };

  const closeModal = () => {
    if (isSaving) return;

    setShowModal(false);
    resetForm();
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEditModal = (
    supplier: Supplier,
  ) => {
    setEditingSupplier(supplier);

    setFormData({
      name: supplier.name,
      contactPerson:
        supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      leadTimeDays:
        Number.isFinite(
          supplier.leadTimeDays,
        )
          ? supplier.leadTimeDays
          : 2,
    });

    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    const name =
      formData.name.trim();

    const contactPerson =
      formData.contactPerson.trim();

    const phone =
      formData.phone.trim();

    const email =
      formData.email
        .trim()
        .toLowerCase();

    const address =
      formData.address.trim();

    const leadTimeDays =
      Number(formData.leadTimeDays);

    if (!name) {
      setError(
        "Company name is required.",
      );
      return;
    }

    if (!phone) {
      setError(
        "Supplier phone number is required.",
      );
      return;
    }

    if (
      !Number.isInteger(
        leadTimeDays,
      ) ||
      leadTimeDays < 1
    ) {
      setError(
        "Lead time must be at least 1 day.",
      );
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        name,
        contactPerson,
        phone,
        email,
        address,
        leadTimeDays,
      };

      if (editingSupplier) {
        const updated =
          await pharmacyDataService.updateSupplier(
            editingSupplier.id,
            payload,
          );

        setItems(
          (previous) =>
            previous.map(
              (supplier) =>
                supplier.id ===
                updated.id
                  ? updated
                  : supplier,
            ),
        );

        onUpdateSupplier?.(
          updated,
        );
      } else {
        const created =
          await pharmacyDataService.createSupplier(
            payload,
          );

        setItems(
          (previous) => [
            created,
            ...previous,
          ],
        );

        onAddSupplier(
          created,
        );
      }

      setShowModal(false);
      resetForm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editingSupplier
            ? "Unable to update supplier."
            : "Unable to create supplier.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSupplier =
    async () => {
      if (
        !supplierToDelete ||
        !isAdmin
      ) {
        return;
      }

      setIsDeleting(true);
      setError("");

      try {
        await pharmacyDataService.deleteSupplier(
          supplierToDelete.id,
        );

        setItems(
          (previous) =>
            previous.filter(
              (supplier) =>
                supplier.id !==
                supplierToDelete.id,
            ),
        );

        setSupplierToDelete(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to delete supplier.",
        );
      } finally {
        setIsDeleting(false);
      }
    };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Suppliers Directory
          </h1>

          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage pharmaceutical vendors,
            procurement lead times, and contact
            details
          </p>
        </div>

        <button
          type="button"
          onClick={
            handleOpenAddModal
          }
          className="px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
          style={{
            backgroundColor:
              "#0d8065",
          }}
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Add Supplier
        </button>
      </div>

      {error && !showModal && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />

          <div>
            <strong>
              Operation failed
            </strong>

            <p className="mt-0.5">
              {error}
            </p>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <p className="text-sm text-slate-500">
            No suppliers have been
            registered yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(
            (supplier) => (
              <div
                key={
                  supplier.id
                }
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {supplier.name}
                    </h3>

                    <span className="text-xs text-[#22577A] font-semibold">
                      {supplier.id}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenEditModal(
                          supplier,
                        )
                      }
                      className="px-3 py-1.5 text-xs font-semibold text-[#22577A] bg-sky-50 hover:bg-[#22577A] hover:text-white rounded-lg transition-colors flex items-center gap-1.5 border border-sky-100 shadow-sm cursor-pointer"
                      title="Edit Supplier"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>
                        Edit
                      </span>
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          setSupplierToDelete(
                            supplier,
                          )
                        }
                        className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-lg transition-colors flex items-center gap-1.5 border border-rose-100 shadow-sm cursor-pointer"
                        title="Delete Supplier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>
                          Delete
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">
                      Contact Person:
                    </span>

                    {supplier.contactPerson ||
                      "Not provided"}
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {supplier.phone}
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {supplier.email ||
                      "Not provided"}
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {supplier.address ||
                      "Not provided"}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Lead time:
                  </span>

                  <span className="font-bold text-[#22577A] bg-slate-100 px-2 py-0.5 rounded-md">
                    {
                      supplier.leadTimeDays
                    }{" "}
                    Days
                  </span>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingSupplier
                    ? `Edit Supplier (${editingSupplier.id})`
                    : "Add Supplier"}
                </h2>

                <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                  Fields marked with{" "}
                  <span className="text-red-500 font-bold">
                    *
                  </span>{" "}
                  are required.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  isSaving
                }
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />

                <span>
                  {error}
                </span>
              </div>
            )}

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Company Name{" "}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <input
                  type="text"
                  required
                  value={
                    formData.name
                  }
                  onChange={(
                    event,
                  ) =>
                    setFormData({
                      ...formData,
                      name: event
                        .target
                        .value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#22577A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Contact Person
                </label>

                <input
                  type="text"
                  value={
                    formData.contactPerson
                  }
                  onChange={(
                    event,
                  ) =>
                    setFormData({
                      ...formData,
                      contactPerson:
                        event
                          .target
                          .value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#22577A] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Phone{" "}
                    <span className="text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    type="text"
                    required
                    value={
                      formData.phone
                    }
                    onChange={(
                      event,
                    ) =>
                      setFormData({
                        ...formData,
                        phone: event
                          .target
                          .value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#22577A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Lead Time (Days)
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      formData.leadTimeDays
                    }
                    onChange={(
                      event,
                    ) => {
                      const value =
                        Number(
                          event
                            .target
                            .value,
                        );

                      setFormData({
                        ...formData,
                        leadTimeDays:
                          Number.isFinite(
                            value,
                          ) &&
                          value >=
                            1
                            ? Math.floor(
                                value,
                              )
                            : 1,
                      });
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#22577A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Email
                </label>

                <input
                  type="email"
                  value={
                    formData.email
                  }
                  onChange={(
                    event,
                  ) =>
                    setFormData({
                      ...formData,
                      email: event
                        .target
                        .value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#22577A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Address
                </label>

                <input
                  type="text"
                  value={
                    formData.address
                  }
                  onChange={(
                    event,
                  ) =>
                    setFormData({
                      ...formData,
                      address:
                        event
                          .target
                          .value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#22577A] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={
                    isSaving
                  }
                  className="px-4 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isSaving
                  }
                  className="px-5 py-2 text-xs font-bold text-white rounded-lg hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{
                    backgroundColor:
                      "#0d8065",
                  }}
                >
                  {isSaving && (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  )}

                  {isSaving
                    ? "Saving..."
                    : editingSupplier
                      ? "Update Supplier"
                      : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {supplierToDelete && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Delete Supplier
                  </h2>

                  <p className="text-xs text-slate-500 mt-1">
                    This action will remove the
                    supplier from the active supplier
                    list.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSupplierToDelete(
                    null,
                  )
                }
                disabled={
                  isDeleting
                }
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-sm font-bold text-slate-900">
                {
                  supplierToDelete.name
                }
              </p>

              <p className="text-xs text-slate-500 mt-1">
                ID:{" "}
                {
                  supplierToDelete.id
                }
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <strong>
                Please confirm.
              </strong>{" "}
              Make sure this supplier is no longer
              needed before deleting it.
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setSupplierToDelete(
                    null,
                  )
                }
                disabled={
                  isDeleting
                }
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleDeleteSupplier
                }
                disabled={
                  isDeleting
                }
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-60 flex items-center gap-2"
              >
                {isDeleting && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                )}

                {isDeleting
                  ? "Deleting..."
                  : "Yes, Delete Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;