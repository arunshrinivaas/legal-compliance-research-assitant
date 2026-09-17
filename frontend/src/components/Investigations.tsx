import { useEffect, useState } from "react"
import {
    Activity,
    ArrowUp,
    CheckCircle2,
    ChevronRight,
    FileText,
    Eye,
    Trash2,
    X,
    MessageCircle,
    MoreHorizontal,
    Paperclip,
    Upload,
    HardDrive,
    Cloud,
    Search,
    ShieldAlert,
    Sparkles,
    Users,
} from "lucide-react"

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
    file_hash?: string
}

type RagSource = {
    document_id: number
    document_title: string
    filename: string
    chunk: number
    distance: number
}

type ComparisonSource = {
    document_id: number
    document_title: string
    filename: string
    chunk: number
    distance: number
}

type ComparisonResult = {
    investigation_id: number
    question: string
    // Ordered list of all compared documents with their deterministic labels (A, B, C…)
    documents: Array<{ label: string; id: number; title: string; filename: string; jurisdiction: string }>
    comparison: string
    // Keyed by "document_a", "document_b", "document_c", … matching the label
    sources: Record<string, ComparisonSource[]>
}

type Investigation = {
    id: number
    title: string
    description: string | null
    status: string
    user_id: number
}

type InvestigationQuery = {
    id: number
    investigation_id: number
    question: string
    answer: string | null
    created_at: string
}


