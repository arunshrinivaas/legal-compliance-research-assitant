import { useState, useEffect, useRef } from "react"
import OpusLexLogo from "../assets/OpusLexLogo.svg"
import { usePreferences, type FontSize } from "../contexts/PreferencesContext"
import {
    Activity,
    Bell,
    ChevronRight,
    FileText,
    Gavel,
    LayoutDashboard,

    Search,
    Settings,
    ShieldCheck,
    Sparkles,
    Users,
} from "lucide-react"

import Research from "./Research"
import Agents from "./Agents"
import Investigations from "./Investigations"
import { Knowledge } from "./Knowledge"
import Regulations from "./Regulations"
import Policies from "./Policies"
import Compliance from "./Compliance"
import Audit from "./Audit"
import Governance from "./Governance"
import Integrations from "./Integrations"

type Section =
    | "home"
    | "regulations"
    | "policies"
    | "compliance"
    | "research"
    | "agents"
    | "investigations"
    | "knowledge"
    | "integrations"
    | "audit"
    | "governance"
    | "settings"

type HomeWorkspaceProps = {
    user?: any

    activeSection: Section
    onOpenResearch: () => void
    onOpenInvestigations: () => void
}

type OverviewData = {
    metrics: {
        active_investigations: number
        total_documents: number
        total_agent_runs: number
    }
    active_investigations: {
        id: number
        title: string
        description: string | null
        status: string
        updated_at: string
        documents_count: number
        agent_runs_count: number
    }[]
    recent_activity: {
        id: string
        type: string
        title: string
        detail: string
        timestamp: string
    }[]
}

