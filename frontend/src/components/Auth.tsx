import { useState, useEffect, useRef, useCallback } from "react"
import { OpusLexBrand } from "./OpusLexBrand"
import { Smartphone, Mail, ArrowLeft, Loader2 } from "lucide-react"

type AuthProps = {
    onLoginSuccess: () => void
}

/* ── Legal document content for the cinematic background ── */
const DOC_LAYERS = [
    {
        title: "INFORMATION SECURITY POLICY — MASTER ENTERPRISE DOCUMENT",
        content: [
            "1. PURPOSE",
            "This policy establishes the minimum information security requirements for all systems, personnel, and data assets operated under the enterprise framework. Compliance is mandatory.",
            "2. SCOPE",
            "Applies to all employees, contractors, consultants, temporary workers, and third-party vendors who access, process, or store company data.",
            "3. CLASSIFICATION",
            "Data must be classified as: CONFIDENTIAL | INTERNAL USE ONLY | PUBLIC. Misclassification constitutes a policy violation.",
            "CONTROL ID: ISP-001 | VERSION: 4.2 | STATUS: ACTIVE",
            "Next Review: Q4 2026 | Owner: Chief Information Security Officer",
            "4. ACCESS MANAGEMENT",
            "Access to information systems must be granted on a strict least privilege basis. All accounts must be protected by multi-factor authentication. Privileged access requires quarterly review.",
            "5. INCIDENT RESPONSE",
            "Any suspected security incident or policy violation must be reported immediately to the Global Security Operations Center (GSOC). Refer to the Incident Response Playbook for escalation procedures.",
            "6. COMPLIANCE OBLIGATIONS",
            "Failure to adhere to this policy may result in disciplinary action up to and including termination of employment or contract. Exceptions must be documented and approved by the CISO.",
            "7. PHYSICAL SECURITY",
            "Physical access to facilities housing sensitive information or IT infrastructure is restricted. Badge access logs are retained for 90 days."
        ]
    },
    {
        title: "DATA PROTECTION STANDARD — GLOBAL PRIVACY FRAMEWORK",
        content: [
            "ARTICLE 1 — DATA CLASSIFICATION FRAMEWORK",
            "All electronic information assets shall be classified at the point of creation. Classification determines handling, storage, transmission, and disposal requirements.",
            "ARTICLE 2 — RETENTION REQUIREMENTS",
            "Electronic records must be retained in strict accordance with the Global Retention Schedule v2026.1. Financial records: 7 years. HR records: 5 years.",
            "ARTICLE 3 — THIRD PARTY OBLIGATIONS",
            "Any vendor or subprocessor receiving personal data must execute a Data Processing Agreement prior to receiving access. Annual compliance audits are required.",
            "POLICY ID: DPS-2026 | EFFECTIVE: JAN 1, 2026",
            "ARTICLE 4 — ENCRYPTION STANDARDS",
            "All personal data must be encrypted in transit and at rest using approved cryptographic algorithms. Passwords must be hashed using Argon2id or equivalent.",
            "ARTICLE 5 — CROSS-BORDER TRANSFERS",
            "Transfer of personal data across jurisdictions is strictly prohibited unless explicit consent has been obtained and a valid transfer mechanism is in place.",
            "ARTICLE 6 — DATA SUBJECT RIGHTS",
            "Requests for data access, rectification, or erasure must be fulfilled within 30 days of receipt to comply with global privacy regulations."
        ]
    },
    {
        title: "COMPLIANCE CONTROL REGISTER — QUARTERLY REVIEW",
        content: [
            "CONTROL ID: SEC-01 | CATEGORY: Encryption",
            "REQUIREMENT: Strong encryption (AES-256 or equivalent) must be applied to all data at rest and in transit. TLS 1.3 minimum for all external connections.",
            "CONTROL ID: ACC-07 | CATEGORY: Access Control",
            "REQUIREMENT: Role-based access control (RBAC) must be implemented. Privileged access review required quarterly.",
            "CONTROL ID: AUD-12 | CATEGORY: Audit Logging",
            "REQUIREMENT: All system access events must be logged with user, timestamp, action, and outcome. Logs retained 12 months minimum.",
            "STATUS: ACTIVE | LAST AUDIT: JUL 2026 | NEXT REVIEW: Q4 2026",
            "CONTROL ID: BCP-02 | CATEGORY: Business Continuity",
            "REQUIREMENT: Annual disaster recovery testing is mandatory. RTO: 4 hours. RPO: 1 hour.",
            "CONTROL ID: VUL-04 | CATEGORY: Vulnerability Management",
            "REQUIREMENT: Critical vulnerabilities must be patched within 7 days. High vulnerabilities within 30 days.",
            "CONTROL ID: IAM-09 | CATEGORY: Identity Management",
            "REQUIREMENT: Segregation of duties must be enforced for all critical financial applications."
        ]
    },
    {
        title: "INVESTIGATION FINDINGS REPORT — CASE REF: INV-2026-0847",
        content: [
            "CASE REFERENCE: INV-2026-0847",
            "SUBJECT: Potential breach of data handling procedures — Finance division.",
            "FINDING 1: Evidence suggests unauthorized data export occurred between 14–16 Aug 2026. Affected records: ~2,400 customer profiles.",
            "FINDING 2: Access logs confirm three separate user accounts accessed restricted export functions outside of normal business hours.",
            "RECOMMENDATION: Immediate suspension of affected accounts. Full forensic review. Mandatory re-training for all Finance data handlers.",
            "CLASSIFICATION: CONFIDENTIAL | DISTRIBUTION: RESTRICTED",
            "FINDING 3: The exported data was transmitted to an unapproved external cloud storage provider via an anomalous outbound HTTPS connection.",
            "FINDING 4: Data loss prevention (DLP) controls were bypassed using fragmented archiving techniques.",
            "ACTION PLAN: Implement strict DLP rules blocking all external cloud storage domains. Enhance endpoint monitoring for archiving utilities.",
            "STATUS: ONGOING | LEAD INVESTIGATOR: T. ALVERSON"
        ]
    }
]

