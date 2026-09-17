"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home,
  BookOpen,
  ShieldCheck,
  FileText,
  Search,
  Telescope,
  Bot,
  Puzzle,
  ClipboardList,
  Scale,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Home",           href: "/dashboard",        icon: Home },
  { label: "Regulations",   href: "/regulations",      icon: BookOpen },
  { label: "Compliance",    href: "/compliance",       icon: ShieldCheck },
  { label: "Policies",      href: "/policies",         icon: FileText },
  { label: "Research",      href: "/research",         icon: Search },
  { label: "Investigations",href: "/investigations",   icon: Telescope },
  { label: "AI Agents",     href: "/agents",           icon: Bot },
  { label: "Integrations",  href: "/integrations",     icon: Puzzle },
  { label: "Audit & Findings", href: "/audit",         icon: ClipboardList },
  { label: "Governance",    href: "/governance",       icon: Scale },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-card"
      style={{ width: "var(--sidebar-width, 220px)" }}>
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Legal &amp; Compliance</p>
        <p className="text-sm font-semibold mt-0.5 leading-tight">Research Assistant</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} className={cn("sidebar-nav-item", active && "active")}>
              <Icon size={15} strokeWidth={1.5} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4 border-t pt-3 space-y-0.5">
        <Link href="/settings" className={cn("sidebar-nav-item", pathname === "/settings" && "active")}>
          <Settings size={15} strokeWidth={1.5} />
          <span>Settings</span>
        </Link>
        <div className="sidebar-nav-item" onClick={logout} role="button">
          <LogOut size={15} strokeWidth={1.5} />
          <span>Sign out</span>
        </div>
        {user && (
          <div className="flex items-center gap-2 px-3 py-2 mt-1">
            <div className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center">
              <User size={12} strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{user.full_name || user.email}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{user.role.replace("_", " ")}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
