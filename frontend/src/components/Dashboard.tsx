import { useState } from "react"
import {
    Activity,
    Bell,
    ChevronRight,
    FileText,
    Gavel,
    LayoutDashboard,
    MoreHorizontal,
    Search,
    Settings,
    ShieldCheck,
    Sparkles,
    Users,
} from "lucide-react"

import Research from "./Research"
import Investigations from "./Investigations"

type Section =
    | "home"
    | "regulations"
    | "policies"
    | "compliance"
    | "research"
    | "agents"
    | "investigations"
    | "integrations"
    | "audit"
    | "governance"
    | "settings"

type HomeWorkspaceProps = {
    activeSection: Section
    onOpenResearch: () => void
    onOpenInvestigations: () => void
}

function HomeWorkspace({
    activeSection,
    onOpenResearch,
    onOpenInvestigations,
}: HomeWorkspaceProps) {
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

                    <p className="mt-2 text-[11px] text-neutral-400">
                        This workspace will be built next.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="grid min-h-[600px] gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="min-w-0">
                <div className="mb-5 flex items-start justify-between">
                    <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                            Workspace
                        </p>

                        <h1 className="mt-2 text-xl font-semibold tracking-tight">
                            Good morning, Arun
                        </h1>

                        <p className="mt-1 text-[11px] text-neutral-500">
                            Your legal and compliance workspace.
                        </p>
                    </div>

                    <button
                        onClick={onOpenResearch}
                        className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[10px] text-neutral-600 hover:bg-neutral-50"
                    >
                        <Sparkles size={13} />
                        Open Research
                    </button>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    <MetricCard
                        label="Open Findings"
                        value="08"
                        detail="2 require review"
                    />

                    <MetricCard
                        label="Active Policies"
                        value="24"
                        detail="3 recently updated"
                    />

                    <MetricCard
                        label="Research Sessions"
                        value="12"
                        detail="4 this week"
                    />
                </div>

                <div className="mt-4 rounded-xl border border-neutral-200 bg-white">
                    <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                        <div>
                            <h2 className="text-[11px] font-semibold">
                                Active Investigations
                            </h2>

                            <p className="mt-1 text-[9px] text-neutral-400">
                                Investigations currently requiring attention
                            </p>
                        </div>

                        <button
                            onClick={onOpenInvestigations}
                            className="text-[9px] text-neutral-400 hover:text-neutral-700"
                        >
                            View all
                        </button>
                    </div>

                    <button
                        onClick={onOpenInvestigations}
                        className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-neutral-50"
                    >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                            <Users size={15} className="text-neutral-600" />
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <p className="truncate text-[11px] font-medium">
                                    GDPR Data Retention Review
                                </p>

                                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[8px] text-neutral-500">
                                    Active
                                </span>
                            </div>

                            <p className="mt-1 truncate text-[9px] text-neutral-400">
                                Potential gap between GDPR requirements and internal retention
                                policy.
                            </p>

                            <div className="mt-2 flex items-center gap-3 text-[8px] text-neutral-400">
                                <span>3 people viewing</span>
                                <span>•</span>
                                <span>2 agents running</span>
                                <span>•</span>
                                <span>Updated 12 min ago</span>
                            </div>
                        </div>

                        <ChevronRight
                            size={14}
                            className="shrink-0 text-neutral-300"
                        />
                    </button>
                </div>

                <div className="mt-4 rounded-xl border border-neutral-200 bg-white">
                    <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                        <div>
                            <h2 className="text-[11px] font-semibold">Recent Activity</h2>

                            <p className="mt-1 text-[9px] text-neutral-400">
                                Latest workspace activity
                            </p>
                        </div>

                        <MoreHorizontal size={15} className="text-neutral-400" />
                    </div>

                    <div className="divide-y divide-neutral-100">
                        <ActivityRow
                            icon={<FileText size={13} />}
                            title="New regulation added"
                            detail="Digital Personal Data Protection Act, 2023"
                            time="12 min ago"
                        />

                        <ActivityRow
                            icon={<ShieldCheck size={13} />}
                            title="Compliance review updated"
                            detail="Data retention controls"
                            time="42 min ago"
                        />

                        <ActivityRow
                            icon={<Sparkles size={13} />}
                            title="Research session completed"
                            detail="Employee data processing requirements"
                            time="1 hr ago"
                        />

                        <ActivityRow
                            icon={<Users size={13} />}
                            title="Investigation activity"
                            detail="GDPR Data Retention Review"
                            time="2 hrs ago"
                        />
                    </div>
                </div>
            </section>

            <aside className="min-w-0">
                <div className="mb-3">
                    <h2 className="text-[12px] font-semibold">Analysis</h2>

                    <p className="mt-1 text-[10px] text-neutral-400">
                        Current workspace signals
                    </p>
                </div>

                <div className="space-y-3">
                    <InsightCard
                        label="Attention"
                        title="2 compliance findings need review"
                        detail="Both findings are related to data retention controls."
                    />

                    <InsightCard
                        label="Research"
                        title="4 private sessions this week"
                        detail="Your research activity is trending upward."
                    />

                    <InsightCard
                        label="Collaboration"
                        title="1 investigation is active"
                        detail="Three people are currently viewing the investigation."
                    />

                    <div className="rounded-xl border border-neutral-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium">
                                Workspace health
                            </span>

                            <span className="text-[9px] text-neutral-400">
                                Stable
                            </span>
                        </div>

                        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                            <div className="h-full w-[82%] rounded-full bg-neutral-700" />
                        </div>

                        <div className="mt-3 flex items-center justify-between text-[9px] text-neutral-400">
                            <span>82% monitored</span>
                            <span>18% pending</span>
                        </div>
                    </div>
                </div>
            </aside>
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
            <p className="text-[9px] uppercase tracking-[0.12em] text-neutral-400">
                {label}
            </p>

            <p className="mt-3 text-2xl font-semibold tracking-tight">
                {value}
            </p>

            <p className="mt-1 text-[9px] text-neutral-400">
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
                <p className="text-[10px] font-medium">{title}</p>

                <p className="mt-0.5 truncate text-[9px] text-neutral-400">
                    {detail}
                </p>
            </div>

            <span className="shrink-0 text-[8px] text-neutral-400">
                {time}
            </span>
        </div>
    )
}