function AuthBackground({ reduceMotion }: { reduceMotion: boolean }) {
    const overlayRef = useRef<HTMLDivElement>(null)
    const mouse = useRef({ x: -9999, y: -9999, entered: false })
    const smooth = useRef({ x: -9999, y: -9999 })
    const rafRef = useRef<number | null>(null)
    const [activeDoc, setActiveDoc] = useState(0)

    const RADIUS = 320  // px

    useEffect(() => {
        if (reduceMotion) return
        const interval = setInterval(() => {
            setActiveDoc(prev => (prev + 1) % DOC_LAYERS.length)
        }, 3000)
        return () => clearInterval(interval)
    }, [reduceMotion])

    const buildGradient = (x: number, y: number, entered: boolean) => {
        if (!entered) {
            return `rgba(249,250,251,1)` // Light warm gray base
        }
        return [
            `radial-gradient(circle ${RADIUS}px at ${x}px ${y}px,`,
            `  rgba(251,198,72,0.18)  0%,`, // OpusLex Yellow core (UV illumination)
            `  rgba(251,198,72,0.08) 35%,`,
            `  rgba(249,250,251,0.5) 60%,`,
            `  rgba(249,250,251,0.85) 80%,`,
            `  rgba(249,250,251,1) 100%`,
            `)`
        ].join(" ")
    }

    const animate = useCallback(() => {
        const lf = 0.085
        smooth.current.x += (mouse.current.x - smooth.current.x) * lf
        smooth.current.y += (mouse.current.y - smooth.current.y) * lf

        if (overlayRef.current) {
            overlayRef.current.style.background = buildGradient(
                smooth.current.x,
                smooth.current.y,
                mouse.current.entered
            )
        }
        rafRef.current = requestAnimationFrame(animate)
    }, [])

    useEffect(() => {
        if (reduceMotion) {
            if (overlayRef.current) {
                overlayRef.current.style.background = "rgba(249,250,251,1)"
            }
            return
        }

        const onMove = (e: MouseEvent) => {
            mouse.current.x = e.clientX
            mouse.current.y = e.clientY
            mouse.current.entered = true
        }
        const onLeave = () => {
            mouse.current.entered = false
        }

        window.addEventListener("mousemove", onMove, { passive: true })
        window.addEventListener("mouseleave", onLeave, { passive: true })
        rafRef.current = requestAnimationFrame(animate)

        return () => {
            window.removeEventListener("mousemove", onMove)
            window.removeEventListener("mouseleave", onLeave)
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
        }
    }, [reduceMotion, animate])

    return (
        <div
            className="absolute inset-0 overflow-hidden"
            style={{ background: "#f9fafb" }} // Light base
        >
            {/* ── [2] Document layers — slideshow ── */}
            {DOC_LAYERS.map((doc, i) => (
                <div
                    key={i}
                    className="absolute inset-0 flex items-center justify-center transition-opacity duration-1000"
                    style={{
                        opacity: i === activeDoc ? 0.65 : 0,
                        pointerEvents: "none"
                    }}
                >
                    <DocLayer
                        doc={doc}
                        animate={false}
                        className=""
                        style={{ width: "120%", height: "120%", left: "-10%", top: "-10%" }}
                        scale={1.2}
                    />
                </div>
            ))}

            {/* ── [3] Fixed radial vignette (edge darkening, always on) ── */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: "radial-gradient(ellipse 100% 80% at 50% 50%, transparent 0%, rgba(243,244,246,0.5) 60%, rgba(229,231,235,0.9) 100%)",
                }}
            />

            {/* ── [4] THE REVEAL OVERLAY — updated by rAF via style.background ── */}
            <div
                ref={overlayRef}
                className="absolute inset-0 pointer-events-none"
                style={{ background: "#f9fafb" }}
            />

            {/* ── Footer ── */}
            <div
                className="absolute bottom-4 left-0 right-0 text-center pointer-events-none"
                style={{
                    fontSize: "0.6rem",
                    letterSpacing: "0.18em",
                    color: "rgba(107,114,128,0.6)", // gray-500
                    zIndex: 5,
                }}
            >
                © {new Date().getFullYear()} OPUSLEX — ENTERPRISE ACCESS ONLY
            </div>
        </div>
    )
}

