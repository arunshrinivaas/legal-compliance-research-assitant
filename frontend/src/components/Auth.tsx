import { useState, useEffect, useRef, useCallback } from "react"
import { OpusLexBrand } from "./OpusLexBrand"
import { Apple, Smartphone } from "lucide-react"

type AuthProps = {
    onLoginSuccess: () => void
}

/* ── Legal document content for the cinematic background ── */
const DOC_LAYERS = [
    {
        title: "INFORMATION SECURITY POLICY",
        content: [
            "1. PURPOSE",
            "This policy establishes the minimum information security requirements for all systems, personnel, and data assets operated under the enterprise framework. Compliance is mandatory.",
            "2. SCOPE",
            "Applies to all employees, contractors, consultants, temporary workers, and third-party vendors who access, process, or store company data.",
            "3. CLASSIFICATION",
            "Data must be classified as: CONFIDENTIAL | INTERNAL USE ONLY | PUBLIC. Misclassification constitutes a policy violation.",
            "CONTROL ID: ISP-001 | VERSION: 4.2 | STATUS: ACTIVE",
            "Next Review: Q4 2026 | Owner: Chief Information Security Officer",
        ]
    },
    {
        title: "DATA PROTECTION STANDARD",
        content: [
            "ARTICLE 1 — DATA CLASSIFICATION FRAMEWORK",
            "All electronic information assets shall be classified at the point of creation. Classification determines handling, storage, transmission, and disposal requirements.",
            "ARTICLE 2 — RETENTION REQUIREMENTS",
            "Electronic records must be retained in strict accordance with the Global Retention Schedule v2026.1. Financial records: 7 years. HR records: 5 years.",
            "ARTICLE 3 — THIRD PARTY OBLIGATIONS",
            "Any vendor or subprocessor receiving personal data must execute a Data Processing Agreement prior to receiving access. Annual compliance audits are required.",
            "POLICY ID: DPS-2026 | EFFECTIVE: JAN 1, 2026",
        ]
    },
    {
        title: "COMPLIANCE CONTROL REGISTER",
        content: [
            "CONTROL ID: SEC-01 | CATEGORY: Encryption",
            "REQUIREMENT: Strong encryption (AES-256 or equivalent) must be applied to all data at rest and in transit. TLS 1.3 minimum for all external connections.",
            "CONTROL ID: ACC-07 | CATEGORY: Access Control",
            "REQUIREMENT: Role-based access control (RBAC) must be implemented. Privileged access review required quarterly.",
            "CONTROL ID: AUD-12 | CATEGORY: Audit Logging",
            "REQUIREMENT: All system access events must be logged with user, timestamp, action, and outcome. Logs retained 12 months minimum.",
            "STATUS: ACTIVE | LAST AUDIT: JUL 2026 | NEXT REVIEW: Q4 2026",
        ]
    },
    {
        title: "INVESTIGATION FINDINGS REPORT",
        content: [
            "CASE REFERENCE: INV-2026-0847",
            "SUBJECT: Potential breach of data handling procedures — Finance division.",
            "FINDING 1: Evidence suggests unauthorized data export occurred between 14–16 Aug 2026. Affected records: ~2,400 customer profiles.",
            "FINDING 2: Access logs confirm three separate user accounts accessed restricted export functions outside of normal business hours.",
            "RECOMMENDATION: Immediate suspension of affected accounts. Full forensic review. Mandatory re-training for all Finance data handlers.",
            "CLASSIFICATION: CONFIDENTIAL | DISTRIBUTION: RESTRICTED",
        ]
    }
]

/* ─────────────────────────────────────────────────────────────────────────
   AuthBackground
   
   STACKING ORDER (bottom → top):
   [1] Base dark background (#050508)
   [2] Document layers — animated, modest base opacity (0.45–0.55)
   [3] Vignette edge darkening (fixed, CSS gradient)
   [4] REVEAL OVERLAY — a radial-gradient background that is nearly
       opaque (#050508) everywhere EXCEPT around the cursor where it
       transitions to fully transparent, revealing the docs underneath.
       The gradient background is updated directly via style.background
       in the rAF loop — zero React re-renders, zero CSS mask issues in Safari.
   [5] Login card (z-20)
   
   WHY THIS APPROACH:
   - CSS mask-image with CSS custom properties fails in Safari when the
     custom property lives on the same element (Safari doesn't support
     env()/var() inside mask-image in some versions).
   - Using background: radial-gradient(...) with direct style.background
     update is universally supported and GPU-composited.
   - The overlay IS the darkness; punching it transparent reveals docs.
─────────────────────────────────────────────────────────────────────────── */

