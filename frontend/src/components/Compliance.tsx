import { useEffect, useState } from "react"
import { ShieldCheck, Search, Plus, X, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react"

const API = "http://127.0.0.1:8000"

type ComplianceItem = {
    id: number
    title: string
    regulation: string
    description: string | null
    department: string
    status: string
    risk_level: string
    due_date: string | null
    created_at: string | null
}

type Overview = {
    total_obligations: number
    compliant: number
    non_compliant: number
    in_progress: number
    high_risk_items: number
    compliance_score: number
}

type LoadState = "loading" | "empty" | "error" | "ok"

const STATUS_OPTIONS = ["Not Started", "In Progress", "Compliant", "Non-Compliant", "Waived"]
const RISK_OPTIONS = ["Low", "Medium", "High", "Critical"]

function statusBadge(status: string) {
    const map: Record<string, string> = {
        Compliant: "bg-green-50 text-green-700 border-green-200",
        "Non-Compliant": "bg-red-50 text-red-600 border-red-200",
        "In Progress": "bg-blue-50 text-blue-600 border-blue-200",
        "Not Started": "bg-neutral-100 text-neutral-500 border-neutral-200",
        Waived: "bg-amber-50 text-amber-600 border-amber-200",
    }
    return map[status] ?? "bg-neutral-100 text-neutral-600 border-neutral-200"
}

function riskBadge(risk: string) {
    const map: Record<string, string> = {
        Low: "bg-green-50 text-green-600 border-green-200",
        Medium: "bg-amber-50 text-amber-600 border-amber-200",
        High: "bg-orange-50 text-orange-600 border-orange-200",
        Critical: "bg-red-50 text-red-700 border-red-200",
    }
    return map[risk] ?? "bg-neutral-100 text-neutral-600 border-neutral-200"
}

function OverviewBar({ overview }: { overview: Overview }) {
    const score = overview.compliance_score
    const scoreColor =
        score >= 80 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-600"

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 shrink-0 border-b border-neutral-100 bg-neutral-50/50 px-6 py-4">
            <div className="text-center">
                <p className={`text-2xl font-semibold ${scoreColor}`}>{score}%</p>
                <p className="mt-0.5 text-xs text-neutral-400 uppercase tracking-wider">Score</p>
            </div>
            <div className="text-center">
                <p className="text-2xl font-semibold text-neutral-900">{overview.total_obligations}</p>
                <p className="mt-0.5 text-xs text-neutral-400 uppercase tracking-wider">Total</p>
            </div>
            <div className="text-center">
                <p className="text-2xl font-semibold text-green-600">{overview.compliant}</p>
                <p className="mt-0.5 text-xs text-neutral-400 uppercase tracking-wider">Compliant</p>
            </div>
            <div className="text-center">
                <p className="text-2xl font-semibold text-blue-600">{overview.in_progress}</p>
                <p className="mt-0.5 text-xs text-neutral-400 uppercase tracking-wider">In Progress</p>
            </div>
            <div className="text-center">
                <p className="text-2xl font-semibold text-red-600">{overview.non_compliant}</p>
                <p className="mt-0.5 text-xs text-neutral-400 uppercase tracking-wider">Non-Compliant</p>
            </div>
            <div className="text-center">
                <p className="text-2xl font-semibold text-orange-600">{overview.high_risk_items}</p>
                <p className="mt-0.5 text-xs text-neutral-400 uppercase tracking-wider">High Risk</p>
            </div>
        </div>
    )
}