function DocLayer({
    doc, animate: shouldAnimate, className, style, scale,
}: {
    doc: typeof DOC_LAYERS[0]
    animate: boolean
    className: string
    style: React.CSSProperties
    scale: number
}) {
    return (
        <div
            className={`absolute pointer-events-none select-none${shouldAnimate ? ` ${className}` : ""}`}
            style={style}
        >
            <DocCard doc={doc} scale={scale} />
        </div>
    )
}

function DocCard({ doc, scale }: { doc: typeof DOC_LAYERS[0]; scale: number }) {
    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 55%, #f3f4f6 100%)",
                padding: `${scale * 40}px ${scale * 60}px`,
                fontFamily: "'SF Mono', 'Fira Code', 'Courier New', monospace",
                boxShadow: "0 12px 80px rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
            }}
        >
            <div style={{
                fontSize: "1.2rem",
                letterSpacing: "0.28em",
                color: "rgba(55,65,81,0.85)", // slate-700
                borderBottom: "1px solid rgba(0,0,0,0.08)",
                paddingBottom: `${scale * 14}px`,
                marginBottom: `${scale * 24}px`,
                fontWeight: 700,
                textTransform: "uppercase",
            }}>
                {doc.title}
            </div>
            {doc.content.map((line, i) => (
                <div key={i} style={{
                    fontSize: i % 2 === 0 ? "1.0rem" : "0.9rem",
                    color: i % 2 === 0 ? "rgba(71,85,105,0.9)" : "rgba(100,116,139,0.7)", // slate text
                    fontWeight: i % 2 === 0 ? 600 : 400,
                    marginTop: i % 2 === 0 ? `${scale * 16}px` : "6px",
                    lineHeight: 1.65,
                    letterSpacing: i % 2 === 0 ? "0.1em" : "0.03em",
                }}>
                    {line}
                </div>
            ))}
        </div>
    )
}

