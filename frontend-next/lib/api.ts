/**
 * Centralized API client.
 * All API calls go through this module — never scatter fetch() across components.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "API request failed");
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

// ---- Auth ----
export const authApi = {
  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string; user: User }>(
      "/api/v1/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),
  register: (email: string, password: string, full_name?: string, role?: string) =>
    request<{ id: number; email: string; full_name: string; role: string }>(
      "/api/v1/auth/register",
      { method: "POST", body: JSON.stringify({ email, password, full_name, role }) }
    ),
  me: () => request<User>("/api/v1/auth/me"),
  logout: () => request<{ message: string }>("/api/v1/auth/logout", { method: "POST" }),
};

// ---- Regulations ----
export const regulationsApi = {
  list: (params?: { search?: string; jurisdiction?: string; status?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.jurisdiction) q.set("jurisdiction", params.jurisdiction);
    if (params?.status) q.set("status", params.status);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    return request<{ total: number; items: Regulation[] }>(`/api/v1/regulations/?${q}`);
  },
  get: (id: number) => request<Regulation>(`/api/v1/regulations/${id}`),
  create: (data: Partial<Regulation>) =>
    request<Regulation>("/api/v1/regulations/", { method: "POST", body: JSON.stringify(data) }),
};

// ---- Policies ----
export const policiesApi = {
  list: (params?: { search?: string; status?: string; department?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.status) q.set("status", params.status);
    if (params?.department) q.set("department", params.department);
    return request<{ total: number; items: Policy[] }>(`/api/v1/policies/?${q}`);
  },
  get: (id: number) => request<Policy>(`/api/v1/policies/${id}`),
  create: (data: Partial<Policy>) =>
    request<Policy>("/api/v1/policies/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Policy>) =>
    request<Policy>(`/api/v1/policies/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<void>(`/api/v1/policies/${id}`, { method: "DELETE" }),
};

// ---- Compliance ----
export const complianceApi = {
  overview: () => request<ComplianceOverview>("/api/v1/compliance/overview"),
  list: (params?: { search?: string; status?: string; risk_level?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.status) q.set("status", params.status);
    if (params?.risk_level) q.set("risk_level", params.risk_level);
    return request<{ total: number; items: ComplianceItem[] }>(`/api/v1/compliance/?${q}`);
  },
};

// ---- Documents ----
export const documentsApi = {
  list: () => request<{ total: number; items: Document[] }>("/api/v1/documents/"),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = getToken();
    return fetch(`${API_BASE}/api/v1/documents/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then((r) => r.json());
  },
  delete: (id: number) => request<void>(`/api/v1/documents/${id}`, { method: "DELETE" }),
};

// ---- Research ----
export const researchApi = {
  sessions: () => request<{ total: number; items: ResearchSession[] }>("/api/v1/research/sessions"),
  createSession: (question: string) =>
    request<ResearchSession>("/api/v1/research/sessions", {
      method: "POST",
      body: JSON.stringify({ question, status: "Pending" }),
    }),
  query: (question: string) =>
    request<{ question: string; answer: string; sources: Source[] }>("/api/v1/research/query", {
      method: "POST",
      body: JSON.stringify({ question }),
    }),
};

// ---- Health ----
export const healthApi = {
  health: () => request<{ status: string }>("/health"),
  ready: () => request<{ status: string; checks: Record<string, string> }>("/ready"),
};

// ---- Types ----
export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
}

export interface Regulation {
  id: number;
  title: string;
  issuing_authority: string;
  jurisdiction: string;
  description: string | null;
  status: string;
  effective_date: string | null;
  created_at: string | null;
}

export interface Policy {
  id: number;
  title: string;
  department: string;
  description: string | null;
  status: string;
  version: string;
  effective_date: string | null;
  created_at: string | null;
}

export interface ComplianceItem {
  id: number;
  title: string;
  regulation: string;
  description: string | null;
  department: string;
  status: string;
  risk_level: string;
  due_date: string | null;
  created_at: string | null;
}

export interface ComplianceOverview {
  total_obligations: number;
  compliant: number;
  non_compliant: number;
  in_progress: number;
  high_risk_items: number;
  compliance_score: number;
}

export interface Document {
  id: number;
  title: string;
  filename: string;
  document_type: string;
  jurisdiction: string;
  description: string | null;
  user_id: number;
  uploaded_at: string | null;
  chunks: number;
  embedded_chunks: number;
  processing_status: string;
}

export interface ResearchSession {
  id: number;
  question: string;
  status: string;
  created_at: string | null;
}

export interface Source {
  document_id: number;
  document_title: string;
  filename: string;
  chunk: number;
  distance: number;
}