function CreateComplianceModal({
    onClose,
    onCreated,
}: {
    onClose: () => void
    onCreated: () => void
}) {
    const [form, setForm] = useState({
        title: "",
        regulation: "",
        department: "",
        description: "",
        status: "Not Started",
        risk_level: "Medium",
        due_date: "",
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError("")
        try {
            const token = localStorage.getItem("access_token")
            const body: Record<string, unknown> = {
                title: form.title,
                regulation: form.regulation,
                department: form.department,
                status: form.status,
                risk_level: form.risk_level,
                description: form.description || null,
                due_date: form.due_date || null,
            }
            const res = await fetch(`${API}/api/v1/compliance/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data?.detail ?? "Failed to create obligation")
            }
            onCreated()
            onClose()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Unknown error")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
            <div className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
                    <h2 className="text-sm font-semibold text-neutral-900">Add Compliance Obligation</h2>
                    <button onClick={onClose} className="rounded p-1 text-neutral-400 hover:bg-neutral-100">
                        <X size={14} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 p-5">
                    {error && (
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
                    )}
                    <div>
                        <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1">
                            Title *
                        </label>
                        <input
                            required
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-neutral-400"
                            placeholder="e.g. Annual GDPR data audit"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1">
                                Regulation *
                            </label>
                            <input
                                required
                                value={form.regulation}
                                onChange={(e) => setForm({ ...form, regulation: e.target.value })}
                                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-neutral-400"
                                placeholder="e.g. GDPR"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1">
                                Department *
                            </label>
                            <input
                                required
                                value={form.department}
                                onChange={(e) => setForm({ ...form, department: e.target.value })}
                                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-neutral-400"
                                placeholder="e.g. Legal"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1">
                                Status
                            </label>
                            <select
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value })}
                                className="w-full rounded-lg border border-neutral-200 px-2 py-2 text-xs outline-none focus:border-neutral-400"
                            >
                                {STATUS_OPTIONS.map((s) => (
                                    <option key={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1">
                                Risk
                            </label>
                            <select
                                value={form.risk_level}
                                onChange={(e) => setForm({ ...form, risk_level: e.target.value })}
                                className="w-full rounded-lg border border-neutral-200 px-2 py-2 text-xs outline-none focus:border-neutral-400"
                            >
                                {RISK_OPTIONS.map((r) => (
                                    <option key={r}>{r}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1">
                                Due Date
                            </label>
                            <input
                                type="date"
                                value={form.due_date}
                                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                                className="w-full rounded-lg border border-neutral-200 px-2 py-2 text-xs outline-none focus:border-neutral-400"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1">
                            Description
                        </label>
                        <textarea
                            rows={3}
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-neutral-400 resize-none"
                            placeholder="Optional description of this obligation"
                        />
                    </div>
                    <div className="flex items-center justify-end gap-2 border-t border-neutral-100 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-lg bg-neutral-900 px-4 py-1.5 text-xs text-white disabled:opacity-50 hover:bg-neutral-700"
                        >
                            {saving ? "Saving…" : "Add Obligation"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function ComplianceCard({ item }: { item: ComplianceItem }) {
    const [expanded, setExpanded] = useState(false)
    const isOverdue =
        item.due_date &&
        item.status !== "Compliant" &&
        new Date(item.due_date) < new Date()

    return (
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-neutral-50"
            >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                    {isOverdue ? (
                        <AlertTriangle size={14} className="text-red-500" />
                    ) : (
                        <ShieldCheck size={14} className="text-neutral-500" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-neutral-900">{item.title}</p>
                        <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge(item.status)}`}
                        >
                            {item.status}
                        </span>
                        <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${riskBadge(item.risk_level)}`}
                        >
                            {item.risk_level} Risk
                        </span>
                        {isOverdue && (
                            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                                Overdue
                            </span>
                        )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-neutral-400 flex-wrap">
                        <span>{item.regulation}</span>
                        <span>·</span>
                        <span>{item.department}</span>
                        {item.due_date && (
                            <>
                                <span>·</span>
                                <span className={isOverdue ? "text-red-500" : ""}>
                                    Due {new Date(item.due_date).toLocaleDateString()}
                                </span>
                            </>
                        )}
                    </div>
                </div>
                {expanded ? (
                    <ChevronUp size={14} className="shrink-0 text-neutral-300 mt-1" />
                ) : (
                    <ChevronDown size={14} className="shrink-0 text-neutral-300 mt-1" />
                )}
            </button>
            {expanded && item.description && (
                <div className="border-t border-neutral-100 bg-neutral-50/50 px-5 py-3">
                    <p className="text-xs text-neutral-600 leading-relaxed">{item.description}</p>
                </div>
            )}
        </div>
    )
}

function Compliance() {
    const [items, setItems] = useState<ComplianceItem[]>([])
    const [overview, setOverview] = useState<Overview | null>(null)
    const [total, setTotal] = useState(0)
    const [loadState, setLoadState] = useState<LoadState>("loading")
    const [error, setError] = useState("")
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [riskFilter, setRiskFilter] = useState("")
    const [showCreate, setShowCreate] = useState(false)

    const fetchAll = async () => {
        setLoadState("loading")
        setError("")
        try {
            const token = localStorage.getItem("access_token")
            const params = new URLSearchParams()
            if (search) params.set("search", search)
            if (statusFilter) params.set("status", statusFilter)
            if (riskFilter) params.set("risk_level", riskFilter)
            params.set("limit", "100")

            const [itemsRes, overviewRes] = await Promise.all([
                fetch(`${API}/api/v1/compliance/?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`${API}/api/v1/compliance/overview`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ])

            if (!itemsRes.ok) throw new Error(`Server responded ${itemsRes.status}`)

            const data = await itemsRes.json()
            const fetched: ComplianceItem[] = data.items ?? []
            setItems(fetched)
            setTotal(data.total ?? fetched.length)
            setLoadState(fetched.length === 0 ? "empty" : "ok")

            if (overviewRes.ok) {
                setOverview(await overviewRes.json())
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to load compliance data")
            setLoadState("error")
        }
    }

    useEffect(() => {
        fetchAll()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, statusFilter, riskFilter])

    return (
        <div className="flex h-full w-full flex-col bg-white">
            {showCreate && (
                <CreateComplianceModal
                    onClose={() => setShowCreate(false)}
                    onCreated={fetchAll}
                />
            )}

            <header className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
                <div>
                    <h1 className="text-xl font-semibold text-neutral-900">Compliance Tracking</h1>
                    <p className="mt-1 text-sm text-neutral-500">
                        Obligations and their current compliance status.
                        {loadState === "ok" && (
                            <span className="ml-1 text-neutral-400">({total} total)</span>
                        )}
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-700"
                >
                    <Plus size={12} />
                    Add Obligation
                </button>
            </header>

            {/* KPI bar — only shown when there is real data */}
            {overview && overview.total_obligations > 0 && (
                <OverviewBar overview={overview} />
            )}

            {/* Filters */}
            <div className="flex shrink-0 items-center gap-3 border-b border-neutral-100 px-6 py-3">
                <div className="flex flex-1 items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                    <Search size={12} className="text-neutral-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 bg-transparent text-xs outline-none placeholder:text-neutral-400"
                        placeholder="Search obligations…"
                    />
                    {search && (
                        <button onClick={() => setSearch("")}>
                            <X size={10} className="text-neutral-400" />
                        </button>
                    )}
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-neutral-200 bg-white px-2 py-2 text-xs text-neutral-600 outline-none"
                >
                    <option value="">All statuses</option>
                    {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
                <select
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    className="rounded-lg border border-neutral-200 bg-white px-2 py-2 text-xs text-neutral-600 outline-none"
                >
                    <option value="">All risks</option>
                    {RISK_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                            {r}
                        </option>
                    ))}
                </select>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {loadState === "loading" && (
                    <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                        Loading compliance data…
                    </div>
                )}

                {loadState === "error" && (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <ShieldCheck size={36} className="mb-3 text-neutral-200" />
                        <p className="text-sm font-medium text-neutral-700">Could not load compliance data</p>
                        <p className="mt-1 text-xs text-neutral-400">{error}</p>
                        <button
                            onClick={fetchAll}
                            className="mt-4 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {loadState === "empty" && (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <ShieldCheck size={36} className="mb-3 text-neutral-200" />
                        <h3 className="text-sm font-medium text-neutral-700">
                            {search || statusFilter || riskFilter
                                ? "No obligations match your filters"
                                : "No compliance obligations yet"}
                        </h3>
                        <p className="mt-1 text-xs text-neutral-400">
                            {search || statusFilter || riskFilter
                                ? "Try adjusting your search or filters."
                                : "Add compliance obligations to track regulatory requirements and their status."}
                        </p>
                        {!search && !statusFilter && !riskFilter && (
                            <button
                                onClick={() => setShowCreate(true)}
                                className="mt-4 flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-white hover:bg-neutral-700"
                            >
                                <Plus size={12} />
                                Add Obligation
                            </button>
                        )}
                    </div>
                )}

                {loadState === "ok" && (
                    <div className="mx-auto max-w-4xl space-y-3">
                        {items.map((item) => (
                            <ComplianceCard key={item.id} item={item} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Compliance