function InsightCard({
    label,
    title,
    detail,
}: {
    label: string
    title: string
    detail: string
}) {
    return (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-[9px] uppercase tracking-[0.12em] text-neutral-400">
                {label}
            </p>

            <p className="mt-2 text-[11px] font-medium leading-5">
                {title}
            </p>

            <p className="mt-1.5 text-[9px] leading-4 text-neutral-400">
                {detail}
            </p>
        </div>
    )
}

function Dashboard() {
    const [activeSection, setActiveSection] = useState<Section>("home")

    const isResearch = activeSection === "research"
    const isInvestigations = activeSection === "investigations"

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
                    <div className="flex h-16 items-center px-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white">
                            <Gavel size={15} />
                        </div>

                        <div className="ml-2.5 min-w-0">
                            <p className="truncate text-[11px] font-semibold">
                                Legal Workspace
                            </p>

                            <p className="mt-0.5 text-[8px] text-neutral-400">
                                Research & Compliance
                            </p>
                        </div>
                    </div>

                    <nav className="px-2.5 py-3">
                        <p className="px-2.5 pb-2 text-[8px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                            Workspace
                        </p>

                        <div className="space-y-0.5">
                            {navigation.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveSection(item.id)}
                                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[10px] transition ${activeSection === item.id
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

                    <div className="mt-auto border-t border-neutral-100 px-3 py-3">
                        <div className="flex items-center gap-2.5 rounded-lg bg-neutral-50 p-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-[9px] font-medium text-white">
                                AS
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[9px] font-medium">
                                    Arun Shrinivaas
                                </p>

                                <p className="truncate text-[8px] text-neutral-400">
                                    Personal workspace
                                </p>
                            </div>
                        </div>
                    </div>
                </aside>

                <main className="min-w-0 flex-1">
                    <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-5">
                        <div className="flex items-center gap-5">
                            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                                <Search size={13} className="text-neutral-400" />

                                <input
                                    className="w-48 bg-transparent text-[10px] outline-none placeholder:text-neutral-400"
                                    placeholder="Search workspace..."
                                />

                                <span className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[8px] text-neutral-400">
                                    ⌘K
                                </span>
                            </div>

                            <div className="hidden items-center gap-1.5 md:flex">
                                {["All", "Reports", "Research", "Agents"].map((tab) => (
                                    <button
                                        key={tab}
                                        className={`rounded-md px-2.5 py-1.5 text-[9px] ${tab === "All"
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

                            <div className="h-6 w-px bg-neutral-200" />

                            <button className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-neutral-50">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-[9px] font-medium text-white">
                                    AS
                                </div>

                                <ChevronRight
                                    size={12}
                                    className="rotate-90 text-neutral-400"
                                />
                            </button>
                        </div>
                    </header>

                    {isResearch ? (
                        <section className="p-5">
                            <Research />
                        </section>
                    ) : isInvestigations ? (
                        <section className="p-5">
                            <Investigations />
                        </section>
                    ) : (
                        <section className="p-5">
                            <HomeWorkspace
                                activeSection={activeSection}
                                onOpenResearch={() => setActiveSection("research")}
                                onOpenInvestigations={() =>
                                    setActiveSection("investigations")
                                }
                            />
                        </section>
                    )}
                </main>
            </div>
        </div>
    )
}

export default Dashboard