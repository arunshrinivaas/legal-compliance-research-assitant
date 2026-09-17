
"use client";

import { useQuery } from "@tanstack/react-query";
import { complianceApi, regulationsApi, policiesApi, ComplianceOverview } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, ShieldCheck, AlertTriangle, FileText, BookOpen, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

function MetricCard({ label, value, sublabel, icon: Icon, accent }: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div className={`metric-card ${accent ? "border-foreground/20" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold mt-0.5 tracking-tight">{value}</p>
          {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
        </div>
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
          <Icon size={16} strokeWidth={1.5} className="text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["compliance-overview"],
    queryFn: complianceApi.overview,
    refetchInterval: 30000,
  });
  const { data: regsData, isLoading: regsLoading } = useQuery({
    queryKey: ["regulations-count"],
    queryFn: () => regulationsApi.list({ limit: 1 }),
  });
  const { data: policiesData, isLoading: policiesLoading } = useQuery({
    queryKey: ["policies-count"],
    queryFn: () => policiesApi.list(),
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {user ? `Good morning, ${user.full_name?.split(" ")[0] || "there"}.` : "Dashboard"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Smarter compliance for a complex world.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {overviewLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="metric-card">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))
        ) : overview ? (
          <>
            <MetricCard
              label="Compliance Score"
              value={`${overview.compliance_score}%`}
              sublabel="Overall"
              icon={TrendingUp}
              accent
            />
            <MetricCard
              label="Active Obligations"
              value={overview.total_obligations}
              sublabel="Total tracked"
              icon={ShieldCheck}
            />
            <MetricCard
              label="Compliant"
              value={overview.compliant}
              sublabel="Requirements met"
              icon={ShieldCheck}
            />
            <MetricCard
              label="Open Findings"
              value={overview.non_compliant}
              sublabel="Needs attention"
              icon={AlertTriangle}
            />
            <MetricCard
              label="High Risk Items"
              value={overview.high_risk_items}
              sublabel="Flagged"
              icon={AlertTriangle}
            />
          </>
        ) : null}
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Regulation Repository",
            desc: "Search and analyze regulations across jurisdictions.",
            href: "/regulations",
            stat: regsLoading ? "…" : `${regsData?.total ?? 0} regulations`,
            icon: BookOpen,
          },
          {
            title: "Compliance Dashboard",
            desc: "Track obligations, findings, and risk exposure.",
            href: "/compliance",
            stat: overviewLoading ? "…" : `${overview?.in_progress ?? 0} in progress`,
            icon: ShieldCheck,
          },
          {
            title: "Policy Management",
            desc: "Create, review, and version organizational policies.",
            href: "/policies",
            stat: policiesLoading ? "…" : `${policiesData?.total ?? 0} policies`,
            icon: FileText,
          },
          {
            title: "Research Workspace",
            desc: "Ask the AI assistant. Compare and analyze requirements.",
            href: "/research",
            stat: "Ask anything",
            icon: BookOpen,
          },
        ].map((card) => (
          <Link key={card.href} href={card.href}>
            <div className="rounded-xl border bg-card p-5 hover:border-foreground/20 transition-all duration-200 cursor-pointer group h-full">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center mb-3">
                <card.icon size={16} strokeWidth={1.5} className="text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium">{card.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{card.desc}</p>
              <div className="flex items-center gap-1 mt-3">
                <span className="text-xs text-muted-foreground">{card.stat}</span>
                <ArrowRight size={11} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Demo note */}
      <div className="rounded-xl border border-dashed bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Demo Mode</span> — Displaying seeded demo data.
          Data shown above reflects the demo dataset and does not represent real organizational compliance posture.
        </p>
      </div>
    </div>
  );
}
