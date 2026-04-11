/**
 * Admin API Service
\*
 * This module provides functions to interact with the admin-related API endpoints.
 * It includes types for admin users, triage sessions, medications, and overview data,
 * as well as functions to perform CRUD operations and fetch statistics.
 */

import apiClient from "./client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "patient" | "doctor" | "admin";
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
  county?: string;
  patient_profile?: {
    blood_group: string;
    known_allergies: string;
    chronic_conditions: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
  } | null;
  stats?: { triage_sessions: number; active_medications: number };
}

export interface AdminTriageSession {
  id: string;
  patient_email: string;
  patient_name: string;
  urgency_level: "emergency" | "doctor_visit" | "self_care" | "undetermined";
  completed: boolean;
  created_at: string;
  red_flags_count: number;
  conditions_count: number;
}

export interface AdminMedication {
  id: number;
  name: string;
  generic_name: string;
  drug_class: string;
  common_uses: string;
  standard_dosage: string;
  is_keml_listed: boolean;
  contraindications?: string;
  side_effects?: string;
}

export interface OverviewData {
  kpis: {
    total_users: number;
    new_this_week: number;
    active_users: number;
    triage_total: number;
    triage_week: number;
    emergencies: number;
    doctor_visits: number;
    avg_mood_14d: number | null;
  };
  user_trend: { date: string; count: number }[];
  urgency_dist: { urgency_level: string; count: number }[];
  role_dist: { role: string; count: number }[];
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const getAdminOverview = () =>
  apiClient.get("/admin/overview/").then((r) => r.data.data as OverviewData);

export const getAdminUsers = (params?: object) =>
  apiClient.get("/admin/users/", { params }).then((r) => r.data);

export const getAdminUser = (id: string) =>
  apiClient.get(`/admin/users/${id}/`).then((r) => r.data.data as AdminUser);

export const createAdminUser = (payload: object) =>
  apiClient.post("/admin/users/", payload).then((r) => r.data.data);

export const updateAdminUser = (id: string, payload: object) =>
  apiClient.patch(`/admin/users/${id}/`, payload).then((r) => r.data.data);

export const deactivateUser = (id: string) =>
  apiClient.delete(`/admin/users/${id}/`).then((r) => r.data.data);

export const reactivateUser = (id: string) =>
  apiClient.post(`/admin/users/${id}/reactivate/`).then((r) => r.data.data);

export const getAdminTriageSessions = (params?: object) =>
  apiClient.get("/admin/triage/", { params }).then((r) => r.data);

export const getAdminMedications = (params?: object) =>
  apiClient.get("/admin/medications/", { params }).then((r) => r.data);

export const createMedication = (payload: object) =>
  apiClient.post("/admin/medications/", payload).then((r) => r.data.data);

export const updateMedication = (id: number, payload: object) =>
  apiClient.patch(`/admin/medications/${id}/`, payload).then((r) => r.data.data);

export const deleteMedication = (id: number) =>
  apiClient.delete(`/admin/medications/${id}/`).then((r) => r.data.data);

export const getAdminStats = () =>
  apiClient.get("/admin/stats/").then((r) => r.data.data);

export const getAuditLog = (lines = 100) =>
  apiClient.get("/admin/audit-log/", { params: { lines } }).then((r) => r.data.data);