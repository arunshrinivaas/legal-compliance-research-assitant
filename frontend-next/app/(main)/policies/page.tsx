
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { policiesApi, Policy } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, FileText, Pencil, Trash2 } from "lucide-react";

const STATUSES = ["All", "Draft", "Under Review", "Published", "Archived"];

function PolicyStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Published: "bg-foreground/10 text-foreground",
    Draft: "bg-muted text-muted-foreground",
    "Under Review": "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    Archived: "bg-muted text-muted-foreground line-through",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

export default function PoliciesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const { data, isLoading } = useQuery({
    queryKey: ["policies", search, filterStatus],
    queryFn: () => policiesApi.list({
      search: search || undefined,
      status: filterStatus !== "All" ? filterStatus : undefined,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => policiesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["policies"] }),
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Policy Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Create, review, and version organizational policies.</p>
        </div>
        <Button size="sm" className="gap-1.5 h-8 text-xs">
          <Plus size={13} strokeWidth={2} />New Policy
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8 h-8 text-sm" placeholder="Search policies…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                filterStatus === s
                  ? "bg-foreground text-background border-foreground"
                  : "text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >{s}</button>
          ))}
        </div>
      </div>

      {!isLoading && data && (
        <p className="text-xs text-muted-foreground">{data.total} polic{data.total !== 1 ? "ies" : "y"}</p>
      )}

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Policy</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Department</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Version</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Effective Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              : data?.items.map((policy) => (
                  <tr key={policy.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText size={13} strokeWidth={1.5} className="text-muted-foreground shrink-0" />
                        <span className="font-medium">{policy.title}</span>
                      </div>
                      {policy.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 pl-5 line-clamp-1">{policy.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{policy.department}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">v{policy.version}</td>
                    <td className="px-4 py-3"><PolicyStatusBadge status={policy.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {policy.effective_date
                        ? new Date(policy.effective_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                          <Pencil size={12} strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(policy.id)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 size={12} strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
