import { useEffect, useState } from "react"

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

function Compliance() {
    const [items, setItems] = useState<ComplianceItem[]>([])
    const [message, setMessage] = useState("Loading compliance requirements...")

    useEffect(() => {
        const fetchCompliance = async () => {
            try {
                const response = await fetch("http://127.0.0.1:8000/compliance/")

                if (!response.ok) {
                    setMessage("Unable to load compliance requirements")
                    return
                }

                const data = await response.json()
                setItems(data)
                setMessage("")
            } catch {
                setMessage("Unable to connect to the backend")
            }
        }

        fetchCompliance()
    }, [])

    return (
        <div className="compliance">
            <h2>Compliance Tracking</h2>

            {message && <p>{message}</p>}

            {items.map((item) => (
                <div className="compliance-card" key={item.id}>
                    <h3>{item.title}</h3>

                    <p>
                        <strong>Regulation:</strong>{" "}
                        {item.regulation}
                    </p>

                    <p>
                        <strong>Department:</strong>{" "}
                        {item.department}
                    </p>

                    <p>
                        <strong>Status:</strong>{" "}
                        {item.status}
                    </p>

                    <p>
                        <strong>Risk Level:</strong>{" "}
                        {item.risk_level}
                    </p>

                    <p>{item.description}</p>
                </div>
            ))}
        </div>
    )
}

export default Compliance