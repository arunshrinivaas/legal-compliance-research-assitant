import { useEffect, useState } from "react"

type Policy = {
    id: number
    title: string
    department: string
    description: string | null
    status: string
    version: string
    effective_date: string | null
    created_at: string | null
}

function Policies() {
    const [policies, setPolicies] = useState<Policy[]>([])
    const [message, setMessage] = useState("Loading policies...")

    useEffect(() => {
        const fetchPolicies = async () => {
            try {
                const response = await fetch("http://127.0.0.1:8000/policies/")

                if (!response.ok) {
                    setMessage("Unable to load policies")
                    return
                }

                const data = await response.json()
                setPolicies(data)
                setMessage("")
            } catch {
                setMessage("Unable to connect to the backend")
            }
        }

        fetchPolicies()
    }, [])

    return (
        <div className="policies">
            <h2>Policy Management</h2>

            {message && <p>{message}</p>}

            {policies.map((policy) => (
                <div className="policy-card" key={policy.id}>
                    <h3>{policy.title}</h3>

                    <p>
                        <strong>Department:</strong>{" "}
                        {policy.department}
                    </p>

                    <p>
                        <strong>Status:</strong>{" "}
                        {policy.status}
                    </p>

                    <p>
                        <strong>Version:</strong>{" "}
                        {policy.version}
                    </p>

                    <p>{policy.description}</p>
                </div>
            ))}
        </div>
    )
}

export default Policies