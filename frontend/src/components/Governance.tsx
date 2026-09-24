import { useEffect, useState } from "react"
import { SegmentedControl } from "./SegmentedControl"
import {
    AlertTriangle,
    BookOpen,
    CheckCircle,
    FileText,
    Gavel,
    Search,
    ShieldAlert,
    ShieldCheck,
    X,
    XCircle,
} from "lucide-react"

const API = "http://127.0.0.1:8000"

// ---------------------------------------------------------------------------
// Types — mirror governance router responses exactly
// ---------------------------------------------------------------------------

type GovSummary = {
    policies: { total: number; active: number; draft: number }
    regulations: { total: number; active: number }
    compliance: {
        total_obligations: number
        compliant: number
        non_compliant: number
        high_risk: number
        score: number
    }
    investigations: { total: number; active: number }
    findings: { total: number; completed: number; failed: number }
}

type GovPolicy = {
    id: number
    title: string
    department: string
    status: string
    version: string
    effective_date: string | null
    created_at: string | null
}

type GovRegulation = {
    id: number
    title: string
    issuing_authority: string
    jurisdiction: string
    status: string
    effective_date: string | null
    created_at: string | null
}

type GovCompliance = {
    id: number
    title: string
    regulation: string
    department: string
    status: string
    risk_level: string
    due_date: string | null
    created_at: string | null
}

type Tab = "overview" | "policies" | "regulations" | "risk"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(ts: string | null) {
    if (!ts) return "—"
    return new Date(ts).toLocaleDateString(undefined, { dateStyle: "medium" })
}

function policyStatusBadge(status: string) {
    const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
    if (status === "Active") return <span className={`${base} bg-green-50 text-green-700`}>{status}</span>
    if (status === "Draft") return <span className={`${base} bg-amber-50 text-amber-700`}>{status}</span>
    if (status === "Archived") return <span className={`${base} bg-neutral-100 text-neutral-500`}>{status}</span>
    return <span className={`${base} bg-neutral-100 text-neutral-600`}>{status}</span>
}

function riskBadge(risk: string) {
    const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
    if (risk === "High") return <span className={`${base} bg-red-50 text-red-700`}><AlertTriangle size={8} className="mr-1" />{risk}</span>
    if (risk === "Medium") return <span className={`${base} bg-amber-50 text-amber-700`}>{risk}</span>
    return <span className={`${base} bg-green-50 text-green-700`}>{risk}</span>
}