function HomeWorkspace({
    activeSection,
    onOpenResearch,
    onOpenInvestigations,
    user,
}: HomeWorkspaceProps & { user?: any }) {
    if (activeSection === "settings") {
        const { fontSize, setFontSize } = usePreferences()
        const sizes: { value: FontSize; label: string }[] = [
            { value: "xs", label: "XS" },
            { value: "s", label: "S" },
            { value: "m", label: "M" },
            { value: "l", label: "L" },
            { value: "xl", label: "XL" },
        ]

        // Removed unused activeTab

        return (
            <div className="flex h-[calc(100vh-4rem)] max-w-5xl mx-auto py-6">
                {/* Settings Sidebar */}
                <div className="w-64 pr-8 border-r border-neutral-200">
                    <h2 className="text-xl font-semibold text-neutral-900 mb-6">Settings</h2>
                    <nav className="flex flex-col gap-1">
                        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors text-left w-full">
                            General
                        </button>
                        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-neutral-100 text-neutral-900 font-medium transition-colors text-left w-full">
                            Appearance
                        </button>
                        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors text-left w-full">
                            Account
                        </button>
                    </nav>
                </div>
                
                {/* Settings Content */}
                <div className="flex-1 pl-8">
                    <div className="max-w-xl">
                        <div className="mb-6 border-b border-neutral-200 pb-4">
                            <h3 className="text-lg font-medium text-neutral-900">Appearance</h3>
                            <p className="text-sm text-neutral-500 mt-1">Customize how OpusLex looks on your device.</p>
                        </div>
                        
                        <div className="mb-8">
                            <h4 className="text-base font-medium text-neutral-900 mb-1">Font size</h4>
                            <p className="text-sm text-neutral-500 mb-4">Choose how large application text should appear.</p>
                            
                            <div className="flex gap-2">
                                {sizes.map((size) => (
                                    <button
                                        key={size.value}
                                        onClick={() => setFontSize(size.value)}
                                        className={`flex h-10 w-16 items-center justify-center rounded-lg border text-sm transition-all ${
                                            fontSize === size.value
                                                ? "border-neutral-900 bg-neutral-900 text-white font-medium shadow-sm"
                                                : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300"
                                        }`}
                                    >
                                        {size.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (activeSection !== "home") {
        return (
            <div className="flex min-h-[520px] items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
                        <Sparkles size={16} className="text-neutral-500" />
                    </div>
                    <h2 className="mt-4 text-sm font-semibold capitalize">
                        {activeSection}
                    </h2>
                    <p className="mt-2 text-sm text-neutral-400">
                        This workspace will be built next.
                    </p>
                </div>
            </div>
        )
    }

    const [data, setData] = useState<OverviewData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        const fetchOverview = async () => {
            const token = localStorage.getItem("access_token")
            if (!token) return
            try {
                const res = await fetch("http://127.0.0.1:8000/api/v1/workspace/overview", {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (!res.ok) throw new Error("Failed to load workspace overview")
                setData(await res.json())
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchOverview()
    }, [])

    if (loading) {
        return (
            <div className="flex min-h-[520px] items-center justify-center">
                <p className="text-sm text-neutral-500">Loading workspace...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex min-h-[520px] items-center justify-center">
                <p className="text-sm text-red-500">{error}</p>
            </div>
        )
    }

    return (
        <div className="grid min-h-[600px] gap-4 xl:grid-cols-1">
            <section className="min-w-0">
                <div className="mb-5 flex items-start justify-between">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
                            Workspace
                        </p>
                        <h1 className="mt-2 text-xl font-semibold tracking-tight">
                            Good morning, {user?.full_name?.split(' ')[0] || "User"}
                        </h1>
                        <p className="mt-1 text-sm text-neutral-500">
                            Your legal and compliance workspace.
                        </p>
                    </div>
                    <button
                        onClick={onOpenResearch}
                        className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600 hover:bg-neutral-50"
                    >
                        <Sparkles size={13} />
                        Open Research
                    </button>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    <MetricCard
                        label="Active Investigations"
                        value={data?.metrics.active_investigations.toString() || "0"}
                        detail="Investigations requiring attention"
                    />
                    <MetricCard
                        label="Total Documents"
                        value={data?.metrics.total_documents.toString() || "0"}
                        detail="Stored in your workspace"
                    />
                    <MetricCard
                        label="Agent Runs"
                        value={data?.metrics.total_agent_runs.toString() || "0"}
                        detail="Total compliance analyses"
                    />
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-neutral-200 bg-white">
                        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                            <div>
                                <h2 className="text-sm font-semibold">Active Investigations</h2>
                                <p className="mt-1 text-xs text-neutral-400">Investigations currently requiring attention</p>
                            </div>
                            <button onClick={onOpenInvestigations} className="text-xs text-neutral-400 hover:text-neutral-700">
                                View all
                            </button>
                        </div>

                        {data?.active_investigations && data.active_investigations.length > 0 ? (
                            <div className="divide-y divide-neutral-100">
                                {data.active_investigations.map((inv) => (
                                    <button
                                        key={inv.id}
                                        onClick={onOpenInvestigations}
                                        className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-neutral-50"
                                    >
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                                            <Users size={15} className="text-neutral-600" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="truncate text-sm font-medium">{inv.title}</p>
                                                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                                                    {inv.status}
                                                </span>
                                            </div>
                                            <p className="mt-1 truncate text-xs text-neutral-400">
                                                {inv.description || "No description provided."}
                                            </p>
                                            <div className="mt-2 flex items-center gap-3 text-xs text-neutral-400">
                                                <span>{inv.documents_count} docs</span>
                                                <span>•</span>
                                                <span>{inv.agent_runs_count} runs</span>
                                                <span>•</span>
                                                <span>Updated {new Date(inv.updated_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={14} className="shrink-0 text-neutral-300" />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-neutral-500 text-xs">
                                No active investigations found.
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border border-neutral-200 bg-white">
                        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                            <div>
                                <h2 className="text-sm font-semibold">Recent Activity</h2>
                                <p className="mt-1 text-xs text-neutral-400">Latest workspace activity</p>
                            </div>
                        </div>

                        {data?.recent_activity && data.recent_activity.length > 0 ? (
                            <div className="divide-y divide-neutral-100">
                                {data.recent_activity.map((act) => {
                                    let Icon = FileText;
                                    if (act.type === "investigation") Icon = Users;
                                    if (act.type === "agent_run") Icon = Sparkles;
                                    if (act.type === "knowledge") Icon = ShieldCheck;
                                    
                                    return (
                                        <ActivityRow
                                            key={act.id}
                                            icon={<Icon size={13} />}
                                            title={act.title}
                                            detail={act.detail}
                                            time={new Date(act.timestamp).toLocaleString()}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-neutral-500 text-xs">
                                No recent activity.
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    )
}

function MetricCard({
    label,
    value,
    detail,
}: {
    label: string
    value: string
    detail: string
}) {
    return (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-neutral-400">
                {label}
            </p>

            <p className="mt-3 text-2xl font-semibold tracking-tight">
                {value}
            </p>

            <p className="mt-1 text-xs text-neutral-400">
                {detail}
            </p>
        </div>
    )
}

function ActivityRow({
    icon,
    title,
    detail,
    time,
}: {
    icon: React.ReactNode
    title: string
    detail: string
    time: string
}) {
    return (
        <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                {icon}
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">{title}</p>

                <p className="mt-0.5 truncate text-xs text-neutral-400">
                    {detail}
                </p>
            </div>

            <span className="shrink-0 text-xs text-neutral-400">
                {time}
            </span>
        </div>
    )
}



function Dashboard() {
    const [activeSection, setActiveSection] = useState<Section>("home")
    const [user, setUser] = useState<any>(null)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [showProfile, setShowProfile] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = localStorage.getItem("access_token")
                if (!token) return
                const res = await fetch("http://127.0.0.1:8000/api/v1/auth/me", {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (res.ok) {
                    setUser(await res.json())
                }
            } catch (e) {}
        }
        fetchUser()
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsMenuOpen(false)
                setShowProfile(false)
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [])

    const handleLogout = () => {
        localStorage.removeItem("access_token")
        localStorage.removeItem("current_user")
        window.location.reload()
    }
    
    const initials = user?.full_name ? user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0,2) : "U"


    const isResearch = activeSection === "research"
    const isAgents = activeSection === "agents"
    const isInvestigations = activeSection === "investigations"
    const isKnowledge = activeSection === "knowledge"
    const isRegulations = activeSection === "regulations"
    const isPolicies = activeSection === "policies"
    const isCompliance = activeSection === "compliance"
    const isAudit = activeSection === "audit"
    const isGovernance = activeSection === "governance"
    const isIntegrations = activeSection === "integrations"

    const navigation: {
        id: Section
        label: string
        icon: React.ReactNode
    }[] = [
            {
                id: "home",
                label: "Home",
                icon: <LayoutDashboard size={15} />,
            },
            {
                id: "regulations",
                label: "Regulations",
                icon: <Gavel size={15} />,
            },
            {
                id: "compliance",
                label: "Compliance",
                icon: <ShieldCheck size={15} />,
            },
            {
                id: "policies",
                label: "Policies",
                icon: <FileText size={15} />,
            },
            {
                id: "research",
                label: "Research",
                icon: <Search size={15} />,
            },
            {
                id: "agents",
                label: "AI Agents",
                icon: <Sparkles size={15} />,
            },
            {
                id: "investigations",
                label: "Investigations",
                icon: <Users size={15} />,
            },
            {
                id: "integrations",
                label: "Integrations",
                icon: <Activity size={15} />,
            },
            {
                id: "audit",
                label: "Audit & Findings",
                icon: <ShieldCheck size={15} />,
            },
            {
                id: "governance",
                label: "Governance",
                icon: <Gavel size={15} />,
            },
            {
                id: "settings",
                label: "Settings",
                icon: <Settings size={15} />,
            },
        ]

    return (
        <div className="min-h-screen bg-neutral-50 text-neutral-900">
            <div className="flex min-h-screen">
                <aside className="w-[188px] shrink-0 border-r border-neutral-200 bg-white">
                    <div className="flex h-16 items-center px-4 gap-2">
                        <img src={OpusLexLogo} alt="OpusLex Logo" className="w-8 h-8 object-contain" />
                        <span className="font-bold text-neutral-900 tracking-tight text-lg">OpusLex</span>
                    </div>

                    <nav className="px-2.5 py-3">
                        <p className="px-2.5 pb-2 text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
                            Workspace
                        </p>

                        <div className="space-y-0.5">
                            {navigation.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveSection(item.id)}
                                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition ${activeSection === item.id
                                        ? "bg-neutral-100 font-medium text-neutral-900"
                                        : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
                                        }`}
                                >
                                    {item.icon}
                                    <span className="truncate">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </nav>

                    <div className="mt-auto border-t border-neutral-200 p-3 relative" ref={menuRef}>
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex w-full items-center gap-2.5 rounded-lg bg-white hover:bg-neutral-50 p-2 transition-colors text-left border border-transparent hover:border-neutral-200">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-xs font-medium text-white">
                                {initials}
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-neutral-900">
                                    {user?.full_name || "Loading..."}
                                </p>
                                <p className="truncate text-xs text-neutral-500 capitalize">
                                    {user?.role ? `${user.role} workspace` : "Workspace"}
                                </p>
                            </div>
                        </button>
                        
                        {isMenuOpen && (
                            <div className="absolute bottom-[calc(100%+8px)] left-3 w-[calc(100%-24px)] rounded-xl border border-neutral-200 bg-white shadow-xl p-1.5 z-50 overflow-hidden">
                                <div className="px-3 py-2.5 border-b border-neutral-100 mb-1.5">
                                    <p className="text-sm font-medium text-neutral-900 truncate">{user?.full_name}</p>
                                    <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
                                </div>
                                <div className="p-1 space-y-0.5">
                                    <button onClick={() => { setShowProfile(true); setIsMenuOpen(false); }} className="w-full text-left rounded-md px-2.5 py-2 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors">Profile</button>
                                    <button onClick={() => { setActiveSection("settings"); setIsMenuOpen(false); }} className="w-full text-left rounded-md px-2.5 py-2 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors">Settings</button>
                                </div>
                                <div className="mt-1.5 p-1 border-t border-neutral-100">
                                    <button onClick={handleLogout} className="w-full text-left rounded-md px-2.5 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium">Log out</button>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                <main className="min-w-0 flex-1">
                    <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-5">
                        <div className="flex items-center gap-5">
                            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                                <Search size={13} className="text-neutral-400" />

                                <input
                                    className="w-48 bg-transparent text-xs outline-none placeholder:text-neutral-400"
                                    placeholder="Search workspace..."
                                />

                                <span className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-xs text-neutral-400">
                                    ⌘K
                                </span>
                            </div>

                            <div className="hidden items-center gap-1.5 md:flex">
                                {["All", "Reports", "Research", "Agents"].map((tab) => (
                                    <button
                                        key={tab}
                                        className={`rounded-md px-2.5 py-1.5 text-xs ${tab === "All"
                                            ? "bg-neutral-100 font-medium text-neutral-800"
                                            : "text-neutral-400 hover:bg-neutral-50"
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-50">
                                <Bell size={15} />

                                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-neutral-700" />
                            </button>
                        </div>
                    </header>

                    {isResearch ? (
                        <section className="p-5">
                            <Research />
                        </section>
                    ) : isAgents ? (
                        <section className="p-5 h-[calc(100vh-4rem)]">
                            <Agents />
                        </section>
                    ) : isInvestigations ? (
                        <section className="p-5">
                            <Investigations />
                        </section>
                    ) : isKnowledge ? (
                        <section className="p-5">
                            <Knowledge />
                        </section>
                    ) : isRegulations ? (
                        <section className="flex h-[calc(100vh-4rem)] flex-col">
                            <Regulations />
                        </section>
                    ) : isPolicies ? (
                        <section className="flex h-[calc(100vh-4rem)] flex-col">
                            <Policies />
                        </section>
                    ) : isCompliance ? (
                        <section className="flex h-[calc(100vh-4rem)] flex-col">
                            <Compliance />
                        </section>
                    ) : isAudit ? (
                        <section className="p-5">
                            <Audit />
                        </section>
                    ) : isGovernance ? (
                        <section className="p-5">
                            <Governance />
                        </section>
                    ) : isIntegrations ? (
                        <section className="p-5">
                            <Integrations />
                        </section>
                    ) : (
                        <section className="p-5">
                            <HomeWorkspace
                                user={user}
                                activeSection={activeSection}
                                onOpenResearch={() => setActiveSection("research")}
                                onOpenInvestigations={() =>
                                    setActiveSection("investigations")
                                }
                            />
                        </section>
                    )}
                    
                    {showProfile && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20">
                            <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-xl">
                                <h2 className="text-lg font-semibold text-neutral-900 mb-4">Profile</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1">Full Name</label>
                                        <p className="text-sm font-medium">{user?.full_name}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1">Email</label>
                                        <p className="text-sm font-medium">{user?.email}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1">Role</label>
                                        <p className="text-sm font-medium capitalize">{user?.role}</p>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end pt-4 border-t border-neutral-100">
                                    <button className="rounded bg-neutral-900 px-4 py-1.5 text-xs text-white" onClick={() => setShowProfile(false)}>Close</button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}

export default Dashboard