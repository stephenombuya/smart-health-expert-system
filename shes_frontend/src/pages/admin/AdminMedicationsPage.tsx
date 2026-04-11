/**
 * Admin Medication Catalogue Management Page
 * Place at: shes_frontend/src/pages/admin/AdminMedicationsPage.tsx
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useAdminMedications,
  useCreateMedication,
  useUpdateMedication,
  useDeleteMedication,
} from "../../hooks/useAdmin";
import type { AdminMedication } from "../../api/admin";

// ─── Schema ───────────────────────────────────────────────────────────────────

const medSchema = z.object({
  name:              z.string().min(1, "Required"),
  generic_name:      z.string().min(1, "Required"),
  drug_class:        z.string().min(1, "Required"),
  common_uses:       z.string().optional(),
  standard_dosage:   z.string().optional(),
  contraindications: z.string().optional(),
  side_effects:      z.string().optional(),
  is_keml_listed:    z.boolean().default(true),
});

type MedForm = z.infer<typeof medSchema>;

// ─── Modal ────────────────────────────────────────────────────────────────────

function MedicationModal({
  existing,
  onClose,
}: {
  existing?: AdminMedication;
  onClose: () => void;
}) {
  const { mutate: create, isPending: creating } = useCreateMedication();
  const { mutate: update, isPending: updating } = useUpdateMedication();
  const isPending = creating || updating;

  const { register, handleSubmit, formState: { errors } } = useForm<MedForm>({
    resolver: zodResolver(medSchema),
    defaultValues: existing
      ? { ...existing }
      : { is_keml_listed: true },
  });

  const onSubmit = (data: MedForm) => {
    if (existing) {
      update({ id: existing.id, payload: data }, { onSuccess: onClose });
    } else {
      create(data as Omit<AdminMedication, "id">, { onSuccess: onClose });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-white">
            {existing ? "Edit Medication" : "Add Medication"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Brand Name *</label>
              <input {...register("name")} className="admin-input" placeholder="Metformin HCl" />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Generic Name *</label>
              <input {...register("generic_name")} className="admin-input" placeholder="Metformin" />
              {errors.generic_name && <p className="text-red-400 text-xs mt-1">{errors.generic_name.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Drug Class *</label>
            <input {...register("drug_class")} className="admin-input" placeholder="Biguanide" />
            {errors.drug_class && <p className="text-red-400 text-xs mt-1">{errors.drug_class.message}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Common Uses</label>
            <textarea {...register("common_uses")} rows={2} className="admin-input resize-none" placeholder="Type 2 Diabetes management…" />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Standard Dosage</label>
            <input {...register("standard_dosage")} className="admin-input" placeholder="500mg twice daily with meals" />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Contraindications</label>
            <textarea {...register("contraindications")} rows={2} className="admin-input resize-none" placeholder="Renal impairment, hepatic failure…" />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Side Effects</label>
            <textarea {...register("side_effects")} rows={2} className="admin-input resize-none" placeholder="GI upset, lactic acidosis (rare)…" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register("is_keml_listed")} className="w-4 h-4 accent-teal-500" />
            <span className="text-sm text-gray-300">Listed on Kenya Essential Medicines List (KEML)</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending} className="flex-1 btn-primary">
              {isPending ? "Saving…" : existing ? "Save Changes" : "Add Medication"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminMedicationsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editMed, setEditMed] = useState<AdminMedication | null>(null);

  const { data, isLoading } = useAdminMedications({
    search: search || undefined,
    page,
  });

  const { mutate: deleteMed } = useDeleteMedication();

  const meds: AdminMedication[] = (data?.results as any)?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / 20);

  const handleDelete = (med: AdminMedication) => {
    if (window.confirm(`Delete "${med.name}" from the catalogue? This cannot be undone.`)) {
      deleteMed(med.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Medication Catalogue</h2>
          <p className="text-sm text-gray-500 mt-0.5">{totalCount} medications in KEML catalogue</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + Add Medication
        </button>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        placeholder="Search by name or generic name…"
        className="admin-input w-full max-w-md"
      />

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <div className="w-7 h-7 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {meds.length === 0 ? (
            <div className="col-span-full text-center py-16 text-gray-500">
              No medications found.
            </div>
          ) : (
            meds.map((m) => (
              <div
                key={m.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{m.name}</p>
                    <p className="text-gray-400 text-xs">{m.generic_name}</p>
                  </div>
                  {m.is_keml_listed && (
                    <span className="text-xs bg-teal-900/50 text-teal-300 border border-teal-700 px-2 py-0.5 rounded-full flex-shrink-0">
                      KEML
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-900 px-2 py-0.5 rounded-full">
                    {m.drug_class}
                  </span>
                </div>
                {m.common_uses && (
                  <p className="text-gray-500 text-xs line-clamp-2">{m.common_uses}</p>
                )}
                <div className="flex gap-3 pt-1 border-t border-gray-800">
                  <button
                    onClick={() => setEditMed(m)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(m)}
                    className="text-xs text-red-400 hover:text-red-300 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? "bg-teal-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {showModal && <MedicationModal onClose={() => setShowModal(false)} />}
      {editMed   && <MedicationModal existing={editMed} onClose={() => setEditMed(null)} />}
    </div>
  );
}