function AuthBackground({ reduceMotion }: { reduceMotion: boolean }) {
    const overlayRef = useRef<HTMLDivElement>(null)
    const mouse = useRef({ x: -9999, y: -9999, entered: false })
    const smooth = useRef({ x: -9999, y: -9999 })
    const rafRef = useRef<number | null>(null)

    const RADIUS = 320  // px

    const buildGradient = (x: number, y: number, entered: boolean) => {
        if (!entered) {
            // No mouse — fully dark everywhere
            return `#050508`
        }
        // Transparent at cursor → opaque at edges
        // The overlay "punches through" to reveal docs below
        return [
            `radial-gradient(circle ${RADIUS}px at ${x}px ${y}px,`,
            `  rgba(5,5,8,0.0)  0%,`,
            `  rgba(5,5,8,0.25) 28%,`,
            `  rgba(5,5,8,0.60) 52%,`,
            `  rgba(5,5,8,0.82) 70%,`,
            `  rgba(5,5,8,0.94) 85%,`,
            `  rgba(5,5,8,0.98) 100%`,
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
            // Static dark state — no animation
            if (overlayRef.current) {
                overlayRef.current.style.background = "#050508"
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
            style={{ background: "#050508" }}
        >
            {/* ── [2] Document layers — visible at modest opacity ── */}
            <DocLayer
                doc={DOC_LAYERS[0]}
                animate={!reduceMotion}
                className="auth-doc-1"
                style={{ top: "-5%", left: "-8%", width: "68%", opacity: 0.52 }}
                scale={1}
            />
            <DocLayer
                doc={DOC_LAYERS[1]}
                animate={!reduceMotion}
                className="auth-doc-2"
                style={{ top: "8%", right: "-6%", width: "52%", opacity: 0.45 }}
                scale={0.9}
            />
            <DocLayer
                doc={DOC_LAYERS[2]}
                animate={!reduceMotion}
                className="auth-doc-3"
                style={{ bottom: "-3%", left: "8%", width: "46%", opacity: 0.42 }}
                scale={0.85}
            />
            <DocLayer
                doc={DOC_LAYERS[3]}
                animate={!reduceMotion}
                className="auth-doc-1"
                style={{ bottom: "2%", right: "-4%", width: "44%", opacity: 0.38, animationDelay: "-14s", animationDuration: "38s" }}
                scale={0.8}
            />

            {/* ── [3] Fixed radial vignette (edge darkening, always on) ── */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: "radial-gradient(ellipse 100% 80% at 50% 50%, transparent 0%, rgba(5,5,8,0.4) 60%, rgba(5,5,8,0.85) 100%)",
                }}
            />

            {/* ── [4] THE REVEAL OVERLAY — updated by rAF via style.background ── */}
            <div
                ref={overlayRef}
                className="absolute inset-0 pointer-events-none"
                style={{ background: "#050508" }}  // starts fully dark; rAF takes over
            />

            {/* ── Footer ── */}
            <div
                className="absolute bottom-4 left-0 right-0 text-center pointer-events-none"
                style={{
                    fontSize: "0.6rem",
                    letterSpacing: "0.18em",
                    color: "rgba(255,255,255,0.2)",
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
                background: "linear-gradient(135deg, #1c1c2e 0%, #16213e 55%, #0f3460 100%)",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: `${scale * 36}px ${scale * 44}px`,
                fontFamily: "'SF Mono', 'Fira Code', 'Courier New', monospace",
                boxShadow: "0 12px 80px rgba(0,0,0,0.5)",
            }}
        >
            {/* Title bar */}
            <div style={{
                fontSize: "0.6rem",
                letterSpacing: "0.28em",
                color: "rgba(148,163,184,0.85)",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                paddingBottom: `${scale * 14}px`,
                marginBottom: `${scale * 18}px`,
                fontWeight: 700,
                textTransform: "uppercase",
            }}>
                {doc.title}
            </div>
            {doc.content.map((line, i) => (
                <div key={i} style={{
                    fontSize: i % 2 === 0 ? "0.58rem" : "0.52rem",
                    color: i % 2 === 0 ? "rgba(203,213,225,0.9)" : "rgba(148,163,184,0.55)",
                    fontWeight: i % 2 === 0 ? 600 : 400,
                    marginTop: i % 2 === 0 ? `${scale * 12}px` : "3px",
                    lineHeight: 1.65,
                    letterSpacing: i % 2 === 0 ? "0.1em" : "0.03em",
                }}>
                    {line}
                </div>
            ))}
        </div>
    )
}

function Auth({ onLoginSuccess }: AuthProps) {
    const [email, setEmail] = useState("")
    const [fullName, setFullName] = useState("")
    const [password, setPassword] = useState("")
    const [message, setMessage] = useState("")
    const [isRegistering, setIsRegistering] = useState(false)
    const [showFaq, setShowFaq] = useState(false)

    const reduceMotion =
        (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) ||
        localStorage.getItem("pref_reduce_motion") === "true"

    const handleLogin = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        setMessage("Signing in…")
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
        }
    }

    const handleRegister = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        setMessage("Creating account…")
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
        }
    }

    return (
        <div className="relative flex h-screen w-full items-center justify-center overflow-hidden text-neutral-100">
            {/* ── Cinematic interactive background ── */}
            <AuthBackground reduceMotion={reduceMotion} />

            {/* ── Login card — z-20 keeps it above the reveal overlay ── */}
            <div className="relative w-full max-w-[380px] mx-4 flex flex-col" style={{ zIndex: 20 }}>
                <div
                    style={{
                        background: "rgba(255,255,255,0.07)",
                        backdropFilter: "blur(32px) saturate(180%)",
                        WebkitBackdropFilter: "blur(32px) saturate(180%)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        borderRadius: "20px",
                        boxShadow: "0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.18)",
                        padding: "40px 32px 36px",
                    }}
                >
                    {/* ── Brand lockup ── */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="mb-2.5">
                            <OpusLexBrand variant="dark" />
                        </div>
                        <p style={{
                            color: "rgba(255,255,255,0.6)",
                            fontSize: "0.8125rem",
                            letterSpacing: "0.04em",
                            textAlign: "center",
                            margin: 0,
                        }}>
                            Legal &amp; Compliance Intelligence
                        </p>
                    </div>

                    {/* ── OAuth providers (visually disabled) ── */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
                        <ProviderButton
                            icon={
                                <svg width="18" height="18" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            }
                            label="Continue with Google"
                        />
                        <ProviderButton icon={<Apple size={18} strokeWidth={1.5} />} label="Continue with Apple" />
                        <ProviderButton icon={<Smartphone size={18} strokeWidth={1.5} />} label="Continue with phone" />
                    </div>

                    {/* ── OR divider ── */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.12)" }} />
                        <span style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.2em", fontWeight: 600 }}>OR</span>
                        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.12)" }} />
                    </div>

                    {/* ── Auth form ── */}
                    <form onSubmit={isRegistering ? handleRegister : handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        {isRegistering && (
                            <AuthField label="Full Name" type="text" placeholder="Enter your full name" value={fullName} onChange={setFullName} />
                        )}
                        <AuthField label="Email address" type="email" placeholder="name@company.com" value={email} onChange={setEmail} />
                        <AuthField label="Password" type="password" placeholder="Enter password" value={password} onChange={setPassword} />

                        <button
                            type="submit"
                            className="auth-submit-btn"
                            style={{
                                width: "100%",
                                background: "#111111",
                                color: "#ffffff",
                                border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: "9999px",
                                padding: "14px",
                                fontSize: "0.875rem",
                                fontWeight: 500,
                                cursor: "pointer",
                                marginTop: "4px",
                                transition: "background 0.15s, transform 0.12s, box-shadow 0.15s",
                                boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = "#000"
                                e.currentTarget.style.transform = "translateY(-1px)"
                                e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.6)"
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = "#111111"
                                e.currentTarget.style.transform = ""
                                e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.5)"
                            }}
                        >
                            {isRegistering ? "Create account" : "Continue"}
                        </button>
                    </form>

                    {message && (
                        <div style={{
                            marginTop: "14px",
                            padding: "12px 16px",
                            borderRadius: "10px",
                            fontSize: "0.8125rem",
                            textAlign: "center",
                            fontWeight: 500,
                            background: message.includes("success") || message.includes("Welcome")
                                ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)",
                            border: `1px solid ${message.includes("success") || message.includes("Welcome") ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}`,
                            color: message.includes("success") || message.includes("Welcome") ? "#86efac" : "#fca5a5",
                        }}>
                            {message}
                        </div>
                    )}

                    <div style={{ marginTop: "22px", textAlign: "center" }}>
                        <span style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.45)" }}>
                            {isRegistering ? "Already have an account? " : "Don't have an account? "}
                        </span>
                        <button
                            type="button"
                            onClick={() => { setIsRegistering(!isRegistering); setMessage("") }}
                            style={{
                                background: "none", border: "none",
                                color: "rgba(255,255,255,0.8)", fontSize: "0.8125rem",
                                fontWeight: 600, cursor: "pointer",
                                textDecoration: "underline", textUnderlineOffset: "3px", padding: 0,
                            }}
                        >
                            {isRegistering ? "Log in" : "Sign up"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Public Footer */}
            <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4 text-[11px] font-medium text-white/50 z-50">
                <button 
                    onClick={() => setShowFaq(true)}
                    className="hover:text-white transition-colors cursor-pointer px-3 py-1.5 rounded-full hover:bg-white/10"
                >
                    FAQ
                </button>
                <span>·</span>
                <button 
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-cookie-settings'))
                    }}
                    className="hover:text-white transition-colors cursor-pointer px-3 py-1.5 rounded-full hover:bg-white/10"
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

function ProviderButton({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <button
            type="button"
            disabled
            style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                gap: "10px",
                background: "rgba(255,255,255,0.9)",
                color: "#1f2937",
                border: "none",
                borderRadius: "9999px",
                padding: "12px 16px",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "not-allowed",
                opacity: 0.52,
            }}
        >
            <span style={{ position: "absolute", left: "16px", display: "flex", alignItems: "center" }}>
                {icon}
            </span>
            <span>{label}</span>
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
                color: "rgba(255,255,255,0.75)", marginBottom: "6px",
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
                    background: "rgba(255,255,255,0.95)",
                    border: "1px solid rgba(255,255,255,0.25)",
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

export default Auth