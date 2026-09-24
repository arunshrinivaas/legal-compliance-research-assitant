import { useState } from "react"
import { AlertCircle, Cloud, HardDrive, Share2, Archive, FolderOpen } from "lucide-react"

type IntegrationCard = {
    id: string
    name: string
    description: string
    icon: React.ReactNode
    status: "not-configured" | "coming-soon"
    message: string
    badgeLabel: string
    bgColor: string
}

function Integrations() {
    const [message, setMessage] = useState("")

    const cards: IntegrationCard[] = [
        {
            id: "google-drive",
            name: "Google Drive",
            description: "Import legal documents and evidence directly from Google Drive. Requires Google Cloud OAuth configuration.",
            icon: <HardDrive size={18} className="text-neutral-700" />,
            status: "not-configured",
            badgeLabel: "Not Configured",
            bgColor: "bg-neutral-100",
            message: "Google Drive integration requires a backend OAuth configuration and client credentials which have not yet been set up. Documents can be uploaded directly in the Investigations or Research workspaces.",
        },
        {
            id: "dropbox",
            name: "Dropbox",
            description: "Sync shared folders and files from your Dropbox workspace. Requires Dropbox API credentials.",
            icon: <Cloud size={18} className="text-neutral-700" />,
            status: "not-configured",
            badgeLabel: "Not Configured",
            bgColor: "bg-neutral-100",
            message: "Dropbox integration requires backend API credentials and webhook infrastructure which have not yet been configured.",
        },
        {
            id: "box",
            name: "Box",
            description: "Connect your Box workspace to import and manage legal files and folders at scale.",
            icon: <Archive size={18} className="text-neutral-700" />,
            status: "coming-soon",
            badgeLabel: "Coming Soon",
            bgColor: "bg-neutral-100",
            message: "Box integration is planned for a future release.",
        },
        {
            id: "onedrive",
            name: "Microsoft OneDrive",
            description: "Connect your Microsoft 365 OneDrive to bring documents into your compliance workspace.",
            icon: <FolderOpen size={18} className="text-blue-700" />,
            status: "coming-soon",
            badgeLabel: "Coming Soon",
            bgColor: "bg-blue-50",
            message: "OneDrive integration with Microsoft 365 OAuth is planned for a future release.",
        },
        {
            id: "sharepoint",
            name: "SharePoint",
            description: "Sync document libraries from Microsoft SharePoint for centralized legal and compliance management.",
            icon: <Share2 size={18} className="text-blue-700" />,
            status: "coming-soon",
            badgeLabel: "Coming Soon",
            bgColor: "bg-blue-50",
            message: "SharePoint integration is planned for a future release and will support CSOM and Graph API.",
        },
    ]

    return (
        <div className="space-y-4">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Share2 size={15} className="text-neutral-500" />
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
                        Integrations
                    </span>
                </div>
                <h1 className="text-xl font-semibold tracking-tight">External Data Sources</h1>
                <p className="mt-1 text-sm text-neutral-500">
                    Connect external repositories to securely import and sync documents into your workspace.
                </p>
            </div>

            {message && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium mb-0.5">Integration not available</p>
                        <p>{message}</p>
                        <p className="mt-2 text-amber-700">You can upload documents directly from your device in the Investigations or Research workspaces.</p>
                    </div>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map(card => (
                    <div key={card.id} className="rounded-xl border border-neutral-200 bg-white p-5 flex flex-col h-full">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bgColor}`}>
                                {card.icon}
                            </div>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                card.status === "coming-soon"
                                    ? "bg-blue-50 text-blue-600"
                                    : "bg-neutral-100 text-neutral-600"
                            }`}>
                                {card.badgeLabel}
                            </span>
                        </div>

                        <h2 className="text-sm font-semibold text-neutral-900 mb-1">{card.name}</h2>
                        <p className="text-sm text-neutral-500 mb-4 flex-1">{card.description}</p>

                        <div className="mt-auto border-t border-neutral-100 pt-4">
                            <button
                                onClick={() => setMessage(card.message)}
                                disabled={card.status === "coming-soon"}
                                className={`w-full rounded-lg border px-3 py-2 text-sm font-medium transition ${
                                    card.status === "coming-soon"
                                        ? "border-neutral-100 bg-neutral-50 text-neutral-400 cursor-not-allowed"
                                        : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                                }`}
                            >
                                {card.status === "coming-soon" ? "Coming Soon" : "Connect Account"}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-5 text-center">
                <h3 className="text-sm font-semibold text-neutral-700 mb-1">Upload directly in the meantime</h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                    While external integrations are being configured, you can upload documents directly from your device
                    in the <strong>Investigations</strong> or <strong>Research</strong> workspaces.
                </p>
            </div>
        </div>
    )
}

export default Integrations