function ProviderButton({ icon, label, onClick, disabled, loading }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; loading?: boolean }) {
    return (
        <button
            type="button"
            disabled={disabled || loading}
            onClick={onClick}
            style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                gap: "10px",
                background: "#ffffff",
                color: "#111",
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                borderRadius: "9999px",
                padding: "12px 16px",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: (disabled || loading) ? "not-allowed" : "pointer",
                opacity: (disabled || loading) ? 0.6 : 1,
                transition: "all 0.2s ease"
            }}
            onMouseEnter={e => {
                if (!disabled && !loading) {
                    e.currentTarget.style.background = "#fafafa"
                    e.currentTarget.style.transform = "translateY(-1px)"
                }
            }}
            onMouseLeave={e => {
                if (!disabled && !loading) {
                    e.currentTarget.style.background = "#ffffff"
                    e.currentTarget.style.transform = ""
                }
            }}
        >
            <span style={{ position: "absolute", left: "16px", display: "flex", alignItems: "center" }}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : icon}
            </span>
            <span>{loading ? "Connecting..." : label}</span>
        </button>
    )
}

function AuthField({ label, type, placeholder, value, onChange }: {
    label: string; type: string; placeholder: string; value: string; onChange: (v: string) => void
}) {
    return (
        <div>
            <label style={{
                display: "block", fontSize: "0.8125rem", fontWeight: 500,
                color: "#4b5563", marginBottom: "6px",
            }}>
                {label}
            </label>
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                required
                style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: "#ffffff",
                    border: "1px solid rgba(0,0,0,0.1)",
                    borderRadius: "9999px",
                    color: "#111",
                    fontSize: "0.875rem",
                    outline: "none",
                    transition: "box-shadow 0.15s",
                }}
                onFocus={e => (e.target.style.boxShadow = "0 0 0 3px rgba(255,255,255,0.25)")}
                onBlur={e => (e.target.style.boxShadow = "none")}
            />
        </div>
    )
}

