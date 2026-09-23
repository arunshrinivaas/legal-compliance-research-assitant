import { useState } from "react"
import { AlertCircle, Cloud, HardDrive, Share2 } from "lucide-react"

function Integrations() {
    const [message, setMessage] = useState("")

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
                    <p>{message}</p>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Google Drive Card */}
                <div className="rounded-xl border border-neutral-200 bg-white p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
                            <HardDrive size={18} className="text-neutral-700" />
                        </div>
                        <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                            Not Configured
                        </span>
                    </div>
                    
                    <h2 className="text-sm font-semibold text-neutral-900 mb-1">Google Drive</h2>
                    <p className="text-sm text-neutral-500 mb-4 flex-1">
                        Import legal documents and evidence directly from Google Drive. 
                        Requires Google Cloud OAuth configuration.
                    </p>

                    <div className="mt-auto border-t border-neutral-100 pt-4">
                        <button
                            onClick={() => setMessage("Google Drive integration requires a backend OAuth configuration and client credentials which have not yet been set up.")}
                            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                        >
                            Connect Account
                        </button>
                    </div>
                </div>

                {/* Dropbox Card */}
                <div className="rounded-xl border border-neutral-200 bg-white p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
                            <Cloud size={18} className="text-neutral-700" />
                        </div>
                        <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                            Not Configured
                        </span>
                    </div>
                    
                    <h2 className="text-sm font-semibold text-neutral-900 mb-1">Dropbox</h2>
                    <p className="text-sm text-neutral-500 mb-4 flex-1">
                        Sync shared folders and files from your Dropbox workspace.
                        Requires Dropbox API credentials.
                    </p>

                    <div className="mt-auto border-t border-neutral-100 pt-4">
                        <button
                            onClick={() => setMessage("Dropbox integration requires backend API credentials and webhook architecture which have not yet been set up.")}
                            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                        >
                            Connect Account
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-8 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
                <h3 className="text-sm font-semibold text-neutral-700 mb-1">More Integrations Coming Soon</h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                    Support for Box, Microsoft OneDrive, and SharePoint will be added in a future update.
                    For now, you can upload documents directly from your device in the Investigations or Research workspaces.
                </p>
            </div>
        </div>
    )
}

export default Integrations