function Investigations() {
    const [investigations, setInvestigations] = useState<Investigation[]>([])
    const [selectedInvestigation, setSelectedInvestigation] =
        useState<Investigation | null>(null)

    const [loadingInvestigations, setLoadingInvestigations] = useState(true)
    const [investigationMessage, setInvestigationMessage] = useState("")

    const [investigationDocuments, setInvestigationDocuments] = useState<Document[]>([])
    const [loadingInvestigationDocuments, setLoadingInvestigationDocuments] = useState(false)
    const [availableDocuments, setAvailableDocuments] = useState<Document[]>([])
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
    const [attachingDocumentId, setAttachingDocumentId] = useState<number | null>(null)
    const [uploadingDocument, setUploadingDocument] = useState(false)
    const [message, setMessage] = useState("")

    const [newTitle, setNewTitle] = useState("")
    const [newDescription, setNewDescription] = useState("")
    const [creatingInvestigation, setCreatingInvestigation] = useState(false)

    const [question, setQuestion] = useState("")
    const [answer, setAnswer] = useState("")
    const [sources, setSources] = useState<RagSource[]>([])
    const [ragLoading, setRagLoading] = useState(false)
    const [researchHistory, setResearchHistory] = useState<InvestigationQuery[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null)
    const [detachingDocumentId, setDetachingDocumentId] = useState<number | null>(null)
    const [previewDocument, setPreviewDocument] = useState<Document | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [previewLoading, setPreviewLoading] = useState(false)

    const [duplicateMessage, setDuplicateMessage] = useState(false)
    const [duplicateToastClosing, setDuplicateToastClosing] = useState(false)

    // ---------------------------------------------------------
    // Regulatory Comparison state
    // ---------------------------------------------------------
    const [compareQuestion, setCompareQuestion] = useState("")
    const [compareLoading, setCompareLoading] = useState(false)
    const [compareResult, setCompareResult] = useState<ComparisonResult | null>(null)
    const [compareError, setCompareError] = useState("")

    const refreshAvailableDocuments = async () => {
        const token = localStorage.getItem("access_token")
        if (!token) return

        try {
            const response = await fetch(
                "http://127.0.0.1:8000/api/v1/documents/",
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            )

            if (!response.ok) return

            const data = await response.json()
            setAvailableDocuments(data.items || [])
        } catch {
            // Keep current UI state if refresh fails.
        }
    }

    const refreshInvestigationDocuments = async (investigationId?: number) => {
        const id = investigationId ?? selectedInvestigation?.id
        const token = localStorage.getItem("access_token")

        if (!id || !token) {
            setInvestigationDocuments([])
            return
        }

        try {
            const response = await fetch(
                `http://127.0.0.1:8000/api/v1/investigations/${id}/documents`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            )

            if (!response.ok) return

            const data = await response.json()
            setInvestigationDocuments(data)
        } catch {
            // Keep current UI state if refresh fails.
        }
    }

    useEffect(() => {
        const token = localStorage.getItem("access_token")

        if (!token) {
            setInvestigationMessage("Authentication required")
            setLoadingInvestigations(false)
            return
        }

        const loadInvestigations = async () => {
            try {
                const response = await fetch(
                    "http://127.0.0.1:8000/api/v1/investigations/",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                )

                const data = await response.json()

                if (!response.ok) {
                    setInvestigationMessage(
                        data.detail || "Unable to load investigations"
                    )
                    return
                }

                setInvestigations(data)

                if (data.length > 0) {
                    setSelectedInvestigation(data[0])
                }
            } catch {
                setInvestigationMessage("Unable to connect to the backend")
            } finally {
                setLoadingInvestigations(false)
            }
        }

        const loadAvailableDocuments = async () => {
            try {
                const response = await fetch(
                    "http://127.0.0.1:8000/api/v1/documents/",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                )

                const data = await response.json()

                if (response.ok) {
                    setAvailableDocuments(data.items || [])
                }
            } catch {
                // Keep the investigation usable if document loading fails.
            }
        }

        loadInvestigations()
        loadAvailableDocuments()
    }, [])

    useEffect(() => {
        const loadInvestigationDocuments = async () => {
            if (!selectedInvestigation) {
                setInvestigationDocuments([])
                return
            }

            const token = localStorage.getItem("access_token")

            if (!token) {
                setInvestigationDocuments([])
                return
            }

            setLoadingInvestigationDocuments(true)

            try {
                const response = await fetch(
                    `http://127.0.0.1:8000/api/v1/investigations/${selectedInvestigation.id}/documents`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                )

                const data = await response.json()

                if (!response.ok) {
                    setInvestigationDocuments([])
                    return
                }

                setInvestigationDocuments(data)
            } catch {
                setInvestigationDocuments([])
            } finally {
                setLoadingInvestigationDocuments(false)
            }
        }

        loadInvestigationDocuments()
    }, [selectedInvestigation])

    useEffect(() => {
        const loadResearchHistory = async () => {
            if (!selectedInvestigation) {
                setResearchHistory([])
                setLoadingHistory(false)
                return
            }

            const token = localStorage.getItem("access_token")

            if (!token) {
                setResearchHistory([])
                setLoadingHistory(false)
                return
            }

            setLoadingHistory(true)

            try {
                const response = await fetch(
                    `http://127.0.0.1:8000/api/v1/investigations/${selectedInvestigation.id}/queries`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                )

                const data = await response.json()

                if (!response.ok) {
                    setResearchHistory([])
                    return
                }

                setResearchHistory(data)
            } catch {
                setResearchHistory([])
            } finally {
                setLoadingHistory(false)
            }
        }

        loadResearchHistory()
    }, [selectedInvestigation])

    const createInvestigation = async () => {
        if (!newTitle.trim()) return

        const token = localStorage.getItem("access_token")

        if (!token) {
            setInvestigationMessage("Authentication required")
            return
        }

        setCreatingInvestigation(true)
        setInvestigationMessage("")

        try {
            const response = await fetch(
                "http://127.0.0.1:8000/api/v1/investigations/",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        title: newTitle.trim(),
                        description: newDescription.trim() || null,
                    }),
                }
            )

            const data = await response.json()

            if (!response.ok) {
                setInvestigationMessage(
                    data.detail || "Unable to create investigation"
                )
                return
            }

            setInvestigations((current) => [data, ...current])
            setSelectedInvestigation(data)
            setNewTitle("")
            setNewDescription("")
            setShowAttachmentMenu(true)
        } catch {
            setInvestigationMessage("Unable to connect to the backend")
        } finally {
            setCreatingInvestigation(false)
        }
    }

    const uploadAndAttachDocument = async (file: File) => {
        if (!selectedInvestigation) {
            setMessage("Select or create an investigation before adding a new document.")
            return
        }

        const token = localStorage.getItem("access_token")

        if (!token) {
            setMessage("Authentication required")
            return
        }

        setUploadingDocument(true)
        setMessage("")

        try {
            const formData = new FormData()
            formData.append("file", file)

            const uploadResponse = await fetch(
                "http://127.0.0.1:8000/api/v1/documents/upload",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            )

            const uploadData = await uploadResponse.json()

            if (!uploadResponse.ok) {
                setMessage(
                    uploadData.detail ||
                    uploadData.error ||
                    "Unable to upload document."
                )
                return
            }

            const documentId = Number(uploadData.document_id ?? uploadData.document?.id ?? uploadData.item?.id ?? uploadData.id)

            if (!documentId) {
                setMessage("Document uploaded, but the backend did not return a document ID.")
                return
            }

            // The backend prevents duplicate files in the library.
            // A duplicate upload is automatically skipped.
            await refreshAvailableDocuments()

            if (uploadData.duplicate === true) {
                setDuplicateToastClosing(false)
                setDuplicateMessage(true)

                window.setTimeout(() => {
                    setDuplicateToastClosing(true)
                }, 1200)

                window.setTimeout(() => {
                    setDuplicateMessage(false)
                    setDuplicateToastClosing(false)
                }, 1500)

                return
            }

            const attachResponse = await fetch(
                `http://127.0.0.1:8000/api/v1/investigations/${selectedInvestigation.id}/documents/${documentId}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            const attachData = await attachResponse.json()

            if (!attachResponse.ok) {
                setMessage(
                    attachData.detail ||
                    "Document uploaded, but could not be attached to this investigation."
                )
                return
            }

            await refreshAvailableDocuments()
            await refreshInvestigationDocuments(selectedInvestigation.id)

            setShowAttachmentMenu(true)
            setMessage(
                uploadData.duplicate
                    ? `${file.name} was already in the document library and is now attached.`
                    : `${file.name} added to this investigation.`
            )
        } catch {
            setMessage("Unable to connect to the backend.")
        } finally {
            setUploadingDocument(false)
        }
    }

    const openDeviceFilePicker = () => {
        document.getElementById("investigation-document-file-input")?.click()
    }

    const attachDocument = async (documentId: number) => {
        if (!selectedInvestigation) {
            setMessage("Select an investigation before attaching a document.")
            return
        }

        const token = localStorage.getItem("access_token")

        if (!token) {
            setMessage("Authentication required")
            return
        }

        // Prevent a second click while the request is in flight.
        if (attachingDocumentId === documentId) return

        setAttachingDocumentId(documentId)
        setMessage("")

        try {
            const response = await fetch(
                `http://127.0.0.1:8000/api/v1/investigations/${selectedInvestigation.id}/documents/${documentId}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            const raw = await response.text()
            let data: any = {}

            if (raw) {
                try {
                    data = JSON.parse(raw)
                } catch {
                    data = {}
                }
            }

            if (!response.ok) {
                if (response.status === 409) {
                    await refreshInvestigationDocuments(selectedInvestigation.id)
                    setMessage("This document is already attached to this investigation.")
                } else {
                    setMessage(
                        data.detail ||
                        `Unable to attach document (HTTP ${response.status}).`
                    )
                }
                return
            }

            // Update the investigation immediately from the API response so the
            // document appears without requiring a page refresh.
            if (data && data.id) {
                setInvestigationDocuments((current) => {
                    if (current.some((document) => document.id === data.id)) {
                        return current
                    }
                    return [data, ...current]
                })
            }

            await Promise.all([
                refreshInvestigationDocuments(selectedInvestigation.id),
                refreshAvailableDocuments(),
            ])

            setMessage("Document added to this investigation.")
            setShowAttachmentMenu(true)
        } catch (error) {
            console.error("attachDocument failed", error)
            setMessage("Unable to connect to the backend while attaching the document.")
        } finally {
            setAttachingDocumentId(null)
        }
    }

    const detachDocument = async (documentId: number) => {
        if (!selectedInvestigation) return

        const token = localStorage.getItem("access_token")
        if (!token) {
            setMessage("Authentication required")
            return
        }

        if (!window.confirm("Remove this document from the investigation? The document will remain in the library.")) {
            return
        }

        setDetachingDocumentId(documentId)
        setMessage("")

        try {
            const response = await fetch(
                `http://127.0.0.1:8000/api/v1/investigations/${selectedInvestigation.id}/documents/${documentId}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                }
            )

            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                setMessage(data.detail || "Unable to remove document from the investigation.")
                return
            }

            await refreshInvestigationDocuments(selectedInvestigation.id)
            await refreshAvailableDocuments()
            setMessage("Document removed from the investigation. It remains in the library.")
        } catch {
            setMessage("Unable to connect to the backend.")
        } finally {
            setDetachingDocumentId(null)
        }
    }

    const deleteLibraryDocument = async (documentId: number) => {
        const token = localStorage.getItem("access_token")
        if (!token) {
            setMessage("Authentication required")
            return
        }

        if (!window.confirm("Permanently delete this document from the library? It will also be removed from investigations that use it.")) {
            return
        }

        setDeletingDocumentId(documentId)
        setMessage("")

        try {
            const response = await fetch(
                `http://127.0.0.1:8000/api/v1/documents/${documentId}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                }
            )

            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                setMessage(data.detail || "Unable to delete document from the library.")
                return
            }

            setAvailableDocuments((current) =>
                current.filter((document) => document.id !== documentId)
            )
            setInvestigationDocuments((current) =>
                current.filter((document) => document.id !== documentId)
            )
            await refreshAvailableDocuments()
            await refreshInvestigationDocuments(selectedInvestigation?.id)
            setMessage("Document permanently removed from the library.")
        } catch {
            setMessage("Unable to connect to the backend.")
        } finally {
            setDeletingDocumentId(null)
        }
    }

    const previewDocumentFile = async (document: Document) => {
        console.log("PREVIEW CLICKED", document.id, document.filename)

        const token = localStorage.getItem("access_token")
        if (!token) {
            setMessage("Authentication required")
            return
        }

        console.log("SETTING PREVIEW DOCUMENT")

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl)
            setPreviewUrl(null)
        }

        setPreviewDocument(document)
        setPreviewLoading(true)

        try {
            console.log("FETCHING PREVIEW")

            const response = await fetch(
                `http://127.0.0.1:8000/api/v1/documents/${document.id}/preview`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            )

            console.log("PREVIEW RESPONSE", response.status)

            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                console.log("PREVIEW ERROR", data)

                setMessage(data.detail || "Unable to preview this document.")
                setPreviewDocument(null)
                return
            }

            const blob = await response.blob()

            console.log("PREVIEW BLOB", blob.type, blob.size)

            const url = URL.createObjectURL(blob)

            console.log("SETTING PREVIEW URL", url)

            setPreviewUrl(url)
        } catch (error) {
            console.error("PREVIEW FETCH FAILED", error)

            setMessage("Unable to connect to the backend.")
            setPreviewDocument(null)
        } finally {
            console.log("PREVIEW FINISHED")
            setPreviewLoading(false)
        }
    }

    const closePreview = () => {
        console.log("!!! CLOSE PREVIEW CALLED !!!")

        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
        setPreviewDocument(null)
        setPreviewLoading(false)
    }

    const libraryDocuments = Array.from(
        new Map(
            availableDocuments.map((document) => [
                document.file_hash || `id:${document.id}`,
                document,
            ])
        ).values()
    )

    const runComparison = async () => {
        if (!selectedInvestigation) {
            setCompareError("Please select an investigation first.")
            return
        }

        if (!compareQuestion.trim()) {
            setCompareError("Please enter a comparison question or topic.")
            return
        }

        const token = localStorage.getItem("access_token")
        if (!token) {
            setCompareError("Authentication required")
            return
        }

        setCompareLoading(true)
        setCompareResult(null)
        setCompareError("")

        try {
            const response = await fetch(
                `http://127.0.0.1:8000/api/v1/investigations/${selectedInvestigation.id}/compare`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        question: compareQuestion.trim(),
                        limit: 5,
                    }),
                }
            )

            const data = await response.json()

            if (!response.ok) {
                setCompareError(
                    data.detail ||
                    data.error ||
                    `Comparison failed (HTTP ${response.status})`
                )
                return
            }

            console.log("[DIAG:COMPARE_FRONTEND_INPUT]")
            console.log("  data.documents:", data.documents)
            console.log("  sources keys:", data.sources ? Object.keys(data.sources) : [])
            console.log("  comparison length:", data.comparison?.length)
            if (data.documents) {
                data.documents.forEach((d: any) => {
                    console.log(`  appears filename ${d.filename}:`, data.comparison?.includes(d.filename))
                })
            }
            
            // Extract the labels actually present in the comparison text
            const textLabels = data.comparison 
                ? [...new Set([...data.comparison.matchAll(/Document ([A-Z])/g)].map(m => m[1]))] 
                : [];
            console.log("[DIAG:FRONTEND_RESPONSE] exact labels detected from the text:", textLabels);
            
            const sections = data.comparison ? data.comparison.split("─────────────────────────────────────────────────────") : [];
            const docSection = sections[1] || "";
            const numSections = docSection ? [...docSection.matchAll(/Document [A-Z] —/g)].length : 0;
            console.log("[DIAG:FRONTEND_RESPONSE] number of comparison sections parsed/rendered:", numSections);

            setCompareResult(data)
        } catch {
            setCompareError("Unable to connect to the backend.")
        } finally {
            setCompareLoading(false)
        }
    }

    const askInvestigation = async () => {
        if (!question.trim()) return

        if (!selectedInvestigation) {
            setAnswer("Please select or create an investigation first.")
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
            const ragResponse = await fetch(
                "http://127.0.0.1:8000/api/v1/rag/ask",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        question: currentQuestion,
                        limit: 5,
                        investigation_id: selectedInvestigation.id,
                    }),
                }
            )

            const ragData = await ragResponse.json()

            if (!ragResponse.ok) {
                setAnswer(
                    ragData.detail ||
                    ragData.error ||
                    "Unable to get an investigation answer"
                )
                return
            }

            const generatedAnswer = ragData.answer || ""

            setAnswer(generatedAnswer)
            setSources(ragData.sources || [])

            const saveResponse = await fetch(
                `http://127.0.0.1:8000/api/v1/investigations/${selectedInvestigation.id}/queries`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        question: currentQuestion,
                        answer: generatedAnswer,
                    }),
                }
            )

            const saveData = await saveResponse.json()

            if (!saveResponse.ok) {
                setMessage(
                    saveData.detail ||
                    "The answer was generated but could not be saved to the investigation."
                )
                return
            }

            setQuestion("")

            setResearchHistory((current) => [
                {
                    ...saveData,
                    created_at: saveData.created_at,
                },
                ...current,
            ])
        } catch {
            setAnswer("Unable to connect to the backend")
        } finally {
            setRagLoading(false)
        }
    }

    const investigation = selectedInvestigation

    return (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="min-w-0">
                <div className="rounded-xl border border-neutral-200 bg-white">
                    <div className="border-b border-neutral-100 p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="rounded-full bg-neutral-100 px-2 py-1 text-[8px] font-medium uppercase tracking-[0.08em] text-neutral-500">
                                        Investigation
                                    </span>

                                    <span className="flex items-center gap-1 text-[8px] text-neutral-400">
                                        <span className="h-1.5 w-1.5 rounded-full bg-neutral-700" />
                                        {investigation?.status || "No investigation"}
                                    </span>
                                </div>

                                <h1 className="mt-3 text-lg font-semibold tracking-tight">
                                    {investigation?.title ||
                                        "No investigation selected"}
                                </h1>

                                <p className="mt-1.5 max-w-2xl text-[10px] leading-5 text-neutral-500">
                                    {investigation?.description ||
                                        "Create an investigation to begin a persistent research workspace."}
                                </p>
                            </div>

                            <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 hover:bg-neutral-50">
                                <MoreHorizontal size={14} />
                            </button>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-1.5">
                                    <Avatar initials="PM" />
                                    <Avatar initials="AS" />
                                    <Avatar initials="RK" />
                                </div>

                                <span className="text-[9px] text-neutral-400">
                                    3 people viewing
                                </span>

                                <span className="mx-1 text-neutral-200">•</span>

                                <span className="flex items-center gap-1.5 text-[9px] text-neutral-400">
                                    <Activity size={11} />
                                    Live workspace
                                </span>
                            </div>

                            <span className="text-[9px] text-neutral-400">
                                {investigation
                                    ? `Investigation #${String(
                                        investigation.id
                                    ).padStart(3, "0")}`
                                    : "No investigation"}
                            </span>
                        </div>
                    </div>
                </div>

                <section className="mt-4 rounded-xl border border-neutral-200 bg-white">
                    <SectionHeader
                        icon={<Search size={14} />}
                        title="Investigations"
                        detail="Persistent investigation workspaces"
                    />

                    <div className="p-4">
                        {loadingInvestigations ? (
                            <p className="text-[10px] text-neutral-400">
                                Loading investigations...
                            </p>
                        ) : investigations.length === 0 ? (
                            <div className="space-y-3">
                                <p className="text-[10px] text-neutral-400">
                                    No investigations exist yet.
                                </p>

                                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                                    <input
                                        value={newTitle}
                                        onChange={(event) =>
                                            setNewTitle(event.target.value)
                                        }
                                        placeholder="Investigation title"
                                        className="w-full bg-transparent text-[10px] outline-none placeholder:text-neutral-400"
                                    />

                                    <textarea
                                        value={newDescription}
                                        onChange={(event) =>
                                            setNewDescription(event.target.value)
                                        }
                                        placeholder="Description (optional)"
                                        rows={2}
                                        className="mt-2 w-full resize-none border-t border-neutral-200 bg-transparent pt-2 text-[10px] leading-4 outline-none placeholder:text-neutral-400"
                                    />

                                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-neutral-200 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowAttachmentMenu((current) => !current)}
                                            title="Manage investigation documents"
                                            className={`flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 transition hover:bg-neutral-100 ${showAttachmentMenu ? "bg-neutral-100 text-neutral-800" : ""}`}
                                        >
                                            <Paperclip size={13} />
                                        </button>
                                        <button
                                            onClick={createInvestigation}
                                            disabled={creatingInvestigation || !newTitle.trim()}
                                            className="rounded-md bg-neutral-900 px-3 py-1.5 text-[9px] text-white disabled:cursor-not-allowed disabled:opacity-30"
                                        >
                                            {creatingInvestigation ? "Creating..." : "Create investigation"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {investigations.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            setSelectedInvestigation(item)
                                            setQuestion("")
                                            setAnswer("")
                                            setSources([])
                                            setMessage("")
                                        }}
                                        className={`w-full rounded-lg border p-3 text-left transition ${selectedInvestigation?.id ===
                                            item.id
                                            ? "border-neutral-400 bg-neutral-50"
                                            : "border-neutral-200 hover:bg-neutral-50"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-[10px] font-medium">
                                                    {item.title}
                                                </p>

                                                <p className="mt-1 truncate text-[8px] text-neutral-400">
                                                    {item.description ||
                                                        "No description"}
                                                </p>
                                            </div>

                                            <span className="shrink-0 text-[8px] text-neutral-400">
                                                {item.status}
                                            </span>
                                        </div>
                                    </button>
                                ))}

                                <div className="mt-3 border-t border-neutral-100 pt-3">
                                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                                        <p className="text-[9px] font-medium">
                                            Create another investigation
                                        </p>

                                        <input
                                            value={newTitle}
                                            onChange={(event) =>
                                                setNewTitle(event.target.value)
                                            }
                                            placeholder="Investigation title"
                                            className="mt-2 w-full bg-transparent text-[10px] outline-none placeholder:text-neutral-400"
                                        />

                                        <textarea
                                            value={newDescription}
                                            onChange={(event) =>
                                                setNewDescription(
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Description (optional)"
                                            rows={2}
                                            className="mt-2 w-full resize-none border-t border-neutral-200 bg-transparent pt-2 text-[10px] leading-4 outline-none placeholder:text-neutral-400"
                                        />

                                        {showAttachmentMenu && (
                                            <div className="mt-3 rounded-lg border border-neutral-200 bg-white p-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-[9px] font-semibold text-neutral-700">
                                                            Investigation evidence
                                                        </p>
                                                        <p className="mt-0.5 text-[8px] leading-4 text-neutral-400">
                                                            {selectedInvestigation
                                                                ? `Documents attached to ${selectedInvestigation.title}`
                                                                : "Create the investigation first, then attach evidence."}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAttachmentMenu(false)}
                                                        className="shrink-0 text-[8px] text-neutral-400 hover:text-neutral-700"
                                                    >
                                                        Close
                                                    </button>
                                                </div>

                                                {selectedInvestigation ? (
                                                    <>
                                                        <div className="mt-3">
                                                            <p className="mb-1.5 text-[8px] font-medium uppercase tracking-wide text-neutral-400">
                                                                Attached documents
                                                            </p>
                                                            {loadingInvestigationDocuments ? (
                                                                <p className="rounded-md bg-neutral-50 p-2 text-[8px] text-neutral-400">
                                                                    Loading attached documents...
                                                                </p>
                                                            ) : investigationDocuments.length === 0 ? (
                                                                <p className="rounded-md bg-neutral-50 p-2 text-[8px] text-neutral-400">
                                                                    No documents attached yet.
                                                                </p>
                                                            ) : (
                                                                <div className="space-y-1.5">
                                                                    {investigationDocuments.map((document) => (
                                                                        <div key={document.id} className="flex items-center gap-2 rounded-md border border-neutral-100 bg-neutral-50 p-2">
                                                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white">
                                                                                <FileText size={12} className="text-neutral-500" />
                                                                            </div>
                                                                            <div className="min-w-0 flex-1">
                                                                                <p className="truncate text-[9px] font-medium text-neutral-700">
                                                                                    {document.title}
                                                                                </p>
                                                                                <p className="mt-0.5 truncate text-[8px] text-neutral-400">
                                                                                    {document.filename} · {document.processing_status}
                                                                                </p>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => previewDocumentFile(document)}
                                                                                title="Preview document"
                                                                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-100"
                                                                            >
                                                                                <Eye size={12} />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => detachDocument(document.id)}
                                                                                disabled={detachingDocumentId === document.id}
                                                                                title="Remove from investigation"
                                                                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-100 disabled:opacity-40"
                                                                            >
                                                                                <Trash2 size={12} />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="mt-3 border-t border-neutral-100 pt-3">
                                                            <p className="mb-1.5 text-[8px] font-medium uppercase tracking-wide text-neutral-400">
                                                                Add document
                                                            </p>

                                                            <div className="mb-2 grid grid-cols-3 gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={openDeviceFilePicker}
                                                                    disabled={uploadingDocument}
                                                                    className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white p-2 text-left transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                                >
                                                                    <Upload size={12} className="shrink-0 text-neutral-500" />
                                                                    <span className="min-w-0">
                                                                        <span className="block text-[8px] font-medium text-neutral-700">
                                                                            {uploadingDocument ? "Uploading..." : "From device"}
                                                                        </span>
                                                                        <span className="block text-[7px] text-neutral-400">
                                                                            PDF, DOCX, TXT
                                                                        </span>
                                                                    </span>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => setMessage("Google Drive integration requires a connected Drive account.")}
                                                                    className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white p-2 text-left transition hover:bg-neutral-50"
                                                                >
                                                                    <HardDrive size={12} className="shrink-0 text-neutral-500" />
                                                                    <span className="min-w-0">
                                                                        <span className="block text-[8px] font-medium text-neutral-700">
                                                                            Google Drive
                                                                        </span>
                                                                        <span className="block text-[7px] text-neutral-400">
                                                                            Connect account
                                                                        </span>
                                                                    </span>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => setMessage("Dropbox integration requires a connected Dropbox account.")}
                                                                    className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white p-2 text-left transition hover:bg-neutral-50"
                                                                >
                                                                    <Cloud size={12} className="shrink-0 text-neutral-500" />
                                                                    <span className="min-w-0">
                                                                        <span className="block text-[8px] font-medium text-neutral-700">
                                                                            Dropbox
                                                                        </span>
                                                                        <span className="block text-[7px] text-neutral-400">
                                                                            Connect account
                                                                        </span>
                                                                    </span>
                                                                </button>
                                                            </div>

                                                            <input
                                                                id="investigation-document-file-input"
                                                                type="file"
                                                                accept=".pdf,.doc,.docx,.txt,.md"
                                                                className="hidden"
                                                                onChange={(event) => {
                                                                    const file = event.target.files?.[0]
                                                                    event.target.value = ""
                                                                    if (file) {
                                                                        uploadAndAttachDocument(file)
                                                                    }
                                                                }}
                                                            />

                                                            {libraryDocuments.length > 0 && (
                                                                <>
                                                                    <p className="mb-1.5 mt-3 text-[8px] font-medium uppercase tracking-wide text-neutral-400">
                                                                        From document library
                                                                    </p>
                                                                    <div className="max-h-44 space-y-1.5 overflow-y-auto">
                                                                        {libraryDocuments.map((document) => {
                                                                            const alreadyAttached = investigationDocuments.some((attached) => attached.id === document.id)
                                                                            return (
                                                                                <div key={document.id} className="flex items-center gap-2 rounded-md border border-neutral-100 p-2">
                                                                                    <FileText size={12} className="shrink-0 text-neutral-400" />
                                                                                    <div className="min-w-0 flex-1">
                                                                                        <p className="truncate text-[9px] font-medium">{document.title}</p>
                                                                                        <p className="mt-0.5 truncate text-[8px] text-neutral-400">{document.filename}</p>
                                                                                    </div>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => previewDocumentFile(document)}
                                                                                        title="Preview document"
                                                                                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-100"
                                                                                    >
                                                                                        <Eye size={12} />
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={alreadyAttached || attachingDocumentId === document.id}
                                                                                        onClick={() => attachDocument(document.id)}
                                                                                        title={alreadyAttached ? "Already attached" : "Add to investigation"}
                                                                                        aria-label={alreadyAttached ? "Already attached" : `Add ${document.filename} to investigation`}
                                                                                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
                                                                                    >
                                                                                        {attachingDocumentId === document.id ? "…" : alreadyAttached ? "✓" : "+"}
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={deletingDocumentId === document.id}
                                                                                        onClick={() => deleteLibraryDocument(document.id)}
                                                                                        title="Delete from document library"
                                                                                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-100 disabled:opacity-40"
                                                                                    >
                                                                                        <Trash2 size={12} />
                                                                                    </button>
                                                                                </div>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <p className="mt-3 rounded-md bg-neutral-50 p-2 text-[8px] leading-4 text-neutral-400">
                                                        Enter a title and click Create. The new investigation will then be selected and this panel will stay open so you can add documents immediately.
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-neutral-200 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowAttachmentMenu((current) => !current)}
                                                title="Manage investigation documents"
                                                className={`flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 transition hover:bg-neutral-100 ${showAttachmentMenu ? "bg-neutral-100 text-neutral-800" : ""}`}
                                            >
                                                <Paperclip size={13} />
                                            </button>
                                            <button
                                                onClick={createInvestigation}
                                                disabled={creatingInvestigation || !newTitle.trim()}
                                                className="rounded-md bg-neutral-900 px-3 py-1.5 text-[9px] text-white disabled:cursor-not-allowed disabled:opacity-30"
                                            >
                                                {creatingInvestigation ? "Creating..." : "Create"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {investigationMessage && (
                            <p className="mt-3 text-[9px] text-neutral-500">
                                {investigationMessage}
                            </p>
                        )}
                    </div>
                </section>

                <section className="mt-4 rounded-xl border border-neutral-200 bg-white">
                    <SectionHeader
                        icon={<Sparkles size={14} />}
                        title="Investigation Research"
                        detail="Ask questions using the investigation knowledge base"
                    />

                    <div className="p-4">
                        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                            <div className="flex gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white">
                                    <Sparkles size={14} />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <textarea
                                        value={question}
                                        onChange={(event) =>
                                            setQuestion(event.target.value)
                                        }
                                        onKeyDown={(event) => {
                                            if (
                                                event.key === "Enter" &&
                                                !event.shiftKey
                                            ) {
                                                event.preventDefault()
                                                askInvestigation()
                                            }
                                        }}
                                        rows={3}
                                        placeholder="Ask about the regulations, policies, or evidence in this investigation..."
                                        className="w-full resize-none bg-transparent text-[11px] leading-5 outline-none placeholder:text-neutral-400"
                                    />

                                    <div className="flex items-center justify-between border-t border-neutral-200 pt-2">
                                        <span className="text-[8px] text-neutral-400">
                                            {selectedInvestigation
                                                ? `${investigationDocuments.length} document${investigationDocuments.length === 1 ? "" : "s"} in evidence`
                                                : "Select an investigation to begin"}
                                        </span>

                                        <button
                                            onClick={askInvestigation}
                                            disabled={
                                                ragLoading ||
                                                !question.trim() ||
                                                !selectedInvestigation
                                            }
                                            className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-white disabled:cursor-not-allowed disabled:opacity-30"
                                        >
                                            {ragLoading ? (
                                                <Sparkles size={12} />
                                            ) : (
                                                <ArrowUp size={13} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {answer && (
                            <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-4">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={13} />

                                    <span className="text-[10px] font-semibold">
                                        Investigation Assistant
                                    </span>

                                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[8px] text-neutral-500">
                                        RAG
                                    </span>
                                </div>

                                <div className="mt-3 space-y-2 text-[10px] leading-5 text-neutral-600">
                                    {answer.split("\n").map((line, index) => (
                                        <p key={index}>
                                            {line || "\u00A0"}
                                        </p>
                                    ))}
                                </div>

                                {sources.length > 0 && (
                                    <div className="mt-4 border-t border-neutral-100 pt-3">
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="text-[8px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                                                Sources
                                            </span>

                                            <span className="text-[8px] text-neutral-400">
                                                {sources.length} retrieved
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            {sources.map((source, index) => (
                                                <div
                                                    key={`${source.document_id}-${source.chunk}-${index}`}
                                                    className="flex items-center gap-2.5 rounded-lg bg-neutral-50 p-2.5"
                                                >
                                                    <FileText
                                                        size={12}
                                                        className="shrink-0 text-neutral-500"
                                                    />

                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-[9px] font-medium">
                                                            {
                                                                source.document_title
                                                            }
                                                        </p>

                                                        <p className="mt-0.5 text-[8px] text-neutral-400">
                                                            {source.filename} ·
                                                            Chunk{" "}
                                                            {source.chunk}
                                                        </p>
                                                    </div>

                                                    <span className="text-[8px] text-neutral-400">
                                                        {source.distance.toFixed(
                                                            3
                                                        )}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-3 border-t border-neutral-100 pt-3">
                                    <p className="text-[8px] text-neutral-400">
                                        Saved to Investigation #
                                        {selectedInvestigation?.id}
                                    </p>
                                </div>
                            </div>
                        )}

                        {selectedInvestigation && (
                            <div className="mt-5 border-t border-neutral-100 pt-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-[10px] font-semibold">
                                            Research History
                                        </h3>
                                        <p className="mt-1 text-[8px] text-neutral-400">
                                            Saved questions and answers for this investigation
                                        </p>
                                    </div>

                                    {researchHistory.length > 0 && (
                                        <span className="text-[8px] text-neutral-400">
                                            {researchHistory.length} saved
                                        </span>
                                    )}
                                </div>

                                {loadingHistory ? (
                                    <div className="rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-5 text-center">
                                        <p className="text-[9px] text-neutral-400">
                                            Loading research history...
                                        </p>
                                    </div>
                                ) : researchHistory.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-neutral-200 px-4 py-5 text-center">
                                        <p className="text-[9px] text-neutral-400">
                                            No saved research yet.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {researchHistory.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => {
                                                    setQuestion(item.question)
                                                    setAnswer(item.answer || "")
                                                    setSources([])
                                                }}
                                                className="w-full rounded-lg border border-neutral-100 bg-neutral-50 p-3 text-left transition hover:border-neutral-200 hover:bg-white"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <p className="text-[9px] font-medium leading-4 text-neutral-700">
                                                        {item.question}
                                                    </p>

                                                    <span className="shrink-0 text-[8px] text-neutral-400">
                                                        {new Date(item.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                {item.answer && (
                                                    <p className="mt-2 line-clamp-2 text-[8px] leading-4 text-neutral-500">
                                                        {item.answer}
                                                    </p>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                <section className="mt-4 rounded-xl border border-neutral-200 bg-white">
                    <SectionHeader
                        icon={<ShieldAlert size={14} />}
                        title="Regulatory Comparison"
                        detail="Compare all attached investigation documents using AI"
                    />

                    <div className="p-4 space-y-3">
                        {/* Read-only document context — no dropdowns */}
                        {investigationDocuments.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-neutral-200 px-4 py-5 text-center text-[9px] text-neutral-400">
                                No documents are attached to this investigation.
                            </p>
                        ) : investigationDocuments.length === 1 ? (
                            <p className="rounded-lg border border-dashed border-neutral-200 px-4 py-5 text-center text-[9px] text-neutral-400">
                                Attach at least two documents to enable comparison. Currently attached: <span className="font-medium">{investigationDocuments[0].title}</span>.
                            </p>
                        ) : (
                            <>
                                {/* Show which documents will be compared (read-only, deterministic) */}
                                <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
                                    <p className="mb-2 text-[8px] font-medium uppercase tracking-wide text-neutral-400">
                                        Comparing {investigationDocuments.length} attached documents
                                    </p>
                                    <div className="space-y-1">
                                        {investigationDocuments.map((doc, index) => {
                                            const label = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[index] ?? String(index)
                                            return (
                                                <div key={doc.id} className="flex items-center gap-2">
                                                    <span className="shrink-0 rounded bg-neutral-200 px-1.5 py-0.5 text-[8px] font-semibold text-neutral-700">
                                                        {label}
                                                    </span>
                                                    <span className="truncate text-[9px] text-neutral-700">{doc.title}</span>
                                                    <span className="shrink-0 text-[8px] text-neutral-400">{doc.filename}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Question input */}
                                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                                    <div className="flex gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white">
                                            <ShieldAlert size={14} />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <textarea
                                                id="compare-question"
                                                value={compareQuestion}
                                                onChange={(e) => setCompareQuestion(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && !e.shiftKey) {
                                                        e.preventDefault()
                                                        runComparison()
                                                    }
                                                }}
                                                rows={2}
                                                placeholder="e.g. Compare data breach notification requirements, or: Compare these documents."
                                                className="w-full resize-none bg-transparent text-[11px] leading-5 outline-none placeholder:text-neutral-400"
                                            />

                                            <div className="flex items-center justify-between border-t border-neutral-200 pt-2">
                                                <span className="text-[8px] text-neutral-400">
                                                    Per-document retrieval · investigation-scoped · {investigationDocuments.length} docs
                                                </span>

                                                <button
                                                    id="compare-submit"
                                                    onClick={runComparison}
                                                    disabled={compareLoading || !compareQuestion.trim()}
                                                    className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-white disabled:cursor-not-allowed disabled:opacity-30"
                                                >
                                                    {compareLoading ? (
                                                        <Sparkles size={12} />
                                                    ) : (
                                                        <ArrowUp size={13} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {compareError && (
                                    <p className="text-[9px] text-red-500">{compareError}</p>
                                )}

                                {compareLoading && (
                                    <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-6 text-center">
                                        <Sparkles size={16} className="mx-auto mb-2 animate-pulse text-neutral-400" />
                                        <p className="text-[9px] text-neutral-400">Comparing {investigationDocuments.length} documents…</p>
                                    </div>
                                )}

                                {/* Comparison result — N documents */}
                                {compareResult && !compareLoading && (
                                    <div className="space-y-3">
                                        {(() => {
                                            console.log("[DIAG:COMPARE_FRONTEND_RENDER]");
                                            console.log("  number of documents:", compareResult.documents.length);
                                            const sections = compareResult.comparison ? compareResult.comparison.split("─────────────────────────────────────────────────────") : [];
                                            const docSection = sections[1] || "";
                                            const numSections = docSection ? [...docSection.matchAll(/Document [A-Z] —/g)].length : 0;
                                            console.log("  number of comparison sections:", numSections);
                                            console.log("  exact labels rendered:", compareResult.documents.map(d => d.label));
                                            return null;
                                        })()}
                                        {/* Document label cards — one per document */}
                                        <div className={`grid gap-3 ${compareResult.documents.length === 2 ? "md:grid-cols-2" : compareResult.documents.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                                            {compareResult.documents.map((doc) => (
                                                <ComparisonCard
                                                    key={doc.id}
                                                    label={`Document ${doc.label}`}
                                                    title={doc.title}
                                                    text={`${doc.filename} · ${doc.jurisdiction}`}
                                                />
                                            ))}
                                        </div>

                                        {/* Comparison text */}
                                        <div className="rounded-xl border border-neutral-200 bg-white p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <ShieldAlert size={13} />
                                                <span className="text-[10px] font-semibold">Comparison Result</span>
                                                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[8px] text-neutral-500">AI · grounded · {compareResult.documents.length} docs</span>
                                            </div>

                                            <div className="space-y-1.5 text-[10px] leading-5 text-neutral-600">
                                                {compareResult.comparison.split("\n").map((line, i) => (
                                                    <p key={i}>{line || "\u00A0"}</p>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Sources — one column per document, dynamic */}
                                        <div className={`grid gap-3 ${compareResult.documents.length === 2 ? "md:grid-cols-2" : compareResult.documents.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                                            {compareResult.documents.map((doc) => {
                                                const key = `document_${doc.label.toLowerCase()}`
                                                const srcList = compareResult.sources[key] ?? []
                                                return (
                                                    <div key={doc.id} className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
                                                        <p className="mb-2 text-[8px] font-semibold uppercase tracking-wide text-neutral-400">
                                                            Document {doc.label} · {srcList.length} chunk{srcList.length !== 1 ? "s" : ""}
                                                        </p>
                                                        {srcList.length === 0 ? (
                                                            <p className="text-[8px] text-neutral-400">No relevant chunks found.</p>
                                                        ) : (
                                                            <div className="space-y-1.5">
                                                                {srcList.map((src, i) => (
                                                                    <div key={i} className="flex items-center gap-2 rounded-md bg-white border border-neutral-100 p-2">
                                                                        <FileText size={11} className="shrink-0 text-neutral-400" />
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="truncate text-[8px] font-medium">{src.document_title}</p>
                                                                            <p className="text-[7px] text-neutral-400">Chunk {src.chunk}</p>
                                                                        </div>
                                                                        <span className="text-[7px] text-neutral-400">{src.distance.toFixed(3)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </section>

                <section className="mt-4 rounded-xl border border-neutral-200 bg-white">
                    <SectionHeader
                        icon={<MessageCircle size={14} />}
                        title="Discussion"
                        detail="Human and AI collaboration"
                    />

                    <div className="divide-y divide-neutral-100">
                        <Comment
                            initials="PM"
                            name="Priya M."
                            role="Compliance"
                            time="18 min ago"
                            text="We should verify whether the retention schedule is documented for each category of employee data."
                        />

                        <Comment
                            initials="AS"
                            name="Arun S."
                            role="Research"
                            time="12 min ago"
                            text="I found the current policy document in the evidence set. The relevant section is now available for review."
                        />

                        <Comment
                            initials="AI"
                            name="Research Assistant"
                            role="AI"
                            time="8 min ago"
                            text="The available evidence suggests a review is required. I have linked the relevant document below."
                            ai
                        />
                    </div>

                    <div className="border-t border-neutral-100 p-3">
                        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                            <input
                                className="min-w-0 flex-1 bg-transparent text-[10px] outline-none placeholder:text-neutral-400"
                                placeholder="Add a comment to this investigation..."
                            />

                            <button className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 text-white">
                                <ChevronRight size={13} />
                            </button>
                        </div>
                    </div>
                </section>

                <section className="mt-4 rounded-xl border border-neutral-200 bg-white">
                    <SectionHeader
                        icon={<FileText size={14} />}
                        title="Evidence"
                        detail="Documents attached to this investigation"
                    />

                    <div className="divide-y divide-neutral-100">
                        {loadingInvestigationDocuments ? (
                            <div className="p-5 text-center">
                                <p className="text-[10px] text-neutral-400">
                                    Loading evidence...
                                </p>
                            </div>
                        ) : investigationDocuments.length === 0 ? (
                            <div className="p-5 text-center">
                                <FileText
                                    size={18}
                                    className="mx-auto text-neutral-300"
                                />

                                <p className="mt-2 text-[10px] text-neutral-400">
                                    No documents are currently available.
                                </p>
                            </div>
                        ) : (
                            investigationDocuments.map((document) => (
                                <EvidenceRow
                                    key={document.id}
                                    document={document}
                                    onPreview={previewDocumentFile}
                                    onDetach={detachDocument}
                                    detaching={detachingDocumentId === document.id}
                                />
                            ))
                        )}
                    </div>

                    {message && (
                        <div className="border-t border-neutral-100 px-4 py-3">
                            <p className="text-[9px] text-neutral-500">
                                {message}
                            </p>
                        </div>
                    )}
                </section>

                <section className="mt-4 rounded-xl border border-neutral-200 bg-white">
                    <SectionHeader
                        icon={<Sparkles size={14} />}
                        title="Multi-Agent Execution"
                        detail="AI work happening inside the investigation"
                    />

                    <div className="divide-y divide-neutral-100">
                        <AgentExecution
                            agent="Regulation Analyst"
                            action="Comparing applicable regulatory requirements"
                            status="Completed"
                        />

                        <AgentExecution
                            agent="Evidence Analyst"
                            action="Reviewing supporting documents"
                            status="Running"
                        />

                        <AgentExecution
                            agent="Risk Analyst"
                            action="Evaluating potential compliance impact"
                            status="Queued"
                        />
                    </div>
                </section>
            </section>

            <aside className="min-w-0">
                <div className="sticky top-4 space-y-3">
                    <InsightPanel
                        title="Agent Activity"
                        icon={<Sparkles size={13} />}
                    >
                        <div className="space-y-3">
                            <AgentStatus
                                name="Regulation Analyst"
                                detail="Completed comparison"
                                active={false}
                            />

                            <AgentStatus
                                name="Evidence Analyst"
                                detail="Reviewing evidence"
                                active
                            />

                            <AgentStatus
                                name="Risk Analyst"
                                detail="Waiting for evidence"
                                active={false}
                            />
                        </div>
                    </InsightPanel>

                    <InsightPanel
                        title="Human Review"
                        icon={<Users size={13} />}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-medium">
                                    Review required
                                </p>

                                <p className="mt-1 text-[9px] leading-4 text-neutral-400">
                                    A human decision is required before the
                                    recommendation can be finalized.
                                </p>
                            </div>

                            <button className="ml-3 shrink-0 rounded-md border border-neutral-200 px-2 py-1.5 text-[9px] text-neutral-500 hover:bg-neutral-50">
                                Review
                            </button>
                        </div>
                    </InsightPanel>

                    <InsightPanel
                        title="Risk Evaluation"
                        icon={<ShieldAlert size={13} />}
                    >
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-2xl font-semibold tracking-tight">
                                    Medium
                                </p>

                                <p className="mt-1 text-[9px] text-neutral-400">
                                    Preliminary assessment
                                </p>
                            </div>

                            <span className="text-[9px] text-neutral-400">
                                62 / 100
                            </span>
                        </div>

                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                            <div className="h-full w-[62%] rounded-full bg-neutral-700" />
                        </div>
                    </InsightPanel>

                    <InsightPanel
                        title="Governance Recommendation"
                        icon={<CheckCircle2 size={13} />}
                    >
                        <p className="text-[10px] font-medium leading-5">
                            Review and formalize retention periods for
                            employee data categories.
                        </p>

                        <p className="mt-2 text-[9px] leading-4 text-neutral-400">
                            Recommendation remains subject to human review and
                            supporting evidence validation.
                        </p>
                    </InsightPanel>

                    <InsightPanel
                        title="Recommendation Trace"
                        icon={<Search size={13} />}
                    >
                        <div className="space-y-2">
                            <TraceRow
                                number="01"
                                text="Regulatory requirement identified"
                            />

                            <TraceRow
                                number="02"
                                text="Internal policy evidence retrieved"
                            />

                            <TraceRow
                                number="03"
                                text="Potential gap identified"
                            />

                            <TraceRow
                                number="04"
                                text="Risk evaluation initiated"
                            />
                        </div>
                    </InsightPanel>

                    <InsightPanel
                        title="Collaboration"
                        icon={<Users size={13} />}
                    >
                        <div className="flex items-center gap-2">
                            <Avatar initials="PM" />
                            <Avatar initials="AS" />
                            <Avatar initials="RK" />

                            <span className="ml-1 text-[9px] text-neutral-400">
                                3 people active
                            </span>
                        </div>

                        <p className="mt-3 text-[9px] leading-4 text-neutral-400">
                            Changes, comments and agent activity are shared
                            with investigation participants.
                        </p>
                    </InsightPanel>
                </div>
            </aside>


            {previewDocument && (
                <DocumentPreviewModal
                    document={previewDocument}
                    url={previewUrl}
                    loading={previewLoading}
                    onClose={closePreview}
                />
            )}

            {duplicateMessage && (
                <div
                    className={`pointer-events-none fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 transition-all duration-300 ease-out ${duplicateToastClosing
                            ? "translate-y-2 opacity-0"
                            : "translate-y-0 opacity-100"
                        }`}
                    role="status"
                    aria-live="polite"
                >
                    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-[10px] font-medium text-neutral-700 shadow-lg">
                        File already exists
                    </div>
                </div>
            )}
        </div>
    )
}

function DocumentPreviewModal({
    document,
    url,
    loading,
    onClose,
}: {
    document: Document
    url: string | null
    loading: boolean
    onClose: () => void
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
                    <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold">{document.title}</p>
                        <p className="mt-0.5 truncate text-[8px] text-neutral-400">{document.filename}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                    >
                        <X size={14} />
                    </button>
                </div>

                <div className="min-h-0 flex-1 bg-neutral-100">
                    {loading ? (
                        <div className="flex h-full items-center justify-center text-[10px] text-neutral-400">
                            Loading preview...
                        </div>
                    ) : url ? (
                        <iframe
                            src={url}
                            title={`Preview of ${document.filename}`}
                            className="h-full w-full border-0"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center p-6 text-center text-[10px] text-neutral-400">
                            Preview is not available for this document.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function SectionHeader({
    icon,
    title,
    detail,
}: {
    icon: React.ReactNode
    title: string
    detail: string
}) {
    return (
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <div className="flex items-center gap-2">
                <span className="text-neutral-500">{icon}</span>

                <div>
                    <h2 className="text-[11px] font-semibold">{title}</h2>

                    <p className="mt-0.5 text-[8px] text-neutral-400">
                        {detail}
                    </p>
                </div>
            </div>

            <MoreHorizontal size={14} className="text-neutral-400" />
        </div>
    )
}

function ComparisonCard({
    label,
    title,
    text,
}: {
    label: string
    title: string
    text: string
}) {
    return (
        <div className="rounded-lg border border-neutral-200 p-3">
            <p className="text-[8px] uppercase tracking-[0.12em] text-neutral-400">
                {label}
            </p>

            <p className="mt-2 text-[10px] font-semibold">{title}</p>

            <p className="mt-2 text-[9px] leading-4 text-neutral-500">
                {text}
            </p>
        </div>
    )
}

function Comment({
    initials,
    name,
    role,
    time,
    text,
    ai = false,
}: {
    initials: string
    name: string
    role: string
    time: string
    text: string
    ai?: boolean
}) {
    return (
        <div className="flex gap-3 p-4">
            <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[8px] font-medium ${ai
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-600"
                    }`}
            >
                {initials}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="text-[10px] font-medium">{name}</p>

                    <span className="text-[8px] text-neutral-400">
                        {role}
                    </span>

                    <span className="text-[8px] text-neutral-300">•</span>

                    <span className="text-[8px] text-neutral-400">
                        {time}
                    </span>
                </div>

                <p className="mt-2 text-[9px] leading-4 text-neutral-500">
                    {text}
                </p>
            </div>
        </div>
    )
}

function EvidenceRow({
    document,
    onPreview,
    onDetach,
    detaching,
}: {
    document: Document
    onPreview: (document: Document) => void
    onDetach: (documentId: number) => void
    detaching: boolean
}) {
    return (
        <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                <FileText size={14} className="text-neutral-500" />
            </div>

            <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-medium">
                    {document.title}
                </p>

                <p className="mt-1 truncate text-[8px] text-neutral-400">
                    {document.filename} · {document.document_type} ·{" "}
                    {document.jurisdiction}
                </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <div className="text-right">
                    <span
                        className={`rounded-full px-2 py-1 text-[8px] ${document.processing_status === "Ready"
                            ? "bg-neutral-100 text-neutral-600"
                            : "bg-neutral-50 text-neutral-400"
                            }`}
                    >
                        {document.processing_status}
                    </span>

                    {document.chunks > 0 && (
                        <p className="mt-1 text-[8px] text-neutral-400">
                            {document.embedded_chunks}/{document.chunks} chunks
                        </p>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => onPreview(document)}
                    title="Preview document"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                >
                    <Eye size={12} />
                </button>

                <button
                    type="button"
                    onClick={() => onDetach(document.id)}
                    disabled={detaching}
                    title="Remove from investigation"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40"
                >
                    <Trash2 size={12} />
                </button>
            </div>
        </div>
    )
}

function AgentExecution({
    agent,
    action,
    status,
}: {
    agent: string
    action: string
    status: string
}) {
    const running = status === "Running"

    return (
        <div className="flex items-center gap-3 px-4 py-3">
            <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${running ? "bg-neutral-900 text-white" : "bg-neutral-100"
                    }`}
            >
                <Sparkles size={12} />
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium">{agent}</p>

                <p className="mt-0.5 truncate text-[9px] text-neutral-400">
                    {action}
                </p>
            </div>

            <span className="text-[8px] text-neutral-400">{status}</span>
        </div>
    )
}

function InsightPanel({
    title,
    icon,
    children,
}: {
    title: string
    icon: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 border-b border-neutral-100 pb-3">
                <span className="text-neutral-500">{icon}</span>

                <h2 className="text-[10px] font-semibold">{title}</h2>
            </div>

            {children}
        </div>
    )
}

function AgentStatus({
    name,
    detail,
    active,
}: {
    name: string
    detail: string
    active: boolean
}) {
    return (
        <div className="flex items-center gap-2.5">
            <span
                className={`h-1.5 w-1.5 rounded-full ${active ? "bg-neutral-700" : "bg-neutral-300"
                    }`}
            />

            <div className="min-w-0 flex-1">
                <p className="text-[9px] font-medium">{name}</p>

                <p className="mt-0.5 text-[8px] text-neutral-400">
                    {detail}
                </p>
            </div>
        </div>
    )
}

function TraceRow({
    number,
    text,
}: {
    number: string
    text: string
}) {
    return (
        <div className="flex items-start gap-2.5">
            <span className="text-[8px] text-neutral-300">{number}</span>

            <p className="text-[9px] leading-4 text-neutral-500">{text}</p>
        </div>
    )
}

function Avatar({ initials }: { initials: string }) {
    return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-neutral-200 text-[7px] font-medium text-neutral-600">
            {initials}
        </div>
    )
}

export default Investigations