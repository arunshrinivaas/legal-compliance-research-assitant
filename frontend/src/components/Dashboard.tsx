import { useState, useEffect, useRef, useCallback } from "react"
import { OpusLexBrand } from "./OpusLexBrand"
import { usePreferences, type FontSize, type Density, type LandingSection } from "../contexts/PreferencesContext"
import {
    Activity,
    Bell,
    ChevronRight,
    FileText,
    Gavel,
    HelpCircle,
    LayoutDashboard,
    Search,
    Settings,
    ShieldCheck,
    Sparkles,
    Users,
    X,
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
import Help from "./Help"

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
    | "help"

type HomeWorkspaceProps = {
    user?: any

    activeSection: Section
    onOpenResearch: () => void
    onOpenInvestigations: () => void
    onOpenAgents: () => void
    onOpenAudit: () => void
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

function GlassSelector({ options, value, onChange }: { options: {value: string, label: string, desc?: string}[], value: string, onChange: (v: string) => void }) {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    // bubble tracks hoveredIdx when set, otherwise tracks selected option
    const [bubbleStyle, setBubbleStyle] = useState<{ transform: string; width: string; opacity: number }>({
        transform: 'translateX(0px)',
        width: '0px',
        opacity: 0,
    });

    useEffect(() => {
        if (!containerRef.current) return;
        // Determine which option the bubble should rest on:
        // - If mouse is hovering → follow the hovered option
        // - Otherwise → rest on the currently selected option
        const selectedIdx = options.findIndex(o => o.value === value);
        const targetIdx = hoveredIdx !== null ? hoveredIdx : selectedIdx;

        if (targetIdx === -1) {
            setBubbleStyle(prev => ({ ...prev, opacity: 0 }));
            return;
        }

        const buttons = containerRef.current.querySelectorAll('button');
        const target = buttons[targetIdx] as HTMLButtonElement | undefined;
        if (target) {
            setBubbleStyle({
                transform: `translateX(${target.offsetLeft}px)`,
                width: `${target.offsetWidth}px`,
                // Always visible — on selected when no hover, on hovered when hovering
                opacity: 1,
            });
        }
    }, [hoveredIdx, value, options]);

    // Re-measure on mount so the bubble positions correctly after layout
    useEffect(() => {
        if (!containerRef.current) return;
        const selectedIdx = options.findIndex(o => o.value === value);
        if (selectedIdx === -1) return;
        const buttons = containerRef.current.querySelectorAll('button');
        const target = buttons[selectedIdx] as HTMLButtonElement | undefined;
        if (target) {
            setBubbleStyle({
                transform: `translateX(${target.offsetLeft}px)`,
                width: `${target.offsetWidth}px`,
                opacity: 1,
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
            className="settings-container"
            ref={containerRef}
            onMouseLeave={() => setHoveredIdx(null)}
        >
            <div className="glass-bubble" style={bubbleStyle} />
            {options.map((opt, i) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    onMouseEnter={() => setHoveredIdx(i)}
                    title={opt.desc}
                    className={`settings-pill settings-pill-option flex h-9 items-center justify-center transition-colors ${
                        value === opt.value
                            ? 'settings-pill-active font-semibold'
                            : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    )
}

// ── Settings toggle helper ──
function ToggleRow({ label, description, checked, onChange, disabled }: {
    label: string; description?: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean
}) {
    return (
        <div className={`flex items-center justify-between py-3 border-b border-neutral-100 last:border-0 ${disabled ? 'opacity-50' : ''}`}>
            <div>
                <p className="text-body font-medium text-neutral-900">{label}</p>
                {description && <p className="text-caption text-neutral-500 mt-0.5">{description}</p>}
            </div>
            {disabled ? (
                <span className="text-caption px-2 py-1 bg-neutral-100 rounded text-neutral-500">Not available</span>
            ) : (
                <button
                    role="switch"
                    aria-checked={checked}
                    onClick={() => onChange?.(!checked)}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                        checked ? 'bg-neutral-900' : 'bg-neutral-200'
                    }`}
                >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
                    }`} />
                </button>
            )}
        </div>
    )
}

function SettingsWorkspace({ user }: { user?: any }) {
    const {
        fontSize, setFontSize,
        density, setDensity,
        landingSection, setLandingSection,
        reduceMotion, setReduceMotion,
        largerTargets, setLargerTargets,
    } = usePreferences()
    const [activeTab, setActiveTab] = useState("appearance")

    const sizes: { value: FontSize; label: string; desc: string }[] = [
        { value: "xs", label: "XS", desc: "Compact" },
        { value: "s",  label: "S",  desc: "Small" },
        { value: "m",  label: "M",  desc: "Default" },
        { value: "l",  label: "L",  desc: "Large" },
        { value: "xl", label: "XL", desc: "Extra Large" },
    ]

    const landingOptions: { value: LandingSection; label: string }[] = [
        { value: "home",            label: "Dashboard" },
        { value: "research",        label: "Research" },
        { value: "investigations",  label: "Investigations" },
        { value: "agents",          label: "AI Agents" },
        { value: "audit",           label: "Audit & Findings" },
        { value: "governance",      label: "Governance" },
    ]

    const densityOptions: { value: Density; label: string; desc: string }[] = [
        { value: "comfortable", label: "Comfortable", desc: "More breathing room" },
        { value: "compact",     label: "Compact",     desc: "Tighter, denser layout" },
    ]

    const categories = [
        {
            title: "GENERAL",
            items: [
                { id: "general",       label: "General" },
                { id: "appearance",    label: "Appearance" },
                { id: "accessibility", label: "Accessibility" },
                { id: "language",      label: "Language" }
            ]
        },
        {
            title: "WORKSPACE",
            items: [
                { id: "workspace",     label: "Workspace" },
                { id: "navigation",    label: "Navigation" },
                { id: "notifications", label: "Notifications" }
            ]
        },
        {
            title: "ACCOUNT",
            items: [
                { id: "profile",  label: "Profile" },
                { id: "security", label: "Security & Login" }
            ]
        },
        {
            title: "DATA & PRIVACY",
            items: [
                { id: "data",    label: "Data Controls" },
                { id: "storage", label: "Storage" },
                { id: "privacy", label: "Privacy" }
            ]
        },
        {
            title: "INTEGRATIONS",
            items: [{ id: "integrations", label: "Integrations" }]
        },
        {
            title: "ADVANCED",
            items: [{ id: "advanced", label: "Advanced" }]
        }
    ]

    const allConfigured = ["appearance", "general", "accessibility", "notifications", "profile", "security", "data", "storage", "language"]

    return (
        <div className="flex h-[calc(100vh-4rem)] max-w-5xl mx-auto py-6">
            {/* Settings Sidebar */}
            <div className="w-60 pr-6 border-r border-neutral-200 overflow-y-auto shrink-0">
                <h2 className="text-heading font-semibold text-neutral-900 mb-6 pl-2">Settings</h2>
                <div className="space-y-5">
                    {categories.map((category) => (
                        <div key={category.title}>
                            <h3 className="px-2 text-caption font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                                {category.title}
                            </h3>
                            <nav className="flex flex-col gap-0.5">
                                {category.items.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`flex items-center px-3 py-2 rounded-lg text-body transition-colors text-left w-full ${
                                            activeTab === item.id
                                                ? "bg-neutral-100 text-neutral-900 font-medium"
                                                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    ))}
                </div>
            </div>

            {/* Settings Content */}
            <div className="flex-1 pl-10 overflow-y-auto">
                <div className="max-w-xl">

                    {/* ── APPEARANCE ── */}
                    {activeTab === "appearance" && (
                        <>
                            <SettingsHeader title="Appearance" sub="Customize how OpusLex looks on your device." />
                            <SettingsSection title="Font size" description="Choose how large application text should appear. The scale maintains typographic hierarchy throughout the application.">
                                <GlassSelector 
                                    options={sizes}
                                    value={fontSize}
                                    onChange={setFontSize as (v: string) => void}
                                />
                                <p className="text-caption text-neutral-400 mt-2">
                                    Current: {sizes.find(s => s.value === fontSize)?.desc}
                                </p>
                            </SettingsSection>

                            <SettingsSection title="Density" description="Control how much space interface elements use.">
                                <GlassSelector 
                                    options={densityOptions}
                                    value={density}
                                    onChange={setDensity as (v: string) => void}
                                />
                            </SettingsSection>

                            <SettingsSection title="Theme" description="Select your preferred color theme.">
                                <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 text-body text-neutral-500 text-center">
                                    Coming soon
                                </div>
                            </SettingsSection>
                        </>
                    )}

                    {/* ── GENERAL ── */}
                    {activeTab === "general" && (
                        <>
                            <SettingsHeader title="General" sub="Configure general application behavior." />
                            <SettingsSection title="Default landing section" description="Choose the section that opens immediately after you log in.">
                                <div className="flex flex-col gap-1.5">
                                    {landingOptions.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setLandingSection(opt.value)}
                                            className={`settings-pill flex items-center justify-between px-4 py-3 ${
                                                landingSection === opt.value
                                                    ? "settings-pill-active"
                                                    : ""
                                            }`}
                                        >
                                            <span>{opt.label}</span>
                                            {landingSection === opt.value && (
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-caption text-neutral-400 mt-2">Takes effect on your next login.</p>
                            </SettingsSection>
                        </>
                    )}

                    {/* ── ACCESSIBILITY ── */}
                    {activeTab === "accessibility" && (
                        <>
                            <SettingsHeader title="Accessibility" sub="Adjust the interface to suit your needs." />
                            <div className="rounded-xl border border-neutral-200 bg-white px-4">
                                <ToggleRow
                                    label="Reduce motion"
                                    description="Minimizes animations and transitions across the entire application, including the login background."
                                    checked={reduceMotion}
                                    onChange={setReduceMotion}
                                />
                                <ToggleRow
                                    label="Larger click targets"
                                    description="Increases the padding on interactive controls for easier interaction."
                                    checked={largerTargets}
                                    onChange={setLargerTargets}
                                />
                                <ToggleRow
                                    label="High contrast"
                                    description="Increases text and border contrast across the application."
                                    checked={false}
                                    disabled
                                />
                            </div>
                            <p className="text-caption text-neutral-400 mt-3">
                                Reduce motion also respects your operating system's motion preference.
                            </p>
                        </>
                    )}

                    {/* ── LANGUAGE ── */}
                    {activeTab === "language" && (
                        <>
                            <SettingsHeader title="Language" sub="Manage the display language for this application." />
                            <div className="rounded-xl border border-neutral-200 bg-white p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-body font-medium text-neutral-900">English</p>
                                        <p className="text-caption text-neutral-500 mt-0.5">Currently available</p>
                                    </div>
                                    <span className="text-caption px-2 py-1 bg-neutral-900 rounded text-white font-medium">Active</span>
                                </div>
                            </div>
                            <div className="mt-3 p-4 rounded-xl border border-neutral-200 bg-neutral-50 text-center">
                                <p className="text-body text-neutral-500">Additional languages — Coming soon</p>
                            </div>
                        </>
                    )}

                    {/* ── WORKSPACE (NAVIGATION) ── */}
                    {activeTab === "workspace" && (
                        <>
                            <SettingsHeader title="Workspace" sub="Configure your workspace environment." />
                            <SettingsSection title="Default landing section" description="Where you land after login.">
                                <p className="text-body text-neutral-600">Configure this in <button onClick={() => setActiveTab("general")} className="underline font-medium">General</button>.</p>
                            </SettingsSection>
                        </>
                    )}

                    {activeTab === "navigation" && (
                        <>
                            <SettingsHeader title="Navigation" sub="Configure sidebar navigation options." />
                            <div className="p-8 rounded-xl border border-neutral-200 bg-neutral-50 text-center">
                                <p className="text-body text-neutral-500">Navigation customization — Coming soon</p>
                            </div>
                        </>
                    )}

                    {/* ── NOTIFICATIONS ── */}
                    {activeTab === "notifications" && (
                        <>
                            <SettingsHeader title="Notifications" sub="Manage how you receive updates and alerts." />
                            <div className="p-6 rounded-xl border border-neutral-200 bg-neutral-50">
                                <p className="text-body text-neutral-500 mb-4 text-center">Notification preferences are not yet configured for this workspace.</p>
                                <div className="space-y-2 max-w-sm mx-auto">
                                    {["Email notifications", "Investigation updates", "Agent completion alerts"].map(item => (
                                        <div key={item} className="flex items-center justify-between opacity-50">
                                            <span className="text-body">{item}</span>
                                            <span className="text-caption px-2 py-1 bg-neutral-200 rounded text-neutral-600">Not configured</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── PROFILE ── */}
                    {activeTab === "profile" && (
                        <>
                            <SettingsHeader title="Profile" sub="Your account information. Contact your administrator to update." />
                            <div className="space-y-4">
                                {[
                                    { label: "Full Name",     value: user?.full_name },
                                    { label: "Email Address", value: user?.email },
                                    { label: "Role",          value: user?.role },
                                ].map(({ label, value }) => (
                                    <div key={label}>
                                        <label className="block text-label font-medium text-neutral-500 uppercase tracking-wider mb-1.5">{label}</label>
                                        <div className="px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-body text-neutral-700 capitalize">
                                            {value || "Not available"}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* ── SECURITY ── */}
                    {activeTab === "security" && (
                        <>
                            <SettingsHeader title="Security & Login" sub="Manage your account security settings." />
                            <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    <p className="text-body font-medium text-neutral-900">Authenticated</p>
                                </div>
                                <p className="text-secondary text-neutral-500">{user?.email}</p>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { label: "Password", desc: "Change your account password.", status: "Coming soon" },
                                    { label: "Two-Factor Authentication", desc: "Add an extra layer of security.", status: "Not configured" },
                                    { label: "Google login", desc: "Sign in with Google.", status: "Not configured" },
                                    { label: "Apple login",  desc: "Sign in with Apple.",  status: "Not configured" },
                                ].map(({ label, desc, status }) => (
                                    <div key={label} className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 bg-white">
                                        <div>
                                            <h4 className="text-body font-medium text-neutral-900">{label}</h4>
                                            <p className="text-caption text-neutral-500 mt-0.5">{desc}</p>
                                        </div>
                                        <span className="text-caption px-2 py-1 bg-neutral-100 rounded text-neutral-500 shrink-0 ml-4">{status}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* ── DATA CONTROLS ── */}
                    {activeTab === "data" && (
                        <>
                            <SettingsHeader title="Data Controls" sub="How OpusLex handles your data." />
                            <div className="space-y-3">
                                {[
                                    { title: "Document Privacy", body: "Documents are stored securely in the application repository and are not shared with any external parties." },
                                    { title: "Investigation Scoping", body: "Investigation data is scoped to your authenticated user account and role." },
                                    { title: "Agent Findings", body: "Compliance findings generated by AI Agents are persisted to your workspace and are accessible only to authorized users." },
                                    { title: "Knowledge Sharing", body: "Knowledge items marked as public are intentionally shared within the workspace for team collaboration." },
                                ].map(({ title, body }) => (
                                    <div key={title} className="p-4 rounded-xl border border-neutral-200 bg-white">
                                        <h4 className="text-body font-medium text-neutral-900">{title}</h4>
                                        <p className="text-secondary text-neutral-500 mt-1">{body}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* ── STORAGE ── */}
                    {activeTab === "storage" && (
                        <>
                            <SettingsHeader title="Storage" sub="Workspace storage information." />
                            <div className="p-8 rounded-xl border border-neutral-200 bg-neutral-50 text-center">
                                <p className="text-body text-neutral-500">Storage management is not yet configured.</p>
                            </div>
                        </>
                    )}

                    {/* ── PRIVACY ── */}
                    {activeTab === "privacy" && (
                        <>
                            <SettingsHeader title="Privacy" sub="Privacy practices and controls." />
                            <div className="p-4 rounded-xl border border-neutral-200 bg-white">
                                <p className="text-body text-neutral-700">
                                    OpusLex does not sell your data. Documents, findings, and investigation data are stored locally within your enterprise deployment.
                                    No telemetry is sent to external services unless explicitly configured by your administrator.
                                </p>
                            </div>
                        </>
                    )}

                    {/* ── Fallback ── */}
                    {!allConfigured.includes(activeTab) && (
                        <>
                            <SettingsHeader
                                title={activeTab.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                                sub="These settings are not yet available."
                            />
                            <div className="p-8 rounded-xl border border-neutral-200 bg-neutral-50 text-center">
                                <p className="text-body text-neutral-500">Coming soon</p>
                            </div>
                        </>
                    )}

                </div>
            </div>
        </div>
    )
}

function SettingsHeader({ title, sub }: { title: string; sub: string }) {
    return (
        <div className="mb-6 border-b border-neutral-200 pb-5">
            <h3 className="text-heading font-semibold text-neutral-900">{title}</h3>
            <p className="text-secondary text-neutral-500 mt-1">{sub}</p>
        </div>
    )
}

function SettingsSection({ title, description, children }: {
    title: string; description?: string; children: React.ReactNode
}) {
    return (
        <div className="mb-8">
            <h4 className="text-subheading font-medium text-neutral-900 mb-1">{title}</h4>
            {description && <p className="text-secondary text-neutral-500 mb-4">{description}</p>}
            {children}
        </div>
    )
}

function HomeWorkspace({
    activeSection,
    onOpenResearch,
    onOpenInvestigations,
    onOpenAgents,
    onOpenAudit,
    user,
}: HomeWorkspaceProps & { user?: any }) {
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
                        onClick={onOpenInvestigations}
                    />
                    <MetricCard
                        label="Total Documents"
                        value={data?.metrics.total_documents.toString() || "0"}
                        detail="Stored in your workspace"
                        onClick={onOpenInvestigations}
                    />
                    <MetricCard
                        label="Agent Runs"
                        value={data?.metrics.total_agent_runs.toString() || "0"}
                        detail="Total compliance analyses"
                        onClick={onOpenAgents}
                    />
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="card-enterprise rounded-xl border border-neutral-200 bg-white">
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
                                        className="row-hover flex w-full items-center gap-3 px-4 py-4 text-left"
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

                    <div className="card-enterprise rounded-xl border border-neutral-200 bg-white">
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

                                    // Determine navigation destination
                                    let dest: (() => void) | undefined;
                                    if (act.type === "investigation") dest = onOpenInvestigations;
                                    else if (act.type === "agent_run") dest = onOpenAgents;
                                    else if (act.type === "knowledge") dest = onOpenAudit;
                                    else if (act.type === "document") dest = onOpenInvestigations;

                                    return (
                                        <ActivityRow
                                            key={act.id}
                                            icon={<Icon size={13} />}
                                            title={act.title}
                                            detail={act.detail}
                                            time={new Date(act.timestamp).toLocaleString()}
                                            onClick={dest}
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
    onClick,
}: {
    label: string
    value: string
    detail: string
    onClick?: () => void
}) {
    const base = "card-enterprise rounded-xl border border-neutral-200 bg-white p-4"
    if (onClick) {
        return (
            <button
                onClick={onClick}
                className={`${base} w-full text-left group hover:border-neutral-300 hover:shadow-sm transition-all cursor-pointer`}
            >
                <p className="text-xs uppercase tracking-[0.12em] text-neutral-400 group-hover:text-neutral-500 transition-colors">
                    {label}
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
                <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-neutral-400">{detail}</p>
                    <ChevronRight size={12} className="text-neutral-300 group-hover:text-neutral-400 transition-colors" />
                </div>
            </button>
        )
    }
    return (
        <div className={base}>
            <p className="text-xs uppercase tracking-[0.12em] text-neutral-400">{label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-neutral-400">{detail}</p>
        </div>
    )
}

function ActivityRow({
    icon,
    title,
    detail,
    time,
    onClick,
}: {
    icon: React.ReactNode
    title: string
    detail: string
    time: string
    onClick?: () => void
}) {
    const inner = (
        <>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">{title}</p>
                <p className="mt-0.5 truncate text-xs text-neutral-400">{detail}</p>
            </div>
            <span className="shrink-0 text-xs text-neutral-400">{time}</span>
            {onClick && <ChevronRight size={12} className="shrink-0 text-neutral-300" />}
        </>
    )
    if (onClick) {
        return (
            <button
                onClick={onClick}
                className="flex w-full items-center gap-3 px-4 py-3 text-left row-hover"
            >
                {inner}
            </button>
        )
    }
    return <div className="flex items-center gap-3 px-4 py-3">{inner}</div>
}



function Dashboard() {
    // Initialise from user's preferred landing section
    const [activeSection, setActiveSection] = useState<Section>(() => {
        const saved = localStorage.getItem("pref_landing") as Section | null
        const valid: Section[] = ["home", "research", "investigations", "agents", "audit", "governance"]
        return saved && valid.includes(saved) ? saved : "home"
    })
    const [user, setUser] = useState<any>(null)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [showProfile, setShowProfile] = useState(false)
    const [showFaq, setShowFaq] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    // ── Global Search ──────────────────────────────────────────────────────
    const [searchOpen, setSearchOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<{section: Section; label: string; detail: string; icon: string}[]>([])
    const [searchLoading, setSearchLoading] = useState(false)
    const searchRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    // ── Notification panel ────────────────────────────────────────────────
    const [showNotifications, setShowNotifications] = useState(false)
    const [notifications, setNotifications] = useState<{id: string; title: string; detail: string; time: string; type: string}[]>([])
    const notifRef = useRef<HTMLDivElement>(null)

    // ── Top-nav tabs bubble ────────────────────────────────────────────────
    // "All" = home, "Reports" = audit, "Research" = research, "Agents" = agents
    const topNavTabs: {label: string; section: Section}[] = [
        { label: "All",      section: "home" },
        { label: "Reports",  section: "audit" },
        { label: "Research", section: "research" },
        { label: "Agents",   section: "agents" },
    ]
    const activeTopTab = topNavTabs.find(t => t.section === activeSection)?.label ?? "All"
    const [topNavHover, setTopNavHover] = useState<number | null>(null)
    const topNavRef = useRef<HTMLDivElement>(null)
    const [topNavBubble, setTopNavBubble] = useState<{transform: string; width: string; opacity: number}>({
        transform: "translateX(0px)", width: "0px", opacity: 0,
    })

    // Position the top-nav bubble
    useEffect(() => {
        if (!topNavRef.current) return
        const btns = topNavRef.current.querySelectorAll("button")
        const activeIdx = topNavTabs.findIndex(t => t.label === activeTopTab)
        const targetIdx = topNavHover !== null ? topNavHover : activeIdx
        if (targetIdx === -1) return
        const btn = btns[targetIdx] as HTMLButtonElement | undefined
        if (!btn) return
        setTopNavBubble({ transform: `translateX(${btn.offsetLeft}px)`, width: `${btn.offsetWidth}px`, opacity: 1 })
    }, [topNavHover, activeTopTab])

    // Navigation helpers
    const navTo = useCallback((s: Section) => { setActiveSection(s); setSearchOpen(false) }, [])

    // Search: query backend when search term changes
    useEffect(() => {
        if (!searchQuery.trim()) { setSearchResults([]); return }
        const token = localStorage.getItem("access_token") ?? ""
        let cancelled = false
        setSearchLoading(true)
        const run = async () => {
            try {

                const [invRes, polRes, regRes] = await Promise.all([
                    fetch(`http://127.0.0.1:8000/api/v1/investigations/?limit=3`, { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`http://127.0.0.1:8000/api/v1/governance/policies?limit=3`, { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`http://127.0.0.1:8000/api/v1/governance/regulations?limit=3`, { headers: { Authorization: `Bearer ${token}` } }),
                ])
                if (cancelled) return
                const results: {section: Section; label: string; detail: string; icon: string}[] = []
                if (invRes.ok) {
                    const data = await invRes.json()
                    const items = Array.isArray(data) ? data : (data.items || [])
                    items.filter((i: any) => i.title?.toLowerCase().includes(searchQuery.toLowerCase())).slice(0,3).forEach((i: any) => {
                        results.push({ section: "investigations", label: i.title, detail: "Investigation · " + (i.status || ""), icon: "👤" })
                    })
                }
                if (polRes.ok) {
                    const data = await polRes.json()
                    const items = data.items || []
                    items.filter((i: any) => i.title?.toLowerCase().includes(searchQuery.toLowerCase())).slice(0,3).forEach((i: any) => {
                        results.push({ section: "governance", label: i.title, detail: "Policy · " + (i.department || ""), icon: "📄" })
                    })
                }
                if (regRes.ok) {
                    const data = await regRes.json()
                    const items = data.items || []
                    items.filter((i: any) => i.title?.toLowerCase().includes(searchQuery.toLowerCase())).slice(0,3).forEach((i: any) => {
                        results.push({ section: "governance", label: i.title, detail: "Regulation · " + (i.jurisdiction || ""), icon: "⚖️" })
                    })
                }
                if (!cancelled) setSearchResults(results)
            } catch { if (!cancelled) setSearchResults([]) }
            finally { if (!cancelled) setSearchLoading(false) }
        }
        const timer = setTimeout(run, 300)
        return () => { cancelled = true; clearTimeout(timer) }
    }, [searchQuery])

    // Load recent activity into notifications
    useEffect(() => {
        const token = localStorage.getItem("access_token") ?? ""
        if (!token) return
        fetch("http://127.0.0.1:8000/api/v1/workspace/overview", { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (!d?.recent_activity) return
                setNotifications(d.recent_activity.slice(0, 6).map((a: any) => ({
                    id: a.id,
                    title: a.title,
                    detail: a.detail,
                    time: new Date(a.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
                    type: a.type,
                })))
            }).catch(() => {})
    }, [])

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
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setSearchOpen(false)
            }
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setShowNotifications(false)
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
                setSearchOpen(false)
                setShowNotifications(false)
            }
            // Cmd+K or Ctrl+K opens search
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault()
                setSearchOpen(true)
                setTimeout(() => searchInputRef.current?.focus(), 50)
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
                id: "help",
                label: "Help",
                icon: <HelpCircle size={15} />,
            },
            {
                id: "settings",
                label: "Settings",
                icon: <Settings size={15} />,
            },
        ]

    return (
        <div className="h-[100dvh] overflow-hidden bg-neutral-50 text-neutral-900 flex">
            <aside className="flex flex-col h-[100dvh] w-[240px] shrink-0 border-r border-neutral-200 bg-white">
                    {/* Brand lockup */}
                    <div className="flex shrink-0 items-center px-5 py-4">
                        <OpusLexBrand />
                    </div>

                    <div className="flex-1 overflow-y-auto px-3 py-2">
                        <div className="mb-2">
                            <p className="px-2 pb-2 text-caption font-semibold uppercase tracking-wider text-neutral-400">
                                Workspace
                            </p>
                        </div>

                        <nav className="space-y-0.5">
                            {navigation.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveSection(item.id)}
                                    className={`nav-pill flex w-full items-center gap-3 px-3 py-2 text-left text-body ${
                                        activeSection === item.id
                                            ? "active font-medium text-neutral-900"
                                            : "text-neutral-500 hover:text-neutral-900"
                                    }`}
                                >
                                    {item.icon}
                                    <span className="truncate">{item.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="shrink-0 border-t border-neutral-200 p-3 relative" ref={menuRef}>
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="profile-tile flex w-full items-center gap-3 p-2 text-left group">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-medium text-white shadow-sm" style={{ aspectRatio: '1/1' }}>
                                {initials}
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-body font-medium text-neutral-900">
                                    {user?.full_name || "Loading..."}
                                </p>
                                <p className="truncate text-caption text-neutral-500 capitalize">
                                    {user?.role ? `${user.role} Workspace` : "Workspace"}
                                </p>
                            </div>

                            <ChevronRight size={16} className="text-neutral-400 group-hover:text-neutral-600" style={{ transition: "color 160ms ease" }} />
                        </button>
                        
                        {isMenuOpen && (
                            <div className="absolute bottom-[calc(100%+8px)] left-3 w-[calc(100%-24px)] rounded-xl border border-neutral-200 bg-white shadow-xl p-1.5 z-50 overflow-hidden">
                                <div className="px-3 py-2.5 border-b border-neutral-100 mb-1.5">
                                    <p className="text-body font-medium text-neutral-900 truncate">{user?.full_name}</p>
                                    <p className="text-caption text-neutral-500 truncate">{user?.email}</p>
                                </div>
                                <div className="p-1 space-y-0.5">
                                    <button onClick={() => { setShowProfile(true); setIsMenuOpen(false); }} className="menu-item w-full text-left px-2.5 py-2 text-body text-neutral-700">Profile</button>
                                    <button onClick={() => { setActiveSection("settings"); setIsMenuOpen(false); }} className="menu-item w-full text-left px-2.5 py-2 text-body text-neutral-700">Settings</button>
                                </div>
                                <div className="mt-1.5 p-1 border-t border-neutral-100">
                                    <button onClick={handleLogout} className="menu-item menu-item-danger w-full text-left px-2.5 py-2 text-body text-red-600 font-medium">Log out</button>
                                </div>
                            </div>
                        )}
                    </div>
            </aside>
            <main className="min-w-0 flex-1 flex flex-col h-[100dvh]">
                <header className="shrink-0 flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-5">
                    <div className="flex items-center gap-5">
                        {/* ── Search pill + overlay ── */}
                        <div className="relative" ref={searchRef}>
                            <button
                                id="global-search-trigger"
                                onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50) }}
                                className="search-pill flex items-center gap-2 px-3 py-2 cursor-text"
                            >
                                <Search size={13} className="text-neutral-400" />
                                <span className="w-36 bg-transparent text-xs text-neutral-400 select-none">Search workspace…</span>
                                <span className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-xs text-neutral-400">⌘K</span>
                            </button>

                            {searchOpen && (
                                <div className="absolute top-[calc(100%+6px)] left-0 w-[420px] rounded-xl border border-neutral-200 bg-white shadow-xl z-50 overflow-hidden">
                                    <div className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2.5">
                                        <Search size={13} className="shrink-0 text-neutral-400" />
                                        <input
                                            ref={searchInputRef}
                                            id="global-search-input"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Search investigations, policies, regulations…"
                                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
                                            autoComplete="off"
                                        />
                                        {searchQuery && (
                                            <button onClick={() => setSearchQuery("")}>
                                                <X size={12} className="text-neutral-400" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="py-1 max-h-72 overflow-y-auto">
                                        {searchLoading ? (
                                            <p className="px-4 py-3 text-xs text-neutral-400">Searching…</p>
                                        ) : searchQuery && searchResults.length === 0 ? (
                                            <p className="px-4 py-3 text-xs text-neutral-400">No results for "{searchQuery}".</p>
                                        ) : searchResults.length > 0 ? (
                                            searchResults.map((r, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => { navTo(r.section); setSearchQuery("") }}
                                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-neutral-50"
                                                >
                                                    <span className="text-base">{r.icon}</span>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-neutral-800">{r.label}</p>
                                                        <p className="truncate text-xs text-neutral-400">{r.detail}</p>
                                                    </div>
                                                    <ChevronRight size={12} className="ml-auto shrink-0 text-neutral-300" />
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-4 py-3 space-y-1">
                                                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Quick navigation</p>
                                                {[
                                                    { label: "Investigations", section: "investigations" as Section, icon: "\ud83d\udc64" },
                                                    { label: "Governance",     section: "governance"     as Section, icon: "\ud83c\udfd7\ufe0f" },
                                                    { label: "Audit & Findings", section: "audit"        as Section, icon: "\ud83d\udd0d" },
                                                    { label: "Research",       section: "research"       as Section, icon: "\ud83d\udcda" },
                                                ].map(s => (
                                                    <button
                                                        key={s.section}
                                                        onClick={() => navTo(s.section)}
                                                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-neutral-50"
                                                    >
                                                        <span className="text-sm">{s.icon}</span>
                                                        <span className="text-sm text-neutral-700">{s.label}</span>
                                                        <ChevronRight size={11} className="ml-auto text-neutral-300" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="border-t border-neutral-100 px-4 py-2">
                                        <span className="text-xs text-neutral-400">Esc to close</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Top-nav travelling bubble ── */}
                        <div
                            className="hidden settings-container md:flex"
                            ref={topNavRef}
                            onMouseLeave={() => setTopNavHover(null)}
                        >
                            <div className="glass-bubble" style={topNavBubble} />
                            {topNavTabs.map((tab, i) => (
                                <button
                                    key={tab.label}
                                    id={`top-nav-${tab.label.toLowerCase()}`}
                                    onClick={() => navTo(tab.section)}
                                    onMouseEnter={() => setTopNavHover(i)}
                                    className={[
                                        "settings-pill relative z-10 px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors",
                                        activeTopTab === tab.label ? "font-semibold text-neutral-900" : "text-neutral-500 hover:text-neutral-800",
                                    ].join(" ")}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Help */}
                        <button
                            id="header-help-btn"
                            className="btn-icon relative flex h-8 w-8 items-center justify-center"
                            onClick={() => setShowFaq(true)}
                            title="Help & FAQ"
                        >
                            <HelpCircle size={15} />
                        </button>

                        {/* Notification bell */}
                        <div className="relative" ref={notifRef}>
                            <button
                                id="header-notifications-btn"
                                className="btn-icon relative flex h-8 w-8 items-center justify-center"
                                onClick={() => setShowNotifications(p => !p)}
                                title="Recent activity"
                            >
                                <Bell size={15} />
                                {notifications.length > 0 && (
                                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-neutral-700" />
                                )}
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 top-[calc(100%+6px)] w-80 rounded-xl border border-neutral-200 bg-white shadow-xl z-50 overflow-hidden">
                                    <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                                        <h3 className="text-sm font-semibold text-neutral-900">Recent Activity</h3>
                                        <span className="text-xs text-neutral-400">{notifications.length} events</span>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <p className="px-4 py-6 text-center text-xs text-neutral-400">No recent activity.</p>
                                        ) : (
                                            <div className="divide-y divide-neutral-100">
                                                {notifications.map((n) => {
                                                    let dest: Section = "home"
                                                    if (n.type === "investigation") dest = "investigations"
                                                    else if (n.type === "agent_run") dest = "agents"
                                                    else if (n.type === "knowledge") dest = "audit"
                                                    else if (n.type === "document") dest = "investigations"
                                                    return (
                                                        <button
                                                            key={n.id}
                                                            onClick={() => { navTo(dest); setShowNotifications(false) }}
                                                            className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-neutral-50"
                                                        >
                                                            <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-neutral-100 flex items-center justify-center text-xs">
                                                                {n.type === "agent_run" ? "\u26a1" : n.type === "knowledge" ? "\ud83d\udcda" : n.type === "document" ? "\ud83d\udcc4" : "\ud83d\udd0d"}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-xs font-medium text-neutral-800 truncate">{n.title}</p>
                                                                <p className="mt-0.5 text-xs text-neutral-400 truncate">{n.detail}</p>
                                                            </div>
                                                            <span className="shrink-0 text-xs text-neutral-400">{n.time}</span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <div className="border-t border-neutral-100 px-4 py-2">
                                        <button
                                            onClick={() => { navTo("audit"); setShowNotifications(false) }}
                                            className="text-xs text-neutral-500 hover:text-neutral-800"
                                        >
                                            View full audit trail →
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                    <div className="flex-1 overflow-y-auto">

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
                    ) : activeSection === "settings" ? (
                        <section className="p-5">
                            <SettingsWorkspace user={user} />
                        </section>
                    ) : activeSection === "help" ? (
                        <section className="p-5">
                            <Help />
                        </section>
                    ) : (
                        <section className="p-5">
                            <HomeWorkspace
                                user={user}
                                activeSection={activeSection}
                                onOpenResearch={() => navTo("research")}
                                onOpenInvestigations={() => navTo("investigations")}
                                onOpenAgents={() => navTo("agents")}
                                onOpenAudit={() => navTo("audit")}
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
                    
                    {showFaq && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20">
                            <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl">
                                <h2 className="text-lg font-semibold text-neutral-900 mb-4">Frequently Asked Questions</h2>
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-medium text-neutral-900 mb-1">What is OpusLex?</h3>
                                        <p className="text-sm text-neutral-600">OpusLex is a legal compliance and research assistant that helps you stay on top of regulations, policies, and internal audits using AI.</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-neutral-900 mb-1">How does the AI Agent work?</h3>
                                        <p className="text-sm text-neutral-600">Our agents securely analyze your workspace documents against global regulatory frameworks to highlight risks and compliance gaps.</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-neutral-900 mb-1">Where is my data stored?</h3>
                                        <p className="text-sm text-neutral-600">Your data remains in your designated workspace environment and is never used to train our base models.</p>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end pt-4 border-t border-neutral-100">
                                    <button className="rounded bg-neutral-900 px-4 py-1.5 text-xs text-white" onClick={() => setShowFaq(false)}>Close</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

export default Dashboard