function Auth({ onLoginSuccess }: AuthProps) {
    const [loginStage, setLoginStage] = useState<'initial' | 'email'>('initial')
    const [email, setEmail] = useState("")
    const [fullName, setFullName] = useState("")
    const [password, setPassword] = useState("")
    const [message, setMessage] = useState("")
    const [isRegistering, setIsRegistering] = useState(false)
    const [showFaq, setShowFaq] = useState(false)
    const [authLoading, setAuthLoading] = useState<string | null>(null)

    const reduceMotion =
        (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) ||
        localStorage.getItem("pref_reduce_motion") === "true"

    const handleLogin = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        setMessage("Signing in…")
        setAuthLoading("email")
        try {
            const response = await fetch("http://127.0.0.1:8000/api/v1/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            })
            const data = await response.json()
            if (!response.ok) { setMessage(data.detail || "Login failed"); return }
            localStorage.setItem("access_token", data.access_token)
            localStorage.setItem("current_user", JSON.stringify(data.user))
            setMessage(`Welcome, ${data.user.full_name}!`)
            onLoginSuccess()
        } catch {
            setMessage("Unable to connect to the backend")
        } finally {
            setAuthLoading(null)
        }
    }

    const handleRegister = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        setMessage("Creating account…")
        setAuthLoading("email")
        try {
            const response = await fetch("http://127.0.0.1:8000/api/v1/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, full_name: fullName }),
            })
            const data = await response.json()
            if (!response.ok) { setMessage(data.detail || "Registration failed"); return }
            setMessage("Account created successfully!")
            setIsRegistering(false)
            setFullName("")
            setPassword("")
        } catch {
            setMessage("Unable to connect to the backend")
        } finally {
            setAuthLoading(null)
        }
    }



    return (
        <div className="relative flex h-screen w-full items-center justify-center overflow-hidden text-neutral-100">
            {/* ── Cinematic interactive background ── */}
            <AuthBackground reduceMotion={reduceMotion} />

            {/* ── Login card — z-20 keeps it above the reveal overlay ── */}
            <div className="relative w-full max-w-[380px] mx-4 flex flex-col transition-all duration-300" style={{ zIndex: 20 }}>
                <div
                    style={{
                        background: "#f3f4f6",
                        border: "1px solid rgba(0,0,0,0.08)",
                        borderRadius: "20px",
                        boxShadow: "0 24px 64px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)",
                        padding: "40px 32px 36px",
                    }}
                >
                    {/* ── Brand lockup ── */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="mb-2.5">
                            <OpusLexBrand variant="dark" className="w-[240px] h-auto" />
                        </div>
                        <p style={{
                            color: "#111",
                            fontSize: "0.8125rem",
                            letterSpacing: "0.04em",
                            textAlign: "center",
                            margin: 0,
                            fontWeight: 500,
                        }}>
                            Legal &amp; Compliance Intelligence
                        </p>
                    </div>

                    <div className="transition-all duration-300 relative">
                        {loginStage === 'initial' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
                                    <ProviderButton
                                        icon={
                                            <svg width="18" height="18" viewBox="0 0 24 24" style={{ filter: "grayscale(100%)", opacity: 0.6 }}>
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                        }
                                        label="Google (Coming Soon)"
                                        onClick={() => {}}
                                        disabled={true}
                                    />
                                    <ProviderButton
                                        icon={<span style={{ fontSize: "18px", lineHeight: 1, opacity: 0.6, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}></span>}
                                        label="Apple (Coming Soon)"
                                        onClick={() => {}}
                                        disabled={true}
                                    />
                                    <ProviderButton
                                        icon={<Smartphone size={18} strokeWidth={1.5} style={{ opacity: 0.6 }} />}
                                        label="Phone (Coming Soon)"
                                        onClick={() => {}}
                                        disabled={true}
                                    />
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                                    <div style={{ flex: 1, height: "1px", background: "rgba(0,0,0,0.06)" }} />
                                    <span style={{ fontSize: "0.625rem", color: "#6b7280", letterSpacing: "0.2em", fontWeight: 600 }}>OR</span>
                                    <div style={{ flex: 1, height: "1px", background: "rgba(0,0,0,0.06)" }} />
                                </div>

                                <ProviderButton
                                    icon={<Mail size={18} strokeWidth={1.5} />}
                                    label="Continue with email"
                                    onClick={() => { setLoginStage('email'); setMessage(""); }}
                                />
                            </div>
                        )}

                        {loginStage === 'email' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <button
                                    onClick={() => { setLoginStage('initial'); setMessage(""); setIsRegistering(false); }}
                                    className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition-colors mb-4"
                                >
                                    <ArrowLeft size={14} />
                                    Back
                                </button>

                                <form onSubmit={isRegistering ? handleRegister : handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                                    {isRegistering && (
                                        <AuthField label="Full Name" type="text" placeholder="Enter your full name" value={fullName} onChange={setFullName} />
                                    )}
                                    <AuthField label="Email address" type="email" placeholder="name@company.com" value={email} onChange={setEmail} />
                                    <AuthField label="Password" type="password" placeholder="Enter password" value={password} onChange={setPassword} />

                                    <button
                                        type="submit"
                                        className="auth-submit-btn"
                                        disabled={authLoading === "email"}
                                        style={{
                                            width: "100%",
                                            background: "#111111",
                                            color: "#ffffff",
                                            border: "1px solid rgba(255,255,255,0.12)",
                                            borderRadius: "9999px",
                                            padding: "14px",
                                            fontSize: "0.875rem",
                                            fontWeight: 500,
                                            cursor: authLoading === "email" ? "not-allowed" : "pointer",
                                            opacity: authLoading === "email" ? 0.7 : 1,
                                            marginTop: "4px",
                                            transition: "background 0.15s, transform 0.12s, box-shadow 0.15s",
                                            boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "8px"
                                        }}
                                        onMouseEnter={e => {
                                            if (authLoading !== "email") {
                                                e.currentTarget.style.background = "#000"
                                                e.currentTarget.style.transform = "translateY(-1px)"
                                                e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.6)"
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (authLoading !== "email") {
                                                e.currentTarget.style.background = "#111111"
                                                e.currentTarget.style.transform = ""
                                                e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.5)"
                                            }
                                        }}
                                    >
                                        {authLoading === "email" && <Loader2 size={16} className="animate-spin" />}
                                        {authLoading === "email" ? "Processing..." : (isRegistering ? "Create account" : "Continue")}
                                    </button>
                                </form>
                            </div>
                        )}


                    </div>

                    {message && (
                        <div style={{
                            marginTop: "14px",
                            padding: "12px 16px",
                            borderRadius: "10px",
                            fontSize: "0.8125rem",
                            textAlign: "center",
                            fontWeight: 500,
                            background: message.includes("success") || message.includes("Welcome") || message.includes("sent")
                                ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)",
                            border: `1px solid ${message.includes("success") || message.includes("Welcome") || message.includes("sent") ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}`,
                            color: message.includes("success") || message.includes("Welcome") || message.includes("sent") ? "#86efac" : "#fca5a5",
                        }}>
                            {message}
                        </div>
                    )}

                    {loginStage === 'initial' && (
                        <div style={{ marginTop: "22px", textAlign: "center" }}>
                            <span style={{ fontSize: "0.8125rem", color: "#111" }}>
                                {isRegistering ? "Already have an account? " : "Don't have an account? "}
                            </span>
                            <button
                                type="button"
                                onClick={() => { setLoginStage('email'); setIsRegistering(true); setMessage(""); }}
                                style={{
                                    background: "none", border: "none",
                                    color: "#111", fontSize: "0.8125rem",
                                    fontWeight: 600, cursor: "pointer",
                                    textDecoration: "underline", textUnderlineOffset: "3px", padding: 0,
                                }}
                            >
                                Sign up
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Public Footer */}
            <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4 text-[11px] font-medium text-neutral-500 z-50">
                <button
                    onClick={() => setShowFaq(true)}
                    className="hover:text-neutral-700 transition-colors cursor-pointer px-3 py-1.5 rounded-full hover:bg-black/5"
                >
                    FAQ
                </button>
                <span>·</span>
                <button
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-cookie-settings'))
                    }}
                    className="hover:text-neutral-700 transition-colors cursor-pointer px-3 py-1.5 rounded-full hover:bg-black/5"
                >
                    Cookie Settings
                </button>
            </div>

            {/* Public FAQ Modal */}
            {showFaq && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between border-b border-neutral-100 p-4">
                            <h2 className="text-lg font-semibold text-neutral-900">Frequently Asked Questions</h2>
                            <button
                                onClick={() => setShowFaq(false)}
                                className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-neutral-900 mb-1">How does the AI Agent work?</h3>
                                <p className="text-sm text-neutral-600">The agent breaks down complex tasks into sub-tasks, researches across attached policies and regulations, and synthesizes a comprehensive finding.</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-neutral-900 mb-1">Is my data secure?</h3>
                                <p className="text-sm text-neutral-600">Yes. All uploaded documents are strictly scoped to your tenant and workspace. OpusLex does not train public models on your private data.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Auth