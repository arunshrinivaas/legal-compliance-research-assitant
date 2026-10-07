import { useEffect, useState } from "react"
import { AlertCircle, Loader2 } from "lucide-react"

declare global {
    interface Window {
        gapi: any;
        google: any;
    }
}

export default function GoogleDrivePicker() {
    const [pickerApiLoaded, setPickerApiLoaded] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [importing, setImporting] = useState(false)

    useEffect(() => {
        // Load Google API scripts if not already loaded
        const loadScripts = () => {
            if (!document.getElementById("gapi-script")) {
                const script1 = document.createElement("script")
                script1.id = "gapi-script"
                script1.src = "https://apis.google.com/js/api.js"
                script1.onload = () => {
                    window.gapi.load('picker', () => {
                        setPickerApiLoaded(true)
                    })
                }
                document.body.appendChild(script1)
            } else if (window.gapi && window.gapi.picker) {
                setPickerApiLoaded(true)
            }
        }
        
        loadScripts()
        
        const handleOpenPicker = (event: CustomEvent<{ token: string }>) => {
            if (!pickerApiLoaded) {
                setError("Google Picker API is still loading. Please try again in a moment.")
                return
            }
            createPicker(event.detail.token)
        }
        
        window.addEventListener("open-google-picker", handleOpenPicker as EventListener)
        return () => window.removeEventListener("open-google-picker", handleOpenPicker as EventListener)
    }, [pickerApiLoaded])

    const createPicker = (token: string) => {
        setError(null)
        if (!import.meta.env.VITE_GOOGLE_API_KEY) {
            setError("Google API Key (VITE_GOOGLE_API_KEY) is not configured.")
            return
        }
        
        const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
        view.setIncludeFolders(true)
        view.setMimeTypes("application/pdf,application/vnd.google-apps.document,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain")

        const picker = new window.google.picker.PickerBuilder()
            .addView(view)
            .setOAuthToken(token)
            .setDeveloperKey(import.meta.env.VITE_GOOGLE_API_KEY)
            .setCallback(pickerCallback)
            .build()
        picker.setVisible(true)
    }

    const pickerCallback = async (data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
            const fileId = data.docs[0].id
            setImporting(true)
            try {
                const token = localStorage.getItem("access_token")
                const res = await fetch("http://localhost:8000/api/v1/integrations/google-drive/import", {
                    method: "POST",
                    headers: { 
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ file_id: fileId })
                })
                
                if (!res.ok) {
                    const err = await res.json()
                    throw new Error(err.detail || "Failed to import file")
                }
                
                const result = await res.json()
                // Successfully imported
                alert(`Successfully imported document: ${result.filename}`)
            } catch (err: any) {
                setError(err.message || "Failed to import from Google Drive.")
            } finally {
                setImporting(false)
            }
        }
    }

    return (
        <>
            {error && (
                <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-red-200 bg-white p-4 shadow-xl flex items-start gap-3 max-w-sm">
                    <AlertCircle size={20} className="text-red-500 shrink-0" />
                    <div>
                        <h4 className="font-semibold text-red-900 mb-1">Import Error</h4>
                        <p className="text-sm text-red-700">{error}</p>
                        <button 
                            className="mt-3 text-xs font-medium text-red-600 hover:text-red-800"
                            onClick={() => setError(null)}
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}
            
            {importing && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl p-6 flex items-center gap-4">
                        <Loader2 className="animate-spin text-blue-600" size={24} />
                        <div>
                            <h4 className="font-medium text-neutral-900">Importing from Google Drive...</h4>
                            <p className="text-sm text-neutral-500">This may take a moment depending on file size.</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
