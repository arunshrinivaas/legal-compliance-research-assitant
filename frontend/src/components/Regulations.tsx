import { useEffect, useState } from "react"

type Regulation = {
    id: number
    title: string
    issuing_authority: string
    jurisdiction: string
    description: string | null
    status: string
    effective_date: string | null
    created_at: string | null
}

function Regulations() {
    const [regulations, setRegulations] = useState<Regulation[]>([])
    const [message, setMessage] = useState("Loading regulations...")

    useEffect(() => {
        const fetchRegulations = async () => {
            try {
                const response = await fetch("http://127.0.0.1:8000/regulations/")

                if (!response.ok) {
                    setMessage("Unable to load regulations")
                    return
                }

                const data = await response.json()
                setRegulations(data)
                setMessage("")
            } catch {
                setMessage("Unable to connect to the backend")
            }
        }

        fetchRegulations()
    }, [])

    return (
        <div className="regulations">
            <h2>Regulation Repository</h2>

            {message && <p>{message}</p>}

            {regulations.map((regulation) => (
                <div className="regulation-card" key={regulation.id}>
                    <h3>{regulation.title}</h3>
                    <p>
                        <strong>Issuing Authority:</strong>{" "}
                        {regulation.issuing_authority}
                    </p>
                    <p>
                        <strong>Jurisdiction:</strong>{" "}
                        {regulation.jurisdiction}
                    </p>
                    <p>
                        <strong>Status:</strong> {regulation.status}
                    </p>
                    <p>{regulation.description}</p>
                </div>
            ))}
        </div>
    )
}

export default Regulations