import { useEffect, useState } from "react"

type ResearchQuery = {
    id: number
    question: string
    status: string
    created_at: string | null
}

function Research() {
    const [queries, setQueries] = useState<ResearchQuery[]>([])
    const [message, setMessage] = useState("Loading research queries...")

    useEffect(() => {
        const fetchResearchQueries = async () => {
            try {
                const response = await fetch("http://127.0.0.1:8000/research/")

                if (!response.ok) {
                    setMessage("Unable to load research queries")
                    return
                }

                const data = await response.json()
                setQueries(data)
                setMessage("")
            } catch {
                setMessage("Unable to connect to the backend")
            }
        }

        fetchResearchQueries()
    }, [])

    return (
        <div className="research">
            <h2>Research Workspace</h2>

            {message && <p>{message}</p>}

            {queries.map((query) => (
                <div className="research-card" key={query.id}>
                    <h3>{query.question}</h3>
                    <p>
                        <strong>Status:</strong> {query.status}
                    </p>
                    <p>
                        <strong>Created:</strong>{" "}
                        {query.created_at
                            ? new Date(query.created_at).toLocaleString()
                            : "N/A"}
                    </p>
                </div>
            ))}
        </div>
    )
}

export default Research