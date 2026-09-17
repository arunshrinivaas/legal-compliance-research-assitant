import { useEffect, useState } from "react"
import {
    ArrowUp,
    FileText,
    FolderLock,
    MoreHorizontal,
    Paperclip,
    Search,
    Share2,
    Sparkles,
} from "lucide-react"

type ResearchQuery = {
    id: number
    question: string
    status: string
    created_at: string | null
}

type RagSource = {
    document_id: number
    document_title: string
    filename: string
    chunk: number
    distance: number
}

type Document = {
    id: number
    title: string
    filename: string
    document_type: string
    jurisdiction: string
    description: string | null
    user_id: number
    uploaded_at: string | null
    chunks: number
    embedded_chunks: number
    processing_status: string
}

function Research() {
    const [queries, setQueries] = useState<ResearchQuery[]>([])
    const [documents, setDocuments] = useState<Document[]>([])
    const [question, setQuestion] = useState("")
    const [answer, setAnswer] = useState("")
    const [sources, setSources] = useState<RagSource[]>([])
    const [ragLoading, setRagLoading] = useState(false)
    const [message, setMessage] = useState("")

    useEffect(() => {
        const token = localStorage.getItem("access_token")

        if (!token) {
            setMessage("Authentication required")
            return
        }

        const loadWorkspace = async () => {
            try {
                const [researchResponse, documentsResponse] = await Promise.all([
                    fetch("http://127.0.0.1:8000/api/v1/research/sessions", {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }),
                    fetch("http://127.0.0.1:8000/api/v1/documents/", {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }),
                ])

                const researchData = await researchResponse.json()
                const documentsData = await documentsResponse.json()

                if (researchResponse.ok) {
                    setQueries(researchData.items || [])
                }

                if (documentsResponse.ok) {
                    setDocuments(documentsData.items || [])
                }
            } catch {
                setMessage("Unable to connect to the backend")
            }
        }

        loadWorkspace()
    }, [])

    const askRag = async () => {
        if (!question.trim()) {
            return
        }

        const token = localStorage.getItem("access_token")

        if (!token) {
            setAnswer("Authentication required")
            return
        }

        setRagLoading(true)
        setAnswer("")
        setSources([])
        setMessage("")

        const currentQuestion = question.trim()

        try {
            const response = await fetch(
                "http://127.0.0.1:8000/api/v1/rag/ask",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        question: currentQuestion,
                        limit: 3,
                    }),
                }
            )

            const data = await response.json()

            if (!response.ok) {
                setAnswer(
                    data.detail || data.error || "Unable to get an answer"
                )
                return
            }

            setAnswer(data.answer || "")
            setSources(data.sources || [])

            const saveResponse = await fetch(
                "http://127.0.0.1:8000/api/v1/research/sessions",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        question: currentQuestion,
                        status: "Completed",
                    }),
                }
            )

            const savedQuery = await saveResponse.json()

            if (!saveResponse.ok) {
                setMessage(
                    savedQuery.detail ||
                        "The answer was generated but could not be saved."
                )
                return
            }

            setQueries((current) => [savedQuery, ...current])
            setQuestion("")
        } catch {
            setAnswer("Unable to connect to the backend")
        } finally {
            setRagLoading(false)
        }
    }

    return (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            {/* PRIVATE RESEARCH AREA */}
            <section className="min-w-0">
                <div className="mb-4 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <FolderLock size={15} className="text-neutral-500" />

                            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                                Private Workspace
                            </span>
                        </div>

                        <h1 className="mt-2 text-xl font-semibold tracking-tight">
                            Research Desk
                        </h1>

                        <p className="mt-1 text-[11px] text-neutral-500">
                            Explore regulations, documents and compliance questions privately
                            before sharing your work.
                        </p>
                    </div>

                    <button className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[10px] text-neutral-600 hover:bg-neutral-50">
                        <Share2 size={13} />
                        Share to Investigation
                    </button>
                </div>

                {/* AI RESEARCH COMPOSER */}
                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                    <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white">
                            <Sparkles size={14} />
                        </div>

                        <div className="min-w-0 flex-1">
                            <textarea
                                value={question}
                                onChange={(event) => setQuestion(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" && !event.shiftKey) {
                                        event.preventDefault()
                                        askRag()
                                    }
                                }}
                                placeholder="Ask a legal or compliance question, analyze your documents, or explore a regulation..."
                                rows={4}
                                className="w-full resize-none bg-transparent text-[12px] leading-5 outline-none placeholder:text-neutral-400"
                            />

                            <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
                                <div className="flex items-center gap-2">
                                    <button className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1.5 text-[10px] text-neutral-500 hover:bg-neutral-50">
                                        <Paperclip size={12} />
                                        Attach
                                    </button>

                                    <button className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1.5 text-[10px] text-neutral-500 hover:bg-neutral-50">
                                        <Search size={12} />
                                        Search
                                    </button>

                                    <button className="rounded-md border border-neutral-200 px-2.5 py-1.5 text-[10px] text-neutral-500 hover:bg-neutral-50">
                                        Deep Research
                                    </button>
                                </div>

                                <button
                                    onClick={askRag}
                                    disabled={ragLoading || !question.trim()}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-white disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                    {ragLoading ? (
                                        <Sparkles size={13} />
                                    ) : (
                                        <ArrowUp size={14} />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI ANSWER */}
                {answer && (
                    <article className="mt-3 rounded-xl border border-neutral-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles size={14} />

                                <span className="text-[11px] font-semibold">
                                    Research Assistant
                                </span>

                                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[9px] text-neutral-500">
                                    Private
                                </span>
                            </div>

                            <MoreHorizontal size={14} className="text-neutral-400" />
                        </div>

                        <div className="mt-4 space-y-2 text-[12px] leading-6 text-neutral-700">
                            {answer.split("\n").map((line, index) => (
                                <p key={index}>{line || "\u00A0"}</p>
                            ))}
                        </div>

                        {sources.length > 0 && (
                            <div className="mt-5 border-t border-neutral-100 pt-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                                        Evidence
                                    </h2>

                                    <span className="text-[10px] text-neutral-400">
                                        {sources.length} sources
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {sources.map((source, index) => (
                                        <div
                                            key={`${source.document_id}-${source.chunk}-${index}`}
                                            className="flex items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-50 p-3"
                                        >
                                            <FileText
                                                size={14}
                                                className="shrink-0 text-neutral-500"
                                            />

                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-[10px] font-medium">
                                                    {source.document_title}
                                                </p>

                                                <p className="mt-0.5 text-[9px] text-neutral-400">
                                                    {source.filename} · Chunk {source.chunk}
                                                </p>
                                            </div>

                                            <span className="text-[9px] text-neutral-400">
                                                {source.distance.toFixed(3)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-4 flex justify-end border-t border-neutral-100 pt-3">
                            <button className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1.5 text-[10px] text-neutral-500 hover:bg-neutral-50">
                                <Share2 size={12} />
                                Share to Investigation
                            </button>
                        </div>
                    </article>
                )}

                {/* PRIVATE RESEARCH HISTORY */}
                <div className="mt-5">
                    <div className="mb-3 flex items-center justify-between">
                        <div>
                            <h2 className="text-[12px] font-semibold">
                                Private Research
                            </h2>

                            <p className="mt-1 text-[10px] text-neutral-400">
                                Your previous research sessions
                            </p>
                        </div>

                        <span className="text-[10px] text-neutral-400">
                            {queries.length} sessions
                        </span>
                    </div>

                    <div className="space-y-2">
                        {queries.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-6 text-center">
                                <p className="text-[11px] text-neutral-400">
                                    No private research sessions yet.
                                </p>
                            </div>
                        ) : (
                            queries.map((query) => (
                                <div
                                    key={query.id}
                                    className="rounded-xl border border-neutral-200 bg-white p-4"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-[11px] font-medium">
                                                {query.question}
                                            </p>

                                            <p className="mt-2 text-[9px] text-neutral-400">
                                                {query.created_at
                                                    ? new Date(query.created_at).toLocaleString()
                                                    : "No timestamp"}
                                            </p>
                                        </div>

                                        <span className="rounded-full bg-neutral-100 px-2 py-1 text-[9px] text-neutral-500">
                                            {query.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* PRIVATE CONTEXT PANEL */}
            <aside className="min-w-0">
                <div className="sticky top-4">
                    <div className="mb-3">
                        <h2 className="text-[12px] font-semibold">
                            Private Context
                        </h2>

                        <p className="mt-1 text-[10px] text-neutral-400">
                            Documents available to your research
                        </p>
                    </div>

                    <div className="rounded-xl border border-neutral-200 bg-white">
                        <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-3">
                            <span className="text-[10px] font-medium">
                                Documents
                            </span>

                            <span className="text-[9px] text-neutral-400">
                                {documents.length}
                            </span>
                        </div>

                        <div className="divide-y divide-neutral-100">
                            {documents.map((document) => (
                                <div key={document.id} className="p-3">
                                    <div className="flex gap-2.5">
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
                                            <FileText size={13} className="text-neutral-500" />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="truncate text-[10px] font-medium">
                                                {document.title}
                                            </p>

                                            <p className="mt-1 text-[9px] text-neutral-400">
                                                {document.document_type} · {document.jurisdiction}
                                            </p>

                                            <div className="mt-2 flex items-center gap-2">
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[8px] ${document.processing_status === "Ready"
                                                            ? "bg-neutral-100 text-neutral-600"
                                                            : "bg-neutral-50 text-neutral-400"
                                                        }`}
                                                >
                                                    {document.processing_status}
                                                </span>

                                                {document.chunks > 0 && (
                                                    <span className="text-[8px] text-neutral-400">
                                                        {document.embedded_chunks}/{document.chunks} chunks
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {documents.length === 0 && (
                                <div className="p-5 text-center">
                                    <p className="text-[10px] text-neutral-400">
                                        No documents available.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-3">
                        <p className="text-[10px] font-medium">
                            Workspace visibility
                        </p>

                        <p className="mt-1.5 text-[9px] leading-4 text-neutral-400">
                            Your research remains private until you explicitly share it
                            with an investigation.
                        </p>
                    </div>

                    {message && (
                        <p className="mt-3 text-[10px] text-neutral-500">
                            {message}
                        </p>
                    )}
                </div>
            </aside>
        </div>
    )
}

export default Research
