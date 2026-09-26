import { useEffect, useState } from "react"
import { SegmentedControl } from "./SegmentedControl"
import {
    CheckCircle,
    Clock,
    FileSearch,
    FileText,
    MessageSquare,
    Search,
    Share2,
    Sparkles,
    X,
    XCircle,
} from "lucide-react"

const API = "http://127.0.0.1:8000"

// ---------------------------------------------------------------------------
// Types — mirrors the backend audit router response schemas exactly
// ---------------------------------------------------------------------------

type Finding = {
    id: number
    investigation_id: number
    investigation_title: string
    question: string
    status: "pending" | "completed" | "failed"
    finding: string | null
    evidence: Evidence[]
    conflicts: Conflict[]
    evidence_gaps: EvidenceGap[]
    applicable_requirements: Requirement[]
    suggested_actions: Action[]
    citations: Citation[]
    created_at: string
}

type Evidence = {
    claim: string
    source_document: string
    source_section_or_chunk: string
    supporting_text: string
}

type Conflict = {
    description: string
    documents: string[]
    relationship: string
}

type EvidenceGap = {
    description: string
    why_it_matters: string
}

type Requirement = {
    requirement: string
    source_document: string
    source_section_or_chunk: string
}

type Action = {
    action: string
    rationale: string
}

type Citation = {
    source_document: string
    source_section_or_chunk: string
}

type TimelineEvent = {
    id: string
    event_type: "agent_finding" | "rag_query" | "knowledge_shared"
    investigation_id: number | null
    investigation_title: string | null
    title: string
    detail: string | null
    status: string | null
    timestamp: string
}

type Summary = {
    total_findings: number
    completed_findings: number
    failed_findings: number
    rag_query_count: number
    knowledge_shared: number
}

type Investigation = {
    id: number
    title: string
    status: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(ts: string) {
    return new Date(ts).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    })
}

function statusBadge(status: string) {
    let colorClass = "status-progress"
    let label = "Pending"
    if (status === "completed") { colorClass = "status-compliant"; label = "Completed"; }
    if (status === "failed") { colorClass = "status-non-compliant"; label = "Failed"; }

    return (
        <div className="status-dot-wrapper" title={label}>
            <div className="status-dot-container">
                <div className={`status-dot ${colorClass}`} />
                <span className="status-label">{label}</span>
            </div>
        </div>
    )
}

function eventTypeIcon(type: string) {
    if (type === "agent_finding") return <Sparkles size={12} className="shrink-0 text-neutral-500" />
    if (type === "rag_query") return <MessageSquare size={12} className="shrink-0 text-neutral-500" />
    if (type === "knowledge_shared") return <Share2 size={12} className="shrink-0 text-neutral-500" />
    return <FileText size={12} className="shrink-0 text-neutral-500" />
}

function eventTypeLabel(type: string) {
    if (type === "agent_finding") return "Agent finding"
    if (type === "rag_query") return "RAG query"
    if (type === "knowledge_shared") return "Knowledge shared"
    return type
}

// ---------------------------------------------------------------------------
// Finding detail panel
// ---------------------------------------------------------------------------

