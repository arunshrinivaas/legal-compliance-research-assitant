
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { regulationsApi, Regulation } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, BookOpen } from "lucide-react";

const JURISDICTIONS = ["All", "European Union", "United States", "California, USA", "International", "India"];
const STATUSES = ["All", "Active", "Pending", "Archived"];

function StatusBadge({ status }: { status: string }) {
  const variant = status === "Active" ? ("default" as const) : ("secondary" as const);
  return <Badge variant={variant} className="text-[10px] px-2 py-0.5 font-normal">{status}</Badge>;
}

export default function RegulationsPage() {
  const [search, setSearch] = useState("");
  const [jurisdiction, setJurisdiction] = useState("All");
  const [status, setStatus] = useState("All");

  const { data, isLoading } = useQuery({
    queryKey: ["regulations", search, jurisdiction, status],
    queryFn: () => regulationsApi.list({
      search: search || undefined,
      jurisdiction: jurisdiction !== "All" ? jurisdiction : undefined,
      status: status !== "All" ? status : undefined,
    }),
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Regulation Repository</h1>
        <p className="text-sm text-muted-foreground mt-1">Search and analyze regulations across jurisdictions.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-80">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search regulations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {JURISDICTIONS.map((j) => (
            <button
              key={j}
              onClick={() => setJurisdiction(j)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                jurisdiction === j
                  ? "bg-foreground text-background border-foreground"
                  : "text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >
              {j}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                status === s
                  ? "bg-foreground text-background border-foreground"
                  : "text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {data && (
        <p className="text-xs text-muted-foreground">{data.total} regulation{data.total !== 1 ? "s" : ""} found</p>
      )}

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Title</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Jurisdiction</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Issuing Authority</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Effective Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  </tr>
                ))
              : (data?.items ?? []).map((reg: Regulation) => (
                  <tr key={reg.id} className="hover:bg-muted/20 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <BookOpen size={13} strokeWidth={1.5} className="text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">{reg.title}</span>
                      </div>
                      {reg.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 pl-5 line-clamp-1">{reg.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{reg.jurisdiction}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{reg.issuing_authority}</td>
                    <td className="px-4 py-3"><StatusBadge status={reg.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {reg.effective_date
                        ? new Date(reg.effective_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                        : "—"}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
