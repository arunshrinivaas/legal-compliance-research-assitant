import { useState } from "react"

type AuthProps = {
    onLoginSuccess: () => void
}

function Auth({ onLoginSuccess }: AuthProps) {
    const [email, setEmail] = useState("")
    const [fullName, setFullName] = useState("")
    const [password, setPassword] = useState("")
    const [message, setMessage] = useState("")
    const [isRegistering, setIsRegistering] = useState(false)

    const handleLogin = async () => {
        setMessage("Signing in...")

        try {
            const response = await fetch("http://127.0.0.1:8000/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                setMessage(data.detail || "Login failed")
                return
            }

            setMessage(`Welcome, ${data.full_name}!`)
            onLoginSuccess()
        } catch {
            setMessage("Unable to connect to the backend")
        }
    }

    const handleRegister = async () => {
        setMessage("Creating account...")

        try {
            const response = await fetch("http://127.0.0.1:8000/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                    full_name: fullName,
                }),
            })

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
        <div className="auth-card">
            <h2>{isRegistering ? "Create account" : "Sign in"}</h2>

            {isRegistering && (
                <input
                    type="text"
                    placeholder="Full name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                />
            )}

            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
            />

            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
            />

            <button onClick={isRegistering ? handleRegister : handleLogin}>
                {isRegistering ? "Create account" : "Sign in"}
            </button>

            <p>{message}</p>

            <p>
                {isRegistering
                    ? "Already have an account?"
                    : "Don't have an account?"}

                <button
                    onClick={() => {
                        setIsRegistering(!isRegistering)
                        setMessage("")
                    }}
                >
                    {isRegistering ? "Sign in" : "Create account"}
                </button>
            </p>
        </div>
    )
}

export default Auth