function complianceStatusBadge(status: string) {
    const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
    if (status === "Compliant") return <span className={`${base} bg-green-50 text-green-700`}><CheckCircle size={8} className="mr-1" />{status}</span>
    if (status === "Non-Compliant") return <span className={`${base} bg-red-50 text-red-700`}><XCircle size={8} className="mr-1" />{status}</span>
    if (status === "In Progress") return <span className={`${base} bg-blue-50 text-blue-700`}>{status}</span>
    return <span className={`${base} bg-neutral-100 text-neutral-600`}>{status}</span>
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

function OverviewTab({ summary }: { summary: GovSummary }) {
    const { policies, regulations, compliance, investigations, findings } = summary

    return (
        <div className="space-y-4">
            {/* Compliance score banner */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-sm font-semibold text-neutral-800">Compliance Score</h2>
                        <p className="mt-0.5 text-xs text-neutral-400">
                            Based on {compliance.total_obligations} tracked obligation{compliance.total_obligations !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <span className="text-3xl font-bold text-neutral-900">
                        {compliance.total_obligations > 0 ? `${compliance.score}%` : "—"}
                    </span>
                </div>
                {compliance.total_obligations > 0 && (
                    <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-neutral-900 transition-all"
                            style={{ width: `${compliance.score}%` }}
                        />
                    </div>
                )}
                {compliance.total_obligations === 0 && (
                    <p className="text-xs text-neutral-400 mt-2">
                        No compliance obligations tracked yet. Add items in the Compliance workspace.
                    </p>
                )}
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {[
                    {
                        label: "Policies",
                        value: policies.total,
                        sub: `${policies.active} active`,
                        icon: <FileText size={13} className="text-neutral-500" />,
                    },
                    {
                        label: "Regulations",
                        value: regulations.total,
                        sub: `${regulations.active} active`,
                        icon: <Gavel size={13} className="text-neutral-500" />,
                    },
                    {
                        label: "Non-Compliant",
                        value: compliance.non_compliant,
                        sub: `${compliance.high_risk} high risk`,
                        icon: <ShieldAlert size={13} className="text-red-500" />,
                        warn: compliance.non_compliant > 0,
                    },
                    {
                        label: "Investigations",
                        value: investigations.active,
                        sub: `${investigations.total} total`,
                        icon: <BookOpen size={13} className="text-neutral-500" />,
                    },
                    {
                        label: "Agent Findings",
                        value: findings.total,
                        sub: `${findings.completed} completed`,
                        icon: <ShieldCheck size={13} className="text-neutral-500" />,
                    },
                ].map((kpi) => (
                    <div
                        key={kpi.label}
                        className={`rounded-xl border bg-white p-3 ${kpi.warn ? "border-red-200" : "border-neutral-200"}`}
                    >
                        <div className="flex items-center gap-1.5 mb-1">
                            {kpi.icon}
                            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                                {kpi.label}
                            </span>
                        </div>
                        <p className={`text-xl font-bold ${kpi.warn && kpi.value > 0 ? "text-red-600" : "text-neutral-900"}`}>
                            {kpi.value}
                        </p>
                        <p className="text-xs text-neutral-400 mt-0.5">{kpi.sub}</p>
                    </div>
                ))}
            </div>

            {/* Status breakdown */}
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                        Policy Status
                    </h3>
                    {policies.total === 0 ? (
                        <p className="text-xs text-neutral-400">No policies registered. Add policies in the Policies workspace.</p>
                    ) : (
                        <div className="space-y-2">
                            {[
                                { label: "Active", value: policies.active, color: "bg-green-500" },
                                { label: "Draft", value: policies.draft, color: "bg-amber-400" },
                                { label: "Other", value: policies.total - policies.active - policies.draft, color: "bg-neutral-300" },
                            ].filter((r) => r.value > 0).map((row) => (
                                <div key={row.label} className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full shrink-0 ${row.color}`} />
                                    <span className="text-xs text-neutral-600 flex-1">{row.label}</span>
                                    <span className="text-xs font-medium text-neutral-800">{row.value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                        Compliance Obligations
                    </h3>
                    {compliance.total_obligations === 0 ? (
                        <p className="text-xs text-neutral-400">No compliance obligations tracked.</p>
                    ) : (
                        <div className="space-y-2">
                            {[
                                { label: "Compliant", value: compliance.compliant, color: "bg-green-500" },
                                { label: "Non-Compliant", value: compliance.non_compliant, color: "bg-red-500" },
                                {
                                    label: "Other",
                                    value: compliance.total_obligations - compliance.compliant - compliance.non_compliant,
                                    color: "bg-neutral-300",
                                },
                            ].filter((r) => r.value > 0).map((row) => (
                                <div key={row.label} className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full shrink-0 ${row.color}`} />
                                    <span className="text-xs text-neutral-600 flex-1">{row.label}</span>
                                    <span className="text-xs font-medium text-neutral-800">{row.value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Capabilities not available */}
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                    Governance capabilities not yet configured
                </h3>
                <ul className="space-y-1.5 text-xs text-neutral-400">
                    <li>• <span className="font-medium text-neutral-500">Approval workflows</span> — no approvals model exists in the backend yet</li>
                    <li>• <span className="font-medium text-neutral-500">Control framework</span> — no controls table exists in the backend yet</li>
                    <li>• <span className="font-medium text-neutral-500">Exception management</span> — no exceptions model exists in the backend yet</li>
                    <li>• <span className="font-medium text-neutral-500">Role-based review assignments</span> — users table has roles but no assignment workflow is implemented</li>
                </ul>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Main Governance component
// ---------------------------------------------------------------------------

function Governance() {
    const [activeTab, setActiveTab] = useState<Tab>("overview")

    const [summary, setSummary] = useState<GovSummary | null>(null)
    const [summaryLoading, setSummaryLoading] = useState(true)
    const [summaryError, setSummaryError] = useState("")

    // Policies
    const [policies, setPolicies] = useState<GovPolicy[]>([])
    const [policiesTotal, setPoliciesTotal] = useState(0)
    const [policiesLoading, setPoliciesLoading] = useState(false)
    const [policyStatusFilter, setPolicyStatusFilter] = useState("")
    const [policySearch, setPolicySearch] = useState("")

    // Regulations
    const [regulations, setRegulations] = useState<GovRegulation[]>([])
    const [regulationsTotal, setRegulationsTotal] = useState(0)
    const [regulationsLoading, setRegulationsLoading] = useState(false)
    const [regJurisdictionFilter, setRegJurisdictionFilter] = useState("")
    const [regStatusFilter, setRegStatusFilter] = useState("")

    // Risk register
    const [riskItems, setRiskItems] = useState<GovCompliance[]>([])
    const [riskTotal, setRiskTotal] = useState(0)
    const [riskLoading, setRiskLoading] = useState(false)
    const [riskLevelFilter, setRiskLevelFilter] = useState("")
    const [riskStatusFilter, setRiskStatusFilter] = useState("")

    const tok = () => localStorage.getItem("access_token") ?? ""

    // Load summary on mount
    useEffect(() => {
        const load = async () => {
            setSummaryLoading(true)
            setSummaryError("")
            try {
                const res = await fetch(`${API}/api/v1/governance/summary`, {
                    headers: { Authorization: `Bearer ${tok()}` },
                })
                if (!res.ok) { setSummaryError("Failed to load governance summary."); return }
                setSummary(await res.json())
            } catch {
                setSummaryError("Unable to connect to the backend.")
            } finally {
                setSummaryLoading(false)
            }
        }
        load()
    }, [])

    // Load policies
    useEffect(() => {
        if (activeTab !== "policies") return
        const load = async () => {
            setPoliciesLoading(true)
            try {
                const params = new URLSearchParams()
                if (policyStatusFilter) params.set("status", policyStatusFilter)
                const res = await fetch(`${API}/api/v1/governance/policies?${params}`, {
                    headers: { Authorization: `Bearer ${tok()}` },
                })
                if (res.ok) {
                    const d = await res.json()
                    const items: GovPolicy[] = d.items || []
                    const filtered = policySearch
                        ? items.filter((p) => p.title.toLowerCase().includes(policySearch.toLowerCase()) || p.department.toLowerCase().includes(policySearch.toLowerCase()))
                        : items
                    setPolicies(filtered)
                    setPoliciesTotal(d.total || 0)
                }
            } finally {
                setPoliciesLoading(false)
            }
        }
        load()
    }, [activeTab, policyStatusFilter, policySearch])

    // Load regulations
    useEffect(() => {
        if (activeTab !== "regulations") return
        const load = async () => {
            setRegulationsLoading(true)
            try {
                const params = new URLSearchParams()
                if (regStatusFilter) params.set("status", regStatusFilter)
                if (regJurisdictionFilter) params.set("jurisdiction", regJurisdictionFilter)
                const res = await fetch(`${API}/api/v1/governance/regulations?${params}`, {
                    headers: { Authorization: `Bearer ${tok()}` },
                })
                if (res.ok) {
                    const d = await res.json()
                    setRegulations(d.items || [])
                    setRegulationsTotal(d.total || 0)
                }
            } finally {
                setRegulationsLoading(false)
            }
        }
        load()
    }, [activeTab, regStatusFilter, regJurisdictionFilter])

    // Load risk register
    useEffect(() => {
        if (activeTab !== "risk") return
        const load = async () => {
            setRiskLoading(true)
            try {
                const params = new URLSearchParams()
                if (riskLevelFilter) params.set("risk_level", riskLevelFilter)
                if (riskStatusFilter) params.set("status", riskStatusFilter)
                const res = await fetch(`${API}/api/v1/governance/compliance-risk?${params}`, {
                    headers: { Authorization: `Bearer ${tok()}` },
                })
                if (res.ok) {
                    const d = await res.json()
                    setRiskItems(d.items || [])
                    setRiskTotal(d.total || 0)
                }
            } finally {
                setRiskLoading(false)
            }
        }
        load()
    }, [activeTab, riskLevelFilter, riskStatusFilter])

    const tabs: { id: Tab; label: string }[] = [
        { id: "overview", label: "Overview" },
        { id: "policies", label: "Policy Register" },
        { id: "regulations", label: "Regulation Register" },
        { id: "risk", label: "Risk Register" },
    ]

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck size={15} className="text-neutral-500" />
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
                        Governance Layer
                    </span>
                </div>
                <h1 className="text-xl font-semibold tracking-tight">Governance</h1>
                <p className="mt-1 text-sm text-neutral-500">
                    Organizational compliance posture derived from policies, regulations, and compliance obligations.
                </p>
            </div>

            {/* Tabs */}
            <SegmentedControl
                options={tabs.map(t => ({ value: t.id, label: t.label }))}
                value={activeTab}
                onChange={v => setActiveTab(v as Tab)}
                size="sm"
            />

            {/* ---------------------------------------------------------------- */}
            {/* OVERVIEW TAB                                                      */}
            {/* ---------------------------------------------------------------- */}
            {activeTab === "overview" && (
                summaryLoading ? (
                    <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
                        <p className="text-sm text-neutral-400">Loading governance summary…</p>
                    </div>
                ) : summaryError ? (
                    <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
                        <p className="text-sm text-red-500">{summaryError}</p>
                    </div>
                ) : summary ? (
                    <OverviewTab summary={summary} />
                ) : null
            )}

            {/* ---------------------------------------------------------------- */}
            {/* POLICY REGISTER TAB                                              */}
            {/* ---------------------------------------------------------------- */}
            {activeTab === "policies" && (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="search-pill flex items-center gap-1.5 px-2.5 py-1.5">
                            <Search size={12} className="text-neutral-400" />
                            <input
                                value={policySearch}
                                onChange={(e) => setPolicySearch(e.target.value)}
                                placeholder="Search policies…"
                                className="w-44 bg-transparent text-sm outline-none placeholder:text-neutral-400"
                            />
                            {policySearch && (
                                <button onClick={() => setPolicySearch("")}>
                                    <X size={10} className="text-neutral-400" />
                                </button>
                            )}
                        </div>
                        <select
                            value={policyStatusFilter}
                            onChange={(e) => setPolicyStatusFilter(e.target.value)}
                            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-700 outline-none"
                        >
                            <option value="">All statuses</option>
                            <option value="Active">Active</option>
                            <option value="Draft">Draft</option>
                            <option value="Archived">Archived</option>
                        </select>
                        <span className="ml-auto text-xs text-neutral-400">
                            {policiesLoading ? "Loading…" : `${policiesTotal} policies`}
                        </span>
                    </div>

                    {policiesLoading ? (
                        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
                            <p className="text-sm text-neutral-400">Loading policies…</p>
                        </div>
                    ) : policies.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-10 text-center">
                            <FileText size={20} className="mx-auto mb-3 text-neutral-300" />
                            <p className="text-sm font-medium text-neutral-600">No policies found</p>
                            <p className="mt-1 text-sm text-neutral-400">
                                Add policies in the Policies workspace. They will appear here automatically.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-neutral-100 bg-neutral-50">
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Policy</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Department</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Status</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Version</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Effective Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {policies.map((p) => (
                                        <tr key={p.id} className="hover:bg-neutral-50">
                                            <td className="px-4 py-3 font-medium text-neutral-900">{p.title}</td>
                                            <td className="px-4 py-3 text-neutral-500">{p.department}</td>
                                            <td className="px-4 py-3">{policyStatusBadge(p.status)}</td>
                                            <td className="px-4 py-3 text-neutral-500">{p.version}</td>
                                            <td className="px-4 py-3 text-neutral-400">{fmtDate(p.effective_date)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* REGULATION REGISTER TAB                                          */}
            {/* ---------------------------------------------------------------- */}
            {activeTab === "regulations" && (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={regStatusFilter}
                            onChange={(e) => setRegStatusFilter(e.target.value)}
                            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-700 outline-none"
                        >
                            <option value="">All statuses</option>
                            <option value="Active">Active</option>
                            <option value="Draft">Draft</option>
                            <option value="Archived">Archived</option>
                        </select>
                        <div className="search-pill flex items-center gap-1.5 px-2.5 py-1.5">
                            <Search size={12} className="text-neutral-400" />
                            <input
                                value={regJurisdictionFilter}
                                onChange={(e) => setRegJurisdictionFilter(e.target.value)}
                                placeholder="Filter by jurisdiction…"
                                className="w-44 bg-transparent text-sm outline-none placeholder:text-neutral-400"
                            />
                            {regJurisdictionFilter && (
                                <button onClick={() => setRegJurisdictionFilter("")}>
                                    <X size={10} className="text-neutral-400" />
                                </button>
                            )}
                        </div>
                        <span className="ml-auto text-xs text-neutral-400">
                            {regulationsLoading ? "Loading…" : `${regulationsTotal} regulations`}
                        </span>
                    </div>

                    {regulationsLoading ? (
                        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
                            <p className="text-sm text-neutral-400">Loading regulations…</p>
                        </div>
                    ) : regulations.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-10 text-center">
                            <Gavel size={20} className="mx-auto mb-3 text-neutral-300" />
                            <p className="text-sm font-medium text-neutral-600">No regulations found</p>
                            <p className="mt-1 text-sm text-neutral-400">
                                Add regulations in the Regulations workspace. They will appear here automatically.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-neutral-100 bg-neutral-50">
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Regulation</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Issuing Authority</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Jurisdiction</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Status</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Effective Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {regulations.map((r) => (
                                        <tr key={r.id} className="hover:bg-neutral-50">
                                            <td className="px-4 py-3 font-medium text-neutral-900">{r.title}</td>
                                            <td className="px-4 py-3 text-neutral-500">{r.issuing_authority}</td>
                                            <td className="px-4 py-3 text-neutral-500">{r.jurisdiction}</td>
                                            <td className="px-4 py-3">{policyStatusBadge(r.status)}</td>
                                            <td className="px-4 py-3 text-neutral-400">{fmtDate(r.effective_date)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* RISK REGISTER TAB                                                */}
            {/* ---------------------------------------------------------------- */}
            {activeTab === "risk" && (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={riskLevelFilter}
                            onChange={(e) => setRiskLevelFilter(e.target.value)}
                            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-700 outline-none"
                        >
                            <option value="">All risk levels</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                        <select
                            value={riskStatusFilter}
                            onChange={(e) => setRiskStatusFilter(e.target.value)}
                            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-700 outline-none"
                        >
                            <option value="">All statuses</option>
                            <option value="Compliant">Compliant</option>
                            <option value="Non-Compliant">Non-Compliant</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Not Started">Not Started</option>
                        </select>
                        <span className="ml-auto text-xs text-neutral-400">
                            {riskLoading ? "Loading…" : `${riskTotal} obligations`}
                        </span>
                    </div>

                    {riskLoading ? (
                        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
                            <p className="text-sm text-neutral-400">Loading risk register…</p>
                        </div>
                    ) : riskItems.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-10 text-center">
                            <ShieldAlert size={20} className="mx-auto mb-3 text-neutral-300" />
                            <p className="text-sm font-medium text-neutral-600">No compliance obligations found</p>
                            <p className="mt-1 text-sm text-neutral-400">
                                Add compliance obligations in the Compliance workspace. They will appear here automatically.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-neutral-100 bg-neutral-50">
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Obligation</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Regulation</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Department</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Risk</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Status</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Due Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {riskItems.map((c) => (
                                        <tr
                                            key={c.id}
                                            className={`hover:bg-neutral-50 ${c.risk_level === "High" && c.status === "Non-Compliant" ? "bg-red-50/30" : ""}`}
                                        >
                                            <td className="px-4 py-3 font-medium text-neutral-900">{c.title}</td>
                                            <td className="px-4 py-3 text-neutral-500">{c.regulation}</td>
                                            <td className="px-4 py-3 text-neutral-500">{c.department}</td>
                                            <td className="px-4 py-3">{riskBadge(c.risk_level)}</td>
                                            <td className="px-4 py-3">{complianceStatusBadge(c.status)}</td>
                                            <td className="px-4 py-3 text-neutral-400">{fmtDate(c.due_date)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default Governance