function FindingDetail({
    finding,
    onClose,
}: {
    finding: Finding
    onClose: () => void
}) {
    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
            <div
                className="flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-neutral-200 bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-neutral-100 px-6 py-4">
                    <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                            {statusBadge(finding.status)}
                            <span className="text-xs text-neutral-400">
                                {finding.investigation_title}
                            </span>
                        </div>
                        <h2 className="text-sm font-semibold text-neutral-900 leading-snug">
                            {finding.question}
                        </h2>
                        <p className="mt-1 text-xs text-neutral-400">
                            {fmtDate(finding.created_at)}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded p-1 text-neutral-400 hover:bg-neutral-100 shrink-0"
                    >
                        <X size={14} />
                    </button>
                </div>

                <div className="flex-1 space-y-5 px-6 py-5 text-sm">
                    {/* Finding */}
                    {finding.finding && (
                        <section>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                                Finding
                            </h3>
                            <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-4 leading-6 text-neutral-700 whitespace-pre-wrap">
                                {finding.finding}
                            </div>
                        </section>
                    )}

                    {/* Evidence */}
                    {finding.evidence.length > 0 && (
                        <section>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                                Evidence ({finding.evidence.length})
                            </h3>
                            <div className="space-y-2">
                                {finding.evidence.map((ev, i) => (
                                    <div key={i} className="rounded-lg border border-neutral-100 p-3">
                                        <p className="font-medium text-neutral-800">{ev.claim}</p>
                                        <p className="mt-1 text-sm text-neutral-500">
                                            {ev.source_document} — {ev.source_section_or_chunk}
                                        </p>
                                        <p className="mt-1.5 text-sm leading-5 text-neutral-600 italic">
                                            "{ev.supporting_text}"
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Applicable Requirements */}
                    {finding.applicable_requirements.length > 0 && (
                        <section>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                                Applicable Requirements ({finding.applicable_requirements.length})
                            </h3>
                            <div className="space-y-2">
                                {finding.applicable_requirements.map((req, i) => (
                                    <div key={i} className="rounded-lg border border-neutral-100 p-3">
                                        <p className="font-medium text-neutral-800">{req.requirement}</p>
                                        <p className="mt-1 text-sm text-neutral-500">
                                            {req.source_document} — {req.source_section_or_chunk}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Conflicts */}
                    {finding.conflicts.length > 0 && (
                        <section>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                                Conflicts ({finding.conflicts.length})
                            </h3>
                            <div className="space-y-2">
                                {finding.conflicts.map((c, i) => (
                                    <div key={i} className="rounded-lg border border-red-100 bg-red-50 p-3">
                                        <p className="font-medium text-neutral-800">{c.description}</p>
                                        <p className="mt-1 text-sm text-neutral-500">
                                            {c.documents.join(" vs ")} — {c.relationship}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Evidence Gaps */}
                    {finding.evidence_gaps.length > 0 && (
                        <section>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                                Evidence Gaps ({finding.evidence_gaps.length})
                            </h3>
                            <div className="space-y-2">
                                {finding.evidence_gaps.map((gap, i) => (
                                    <div key={i} className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                                        <p className="font-medium text-neutral-800">{gap.description}</p>
                                        <p className="mt-1 text-sm text-neutral-600">{gap.why_it_matters}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Suggested Actions */}
                    {finding.suggested_actions.length > 0 && (
                        <section>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                                Suggested Actions ({finding.suggested_actions.length})
                            </h3>
                            <div className="space-y-2">
                                {finding.suggested_actions.map((action, i) => (
                                    <div key={i} className="rounded-lg border border-neutral-100 p-3">
                                        <p className="font-medium text-neutral-800">{action.action}</p>
                                        <p className="mt-1 text-sm text-neutral-600">{action.rationale}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Citations */}
                    {finding.citations.length > 0 && (
                        <section>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                                Citations ({finding.citations.length})
                            </h3>
                            <div className="space-y-1">
                                {finding.citations.map((cite, i) => (
                                    <div key={i} className="flex items-center gap-2 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2">
                                        <FileText size={11} className="shrink-0 text-neutral-400" />
                                        <span className="text-sm text-neutral-700">
                                            {cite.source_document} — {cite.source_section_or_chunk}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* No structured data yet */}
                    {finding.status === "pending" && !finding.finding && (
                        <div className="rounded-lg border border-dashed border-neutral-200 p-6 text-center text-neutral-400">
                            <Clock size={20} className="mx-auto mb-2 text-neutral-300" />
                            <p className="text-sm">This agent run is still pending.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Main Audit component
// ---------------------------------------------------------------------------

type Tab = "findings" | "timeline"

function Audit() {
    const [activeTab, setActiveTab] = useState<Tab>("findings")

    // Findings state
    const [findings, setFindings] = useState<Finding[]>([])
    const [findingsTotal, setFindingsTotal] = useState(0)
    const [findingsLoading, setFindingsLoading] = useState(true)
    const [findingsError, setFindingsError] = useState("")
    const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)

    // Filters — findings
    const [findingSearch, setFindingSearch] = useState("")
    const [findingStatus, setFindingStatus] = useState("")
    const [findingInvId, setFindingInvId] = useState("")

    // Timeline state
    const [timeline, setTimeline] = useState<TimelineEvent[]>([])
    const [timelineTotal, setTimelineTotal] = useState(0)
    const [timelineLoading, setTimelineLoading] = useState(true)
    const [timelineError, setTimelineError] = useState("")

    // Filters — timeline
    const [timelineEventType, setTimelineEventType] = useState("")
    const [timelineInvId, setTimelineInvId] = useState("")

    // Summary
    const [summary, setSummary] = useState<Summary | null>(null)

    // Investigations list (for filter dropdowns)
    const [investigations, setInvestigations] = useState<Investigation[]>([])

    const token = () => localStorage.getItem("access_token") ?? ""

    // Load summary + investigations on mount
    useEffect(() => {
        const load = async () => {
            try {
                const [sumRes, invRes] = await Promise.all([
                    fetch(`${API}/api/v1/audit/summary`, {
                        headers: { Authorization: `Bearer ${token()}` },
                    }),
                    fetch(`${API}/api/v1/investigations/`, {
                        headers: { Authorization: `Bearer ${token()}` },
                    }),
                ])
                if (sumRes.ok) setSummary(await sumRes.json())
                if (invRes.ok) setInvestigations(await invRes.json())
            } catch {
                // non-fatal — KPIs will just be absent
            }
        }
        load()
    }, [])

    // Load findings whenever filters change
    useEffect(() => {
        const load = async () => {
            setFindingsLoading(true)
            setFindingsError("")
            try {
                const params = new URLSearchParams()
                if (findingSearch) params.set("search", findingSearch)
                if (findingStatus) params.set("status", findingStatus)
                if (findingInvId) params.set("investigation_id", findingInvId)
                params.set("limit", "50")

                const res = await fetch(
                    `${API}/api/v1/audit/findings?${params.toString()}`,
                    { headers: { Authorization: `Bearer ${token()}` } }
                )
                if (!res.ok) {
                    setFindingsError("Failed to load findings.")
                    return
                }
                const data = await res.json()
                setFindings(data.items || [])
                setFindingsTotal(data.total || 0)
            } catch {
                setFindingsError("Unable to connect to the backend.")
            } finally {
                setFindingsLoading(false)
            }
        }
        load()
    }, [findingSearch, findingStatus, findingInvId])

    // Load timeline whenever filters change
    useEffect(() => {
        if (activeTab !== "timeline") return
        const load = async () => {
            setTimelineLoading(true)
            setTimelineError("")
            try {
                const params = new URLSearchParams()
                if (timelineEventType) params.set("event_type", timelineEventType)
                if (timelineInvId) params.set("investigation_id", timelineInvId)
                params.set("limit", "100")

                const res = await fetch(
                    `${API}/api/v1/audit/timeline?${params.toString()}`,
                    { headers: { Authorization: `Bearer ${token()}` } }
                )
                if (!res.ok) {
                    setTimelineError("Failed to load audit trail.")
                    return
                }
                const data = await res.json()
                setTimeline(data.items || [])
                setTimelineTotal(data.total || 0)
            } catch {
                setTimelineError("Unable to connect to the backend.")
            } finally {
                setTimelineLoading(false)
            }
        }
        load()
    }, [activeTab, timelineEventType, timelineInvId])

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    return (
        <div className="space-y-4">
            {selectedFinding && (
                <FindingDetail
                    finding={selectedFinding}
                    onClose={() => setSelectedFinding(null)}
                />
            )}

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <FileSearch size={15} className="text-neutral-500" />
                        <span className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
                            Traceability Surface
                        </span>
                    </div>
                    <h1 className="mt-2 text-xl font-semibold tracking-tight">Audit &amp; Findings</h1>
                    <p className="mt-1 text-sm text-neutral-500">
                        Structured findings from agent analysis, RAG queries, and intentional knowledge sharing.
                    </p>
                </div>
            </div>

            {/* KPI row */}
            {summary && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {[
                        { label: "Total findings", value: summary.total_findings, icon: <Sparkles size={12} /> },
                        { label: "Completed", value: summary.completed_findings, icon: <CheckCircle size={12} className="text-green-600" /> },
                        { label: "Failed", value: summary.failed_findings, icon: <XCircle size={12} className="text-red-500" /> },
                        { label: "RAG queries", value: summary.rag_query_count, icon: <MessageSquare size={12} /> },
                        { label: "Knowledge shared", value: summary.knowledge_shared, icon: <Share2 size={12} /> },
                    ].map((kpi) => (
                        <div key={kpi.label} className="rounded-xl border border-neutral-200 bg-white p-3">
                            <div className="flex items-center gap-1.5 text-neutral-500 mb-1">
                                {kpi.icon}
                                <span className="text-xs font-medium uppercase tracking-wider">{kpi.label}</span>
                            </div>
                            <p className="text-xl font-semibold text-neutral-900">{kpi.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Tabs */}
            <SegmentedControl
                options={[
                    { value: "findings", label: "Findings" },
                    { value: "timeline", label: "Audit Trail" },
                ]}
                value={activeTab}
                onChange={v => setActiveTab(v as Tab)}
                size="sm"
            />

            {/* ---------------------------------------------------------------- */}
            {/* FINDINGS TAB                                                     */}
            {/* ---------------------------------------------------------------- */}
            {activeTab === "findings" && (
                <div className="space-y-3">
                    {/* Filter bar */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="search-pill flex items-center gap-1.5 px-2.5 py-1.5">
                            <Search size={12} className="text-neutral-400" />
                            <input
                                value={findingSearch}
                                onChange={(e) => setFindingSearch(e.target.value)}
                                placeholder="Search findings…"
                                className="w-44 bg-transparent text-sm outline-none placeholder:text-neutral-400"
                            />
                            {findingSearch && (
                                <button onClick={() => setFindingSearch("")}>
                                    <X size={10} className="text-neutral-400" />
                                </button>
                            )}
                        </div>

                        <select
                            value={findingStatus}
                            onChange={(e) => setFindingStatus(e.target.value)}
                            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-700 outline-none"
                        >
                            <option value="">All statuses</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                            <option value="pending">Pending</option>
                        </select>

                        <select
                            value={findingInvId}
                            onChange={(e) => setFindingInvId(e.target.value)}
                            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-700 outline-none"
                        >
                            <option value="">All investigations</option>
                            {investigations.map((inv) => (
                                <option key={inv.id} value={String(inv.id)}>
                                    {inv.title}
                                </option>
                            ))}
                        </select>

                        <span className="ml-auto text-xs text-neutral-400">
                            {findingsLoading ? "Loading…" : `${findingsTotal} findings`}
                        </span>
                    </div>

                    {/* Findings list */}
                    {findingsError ? (
                        <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center">
                            <p className="text-sm text-red-500">{findingsError}</p>
                        </div>
                    ) : findingsLoading ? (
                        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
                            <p className="text-sm text-neutral-400">Loading findings…</p>
                        </div>
                    ) : findings.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-10 text-center">
                            <Sparkles size={20} className="mx-auto mb-3 text-neutral-300" />
                            <p className="text-sm font-medium text-neutral-600">No findings yet</p>
                            <p className="mt-1 text-sm text-neutral-400">
                                Run the Agent in an Investigation to generate structured compliance findings.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {findings.map((f) => (
                                <div
                                    key={f.id}
                                    className="group cursor-pointer rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
                                    onClick={() => setSelectedFinding(f)}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between mb-1.5">
                                                <span className="text-xs text-neutral-400 font-medium truncate pr-4">
                                                    {f.investigation_title}
                                                </span>
                                                <div className="flex items-start justify-end gap-1 shrink-0 h-4">
                                                    {statusBadge(f.status)}
                                                </div>
                                            </div>
                                            <p className="text-sm font-medium text-neutral-900 leading-snug">
                                                {f.question}
                                            </p>
                                            {f.finding && (
                                                <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed line-clamp-2">
                                                    {f.finding}
                                                </p>
                                            )}
                                        </div>

                                        <div className="shrink-0 text-right">
                                            <p className="text-xs text-neutral-400">
                                                {fmtDate(f.created_at)}
                                            </p>
                                            <div className="mt-1.5 flex items-center justify-end gap-2 text-xs text-neutral-400">
                                                {f.evidence.length > 0 && (
                                                    <span title="Evidence items">{f.evidence.length} ev</span>
                                                )}
                                                {f.conflicts.length > 0 && (
                                                    <span title="Conflicts" className="text-red-400">
                                                        {f.conflicts.length} conf
                                                    </span>
                                                )}
                                                {f.suggested_actions.length > 0 && (
                                                    <span title="Suggested actions">{f.suggested_actions.length} act</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* TIMELINE / AUDIT TRAIL TAB                                       */}
            {/* ---------------------------------------------------------------- */}
            {activeTab === "timeline" && (
                <div className="space-y-3">
                    {/* Filter bar */}
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={timelineEventType}
                            onChange={(e) => setTimelineEventType(e.target.value)}
                            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-700 outline-none"
                        >
                            <option value="">All event types</option>
                            <option value="agent_finding">Agent findings</option>
                            <option value="rag_query">RAG queries</option>
                            <option value="knowledge_shared">Knowledge shared</option>
                        </select>

                        <select
                            value={timelineInvId}
                            onChange={(e) => setTimelineInvId(e.target.value)}
                            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-700 outline-none"
                        >
                            <option value="">All investigations</option>
                            {investigations.map((inv) => (
                                <option key={inv.id} value={String(inv.id)}>
                                    {inv.title}
                                </option>
                            ))}
                        </select>

                        <span className="ml-auto text-xs text-neutral-400">
                            {timelineLoading ? "Loading…" : `${timelineTotal} events`}
                        </span>
                    </div>

                    {/* Timeline */}
                    {timelineError ? (
                        <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center">
                            <p className="text-sm text-red-500">{timelineError}</p>
                        </div>
                    ) : timelineLoading ? (
                        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
                            <p className="text-sm text-neutral-400">Loading audit trail…</p>
                        </div>
                    ) : timeline.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-10 text-center">
                            <FileSearch size={20} className="mx-auto mb-3 text-neutral-300" />
                            <p className="text-sm font-medium text-neutral-600">No audit events</p>
                            <p className="mt-1 text-sm text-neutral-400">
                                Agent runs, RAG queries in investigations, and shared knowledge posts will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100">
                            {timeline.map((event) => (
                                <div
                                    key={event.id}
                                    className="flex items-start gap-3 px-4 py-3"
                                >
                                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                                        {eventTypeIcon(event.event_type)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-medium text-neutral-700">
                                                {eventTypeLabel(event.event_type)}
                                            </span>
                                            {event.investigation_title && (
                                                <span className="text-xs text-neutral-400">
                                                    in {event.investigation_title}
                                                </span>
                                            )}
                                            {event.status && statusBadge(event.status)}
                                        </div>
                                        {event.detail && (
                                            <p className="mt-0.5 text-xs text-neutral-500 leading-relaxed">
                                                {event.detail}
                                            </p>
                                        )}
                                    </div>

                                    <span className="shrink-0 text-xs text-neutral-400 pt-0.5">
                                        {fmtDate(event.timestamp)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default Audit
