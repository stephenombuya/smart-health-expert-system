/**
 * Admin Hooks (TanStack Query v5)
    * Provides hooks for admin-related data fetching and mutations.
    * Includes user management, triage sessions, medications, stats, and audit logs.
    * Each hook is designed to work with the corresponding API functions and includes appropriate query keys and invalidation strategies.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminOverview, getAdminUsers, getAdminUser,
  createAdminUser, updateAdminUser, deactivateUser, reactivateUser,
  getAdminTriageSessions, getAdminMedications,
  createMedication, updateMedication, deleteMedication,
  getAdminStats, getAuditLog,
} from "../api/admin";

const K = {
  overview:    ["admin", "overview"]              as const,
  users:       (p?: object) => ["admin", "users", p] as const,
  user:        (id: string) => ["admin", "user", id] as const,
  triage:      (p?: object) => ["admin", "triage", p] as const,
  meds:        (p?: object) => ["admin", "meds", p]   as const,
  stats:       ["admin", "stats"]                 as const,
  audit:       (n: number)  => ["admin", "audit", n]  as const,
};

export function useAdminOverview() {
  return useQuery({ queryKey: K.overview, queryFn: getAdminOverview, staleTime: 60_000 });
}

export function useAdminUsers(params?: object) {
  return useQuery({ queryKey: K.users(params), queryFn: () => getAdminUsers(params), staleTime: 30_000 });
}

export function useAdminUser(id: string) {
  return useQuery({ queryKey: K.user(id), queryFn: () => getAdminUser(id), enabled: !!id });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: object) => createAdminUser(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: object }) => updateAdminUser(id, payload),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: K.user(id) });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useReactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reactivateUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useAdminTriage(params?: object) {
  return useQuery({ queryKey: K.triage(params), queryFn: () => getAdminTriageSessions(params), staleTime: 30_000 });
}

export function useAdminMedications(params?: object) {
  return useQuery({ queryKey: K.meds(params), queryFn: () => getAdminMedications(params), staleTime: 60_000 });
}

export function useCreateMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: object) => createMedication(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "meds"] }),
  });
}

export function useUpdateMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: object }) => updateMedication(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "meds"] }),
  });
}

export function useDeleteMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteMedication(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "meds"] }),
  });
}

export function useAdminStats() {
  return useQuery({ queryKey: K.stats, queryFn: getAdminStats, staleTime: 120_000 });
}

export function useAuditLog(lines = 100) {
  return useQuery({
    queryKey: K.audit(lines),
    queryFn: () => getAuditLog(lines),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}