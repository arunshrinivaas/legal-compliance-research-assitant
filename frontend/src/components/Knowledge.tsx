import { useState, useEffect } from "react"
import { User as UserIcon, Calendar, Quote, BookOpen } from "lucide-react"


interface KnowledgePost {
    id: number
    title: string
    content: string
    source_citation: string | null
    investigation_id: number | null
    created_at: string
    author: {
        id: number
        full_name: string
        email: string
    }
}

export function Knowledge() {
    const [posts, setPosts] = useState<KnowledgePost[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchPosts()
    }, [])

    const fetchPosts = async () => {
        try {
            const token = localStorage.getItem("token")
            if (!token) return

            const response = await fetch("/api/v1/knowledge/", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) throw new Error("Failed to fetch knowledge posts")
            
            const data = await response.json()
            setPosts(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex h-full w-full flex-col bg-white">
            <header className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
                <div>
                    <h1 className="text-xl font-semibold text-neutral-900">Public Knowledge</h1>
                    <p className="mt-1 text-sm text-neutral-500">Shared findings and insights from across the organization.</p>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex h-full items-center justify-center text-neutral-400">Loading knowledge base...</div>
                ) : posts.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <BookOpen size={48} className="mb-4 text-neutral-200" />
                        <h3 className="text-lg font-medium text-neutral-900">No public findings yet</h3>
                        <p className="mt-1 text-sm text-neutral-500">
                            Findings shared from private investigations will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="mx-auto max-w-4xl space-y-6">
                        {posts.map((post) => (
                            <article key={post.id} className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
                                <div className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4">
                                    <h2 className="text-lg font-semibold text-neutral-900">{post.title}</h2>
                                    <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
                                        <div className="flex items-center gap-1.5">
                                            <UserIcon size={12} />
                                            <span>{post.author.full_name}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={12} />
                                            <time dateTime={post.created_at}>
                                                {new Date(post.created_at).toLocaleDateString()}
                                            </time>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-6 py-5">
                                    <div className="prose prose-sm max-w-none text-neutral-700 whitespace-pre-wrap">
                                        {post.content}
                                    </div>
                                    
                                    {post.source_citation && (
                                        <div className="mt-6 rounded-lg bg-blue-50/50 p-4 border border-blue-100">
                                            <div className="flex items-start gap-2">
                                                <Quote size={14} className="mt-0.5 shrink-0 text-blue-500" />
                                                <div className="text-sm text-blue-900">
                                                    <span className="font-semibold block mb-1">Source / Citation</span>
                                                    <span className="whitespace-pre-wrap">{post.source_citation}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
