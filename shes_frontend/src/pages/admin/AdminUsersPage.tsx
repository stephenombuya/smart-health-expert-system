/**
 * Admin User Management Page
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useAdminUsers,
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
  useReactivateUser,
} from "@/hooks/useAdmin";
import type { AdminUser } from "@/api/admin";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  email:      z.string().email("Valid email required"),
  password:   z.string().min(10, "Minimum 10 characters"),
  first_name: z.string().min(1, "Required"),
  last_name:  z.string().min(1, "Required"),
  role:       z.enum(["patient", "doctor", "admin"]),
});

type CreateForm = z.infer<typeof createSchema>;

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    admin:   "bg-amber-900/50 text-amber-300 border-amber-700",
    doctor:  "bg-indigo-900/50 text-indigo-300 border-indigo-700",
    patient: "bg-teal-900/50 text-teal-300 border-teal-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[role] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
      {role}
    </span>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${active ? "text-green-400" : "text-gray-500"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-green-400" : "bg-gray-600"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ─── Create User Modal ────────────────────────────────────────────────────────

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const { mutate, isPending, error } = useCreateUser();
  const { register, handleSubmit, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: "patient" },
  });

  const onSubmit = (data: CreateForm) => {
    mutate(data, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-white">Create New User</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">First Name</label>
              <input {...register("first_name")} className="admin-input" placeholder="Jane" />
              {errors.first_name && <p className="text-red-400 text-xs mt-1">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Last Name</label>
              <input {...register("last_name")} className="admin-input" placeholder="Doe" />
              {errors.last_name && <p className="text-red-400 text-xs mt-1">{errors.last_name.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Email</label>
            <input {...register("email")} className="admin-input" type="email" placeholder="jane@example.com" />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Password</label>
            <input {...register("password")} className="admin-input" type="password" placeholder="Min. 10 characters" />
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Role</label>
            <select {...register("role")} className="admin-input">
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">
              {(error as Error).message}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="flex-1 btn-primary">
              {isPending ? "Creating…" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Role Modal ──────────────────────────────────────────────────────────

function EditUserModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const { mutate, isPending } = useUpdateUser();
  const [role, setRole] = useState(user.role);

  const handleSave = () => {
    mutate({ id: user.id, payload: { role } }, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-white">Edit User</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="mb-4">
          <p className="text-white font-medium">{user.first_name} {user.last_name}</p>
          <p className="text-sm text-gray-400">{user.email}</p>
        </div>

        <div className="mb-5">
          <label className="block text-xs text-gray-400 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AdminUser["role"])}
            className="admin-input"
          >
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={isPending} className="flex-1 btn-primary">
            {isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);

  const { data, isLoading } = useAdminUsers({
    search: search || undefined,
    role:   roleFilter || undefined,
    is_active: activeFilter,
    page,
  });

  const { mutate: deactivate } = useDeactivateUser();
  const { mutate: reactivate } = useReactivateUser();

  const users: AdminUser[] = (data?.results as any)?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">User Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">{totalCount} total users</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + New User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or email…"
          className="admin-input flex-1 min-w-48"
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="admin-input w-36"
        >
          <option value="">All roles</option>
          <option value="patient">Patient</option>
          <option value="doctor">Doctor</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={activeFilter === undefined ? "" : String(activeFilter)}
          onChange={(e) => {
            const v = e.target.value;
            setActiveFilter(v === "" ? undefined : v === "true");
            setPage(1);
          }}
          className="admin-input w-36"
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-7 h-7 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Joined</th>
                <th className="px-4 py-3 text-left">Last Login</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">
                      {u.first_name} {u.last_name}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{u.email}</td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3"><StatusDot active={u.is_active} /></td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(u.date_joined).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditUser(u)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          Edit
                        </button>
                        {u.is_active ? (
                          <button
                            onClick={() => deactivate(u.id)}
                            className="text-xs text-red-400 hover:text-red-300 font-medium"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => reactivate(u.id)}
                            className="text-xs text-green-400 hover:text-green-300 font-medium"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
      {editUser   && <EditUserModal user={editUser} onClose={() => setEditUser(null)} />}
    </div>
  );
}