"use client";

import { useState } from "react";
import { Bell, HelpCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

export function TopBar() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  return (
    <header className="h-14 border-b bg-background/80 backdrop-blur-sm flex items-center gap-4 px-5 sticky top-0 z-30">
      {/* Global Search */}
      <div className="flex-1 relative max-w-xl">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8 h-8 text-sm bg-muted/50 border-transparent focus:border-border focus:bg-background"
          placeholder="Search laws, regulations, policies, contracts, standards, or ask anything…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1">
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
          <Bell size={15} strokeWidth={1.5} />
        </button>
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
          <HelpCircle size={15} strokeWidth={1.5} />
        </button>
        {user && (
          <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center ml-1 text-xs font-medium">
            {(user.full_name || user.email)[0].toUpperCase()}
          </div>
        )}
      </div>
    </header>
  );
}
