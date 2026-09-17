
"use client";

import { useQuery } from "@tanstack/react-query";
import { complianceApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ShieldCheck, AlertTriangle, Clock, AlertOctagon } from "lucide-react";

function RiskBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    High: "bg-destructive/10 text-destructive",
    Medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    Low: "bg-green-500/10 text-green-700 dark:text-green-400",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${map[level] ?? "bg-muted text-muted-foreground"}`}>
      {level}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Compliant: "bg-foreground/10 text-foreground",
    "Non-Compliant": "bg-destructive/10 text-destructive",
    "In Progress": "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    "Not Started": "bg-muted text-muted-foreground",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

export default function CompliancePage() {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["compliance-overview"],
    queryFn: complianceApi.overview,
  });
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["compliance-items"],
    queryFn: () => complianceApi.list(),
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Compliance Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Track obligations, findings, and risk exposure.</p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {overviewLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="metric-card"><Skeleton className="h-8 w-16" /><Skeleton className="h-3 w-20 mt-1" /></div>
          ))
        ) : overview && [
          { label: "Compliance Score", value: `${overview.compliance_score}%`, icon: TrendingUp },
          { label: "Total Obligations", value: overview.total_obligations, icon: ShieldCheck },
          { label: "Compliant", value: overview.compliant, icon: ShieldCheck },
          { label: "Non-Compliant", value: overview.non_compliant, icon: AlertOctagon },
          { label: "High Risk", value: overview.high_risk_items, icon: AlertTriangle },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="metric-card">
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Obligations Table */}
      <div>
        <h2 className="text-base font-medium mb-3">Compliance Obligations</h2>
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Obligation</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Regulation</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Department</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Risk</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {itemsLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                : items?.items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.regulation}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.department}</td>
                      <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                      <td className="px-4 py-3"><RiskBadge level={item.risk_level} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {item.due_date
                          ? new Date(item.due_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                          : "—"}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-dashed bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Demo Mode</span> — Data shown reflects seeded demo obligations.
        </p>
      </div>
    </div>
  );
}
