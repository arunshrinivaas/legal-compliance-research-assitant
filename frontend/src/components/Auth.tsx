import { useState, useEffect } from "react"
import OpusLexLogo from "../assets/OpusLexLogo.svg"
import { Apple, Smartphone } from "lucide-react"

type AuthProps = {
    onLoginSuccess: () => void
}

const BACKGROUND_DOCS = [
    { title: "Information Security Policy", lines: ["1. Purpose", "This policy establishes the minimum requirements for protecting enterprise data assets.", "2. Scope", "Applies to all employees, contractors, and third-party vendors with access to internal networks."] },
    { title: "Data Protection Standard", lines: ["1. Data Classification", "Information must be classified as Confidential, Internal, or Public.", "2. Retention Requirements", "Electronic records must be retained in accordance with the Global Retention Schedule."] },
    { title: "Compliance Review", lines: ["Control ID: SEC-01", "Status: Active", "Requirement: Strong encryption must be applied to all data at rest.", "Next Review: Q4 2026"] },
    { title: "Retention Schedule", lines: ["Policy ID: RET-2026", "Effective Date: Jan 1, 2026", "Category: Financial Records", "Retention Period: 7 Years from fiscal year end."] }
]

function Auth({ onLoginSuccess }: AuthProps) {
    const [email, setEmail] = useState("")
    const [fullName, setFullName] = useState("")
    const [password, setPassword] = useState("")
    const [message, setMessage] = useState("")
    const [isRegistering, setIsRegistering] = useState(false)
    const [docIndex, setDocIndex] = useState(0)
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        const interval = setInterval(() => {
            setIsVisible(false)
            setTimeout(() => {
                setDocIndex((prev) => (prev + 1) % BACKGROUND_DOCS.length)
                setIsVisible(true)
            }, 500)
        }, 4000)
        return () => clearInterval(interval)
    }, [])

    const handleLogin = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setMessage("Signing in...")

        try {
            const response = await fetch(
                "http://127.0.0.1:8000/api/v1/auth/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email,
                        password,
                    }),
                }
            )

            const data = await response.json()

            if (!response.ok) {
                setMessage(data.detail || "Login failed")
                return
            }

            localStorage.setItem("access_token", data.access_token)
            localStorage.setItem(
                "current_user",
                JSON.stringify(data.user)
            )

            setMessage(`Welcome, ${data.user.full_name}!`)
            onLoginSuccess()
        } catch {
            setMessage("Unable to connect to the backend")
        }
    }

    const handleRegister = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setMessage("Creating account...")

        try {
            const response = await fetch(
                "http://127.0.0.1:8000/api/v1/auth/register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email,
                        password,
                        full_name: fullName,
                    }),
                }
            )

            const data = await response.json()

            if (!response.ok) {
                setMessage(data.detail || "Registration failed")
                return
            }

            setMessage("Account created successfully!")
            setIsRegistering(false)
            setFullName("")
            setPassword("")
        } catch {
            setMessage("Unable to connect to the backend")
        }
    }

    return (
        <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-black text-neutral-100">
            {/* Full-viewport Background Layer */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-neutral-900 opacity-60 mix-blend-multiply z-10 pointer-events-none" />
                
                {/* Document Slideshow */}
                <div className="absolute left-1/2 top-1/2 w-[120%] -translate-x-1/2 -translate-y-1/2 transform -rotate-2 scale-110 opacity-30 pointer-events-none z-0 transition-opacity duration-1000">
                    <div 
                        className={`bg-neutral-800 p-12 rounded-xl border border-neutral-700 shadow-2xl transition-opacity duration-500 max-w-5xl mx-auto ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                        style={{ transform: 'perspective(1500px) rotateY(-5deg) rotateX(2deg)' }}
                    >
                        <h3 className="text-neutral-300 font-mono text-2xl border-b border-neutral-600 pb-6 mb-8 uppercase tracking-widest">
                            {BACKGROUND_DOCS[docIndex].title}
                        </h3>
                        <div className="space-y-6">
                            {BACKGROUND_DOCS[docIndex].lines.map((line, i) => (
                                <p key={i} className={`font-mono text-lg ${i % 2 === 0 ? 'text-neutral-400 font-bold mt-8' : 'text-neutral-500'}`}>
                                    {line}
                                </p>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer branding */}
                <div className="absolute bottom-4 left-0 right-0 text-center z-20 text-neutral-500 text-xs tracking-wider">
                    &copy; {new Date().getFullYear()} OpusLex. Enterprise access only.
                </div>
            </div>

            {/* Liquid Glass Login Card */}
            <div className="relative z-20 w-full max-w-[420px] p-8 mx-4">
                <div className="bg-white/15 backdrop-blur-[20px] saturate-[140%] border border-white/25 shadow-2xl rounded-2xl p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]">
                    
                    <div className="flex flex-col items-center justify-center mb-8 gap-3">
                        <img src={OpusLexLogo} alt="OpusLex Logo" className="w-12 h-12 text-white drop-shadow-sm" />
                        <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-sm">OpusLex</h1>
                        <p className="text-white/80 text-sm font-medium text-center drop-shadow-sm">
                            Legal & Compliance Intelligence
                        </p>
                    </div>

                    {/* OAuth Providers (Visually Disabled) */}
                    <div className="flex flex-col gap-2.5 mb-6">
                        <button disabled className="w-full flex items-center justify-center gap-3 bg-white/90 border border-transparent text-neutral-600 py-2.5 rounded-lg font-medium cursor-not-allowed opacity-80 transition-colors shadow-sm">
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google <span className="text-[10px] ml-1 uppercase tracking-wider opacity-60">(Unavailable)</span>
                        </button>
                        <button disabled className="w-full flex items-center justify-center gap-3 bg-white/90 border border-transparent text-neutral-600 py-2.5 rounded-lg font-medium cursor-not-allowed opacity-80 transition-colors shadow-sm">
                            <Apple className="w-5 h-5" />
                            Continue with Apple <span className="text-[10px] ml-1 uppercase tracking-wider opacity-60">(Unavailable)</span>
                        </button>
                        <button disabled className="w-full flex items-center justify-center gap-3 bg-white/90 border border-transparent text-neutral-600 py-2.5 rounded-lg font-medium cursor-not-allowed opacity-80 transition-colors shadow-sm">
                            <Smartphone className="w-5 h-5" />
                            Continue with phone <span className="text-[10px] ml-1 uppercase tracking-wider opacity-60">(Unavailable)</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-px bg-white/20 flex-1"></div>
                        <span className="text-xs text-white/70 font-medium tracking-widest uppercase">OR</span>
                        <div className="h-px bg-white/20 flex-1"></div>
                    </div>

                    <form onSubmit={isRegistering ? handleRegister : handleLogin} className="flex flex-col gap-4">
                        {isRegistering && (
                            <div>
                                <label className="block text-sm font-medium text-white/90 mb-1.5 drop-shadow-sm">Full Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter your full name"
                                    value={fullName}
                                    onChange={(event) => setFullName(event.target.value)}
                                    className="w-full px-4 py-2.5 bg-white/90 border border-white/40 rounded-lg text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all shadow-inner"
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-1.5 drop-shadow-sm">Email Address</label>
                            <input
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="w-full px-4 py-2.5 bg-white/90 border border-white/40 rounded-lg text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all shadow-inner"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-1.5 drop-shadow-sm">Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="w-full px-4 py-2.5 bg-white/90 border border-white/40 rounded-lg text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all shadow-inner"
                                required
                            />
                        </div>

                        <button 
                            type="submit"
                            className="w-full bg-neutral-900/90 text-white font-semibold py-2.5 rounded-lg hover:bg-neutral-900 transition-colors mt-2 shadow-lg backdrop-blur-sm border border-black/20"
                        >
                            {isRegistering ? "Create account" : "Continue"}
                        </button>
                    </form>

                    {message && (
                        <div className={`mt-4 p-3 rounded-lg text-sm text-center font-medium shadow-sm ${message.includes('success') || message.includes('Welcome') ? 'bg-green-500/90 text-white border border-green-400' : 'bg-red-500/90 text-white border border-red-400'}`}>
                            {message}
                        </div>
                    )}

                    <div className="mt-6 text-center">
                        <p className="text-sm text-white/80">
                            {isRegistering ? "Already have an account?" : "Don't have an account?"}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsRegistering(!isRegistering)
                                    setMessage("")
                                }}
                                className="ml-1.5 text-white font-bold hover:underline drop-shadow-sm"
                            >
                                {isRegistering ? "Log in" : "Sign up"}
                            </button>
                        </p>
                    </div>

                </div>
            </div>
        </div>
    )
}

export default Auth