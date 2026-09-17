"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Scale, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("demo-admin-2024");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center mx-auto mb-4">
            <Scale size={20} className="text-background" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Legal &amp; Compliance</h1>
          <p className="text-sm text-muted-foreground mt-1">Research Assistant</p>
        </div>

        {/* Login Form */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-base font-medium mb-5">Sign in</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-9 text-sm"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-muted-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-9 text-sm"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" className="w-full h-9 text-sm" disabled={loading}>
              {loading ? (
                <><Loader2 size={14} className="animate-spin mr-2" />Signing in…</>
              ) : "Sign in"}
            </Button>
          </form>

          {/* Demo credentials note */}
          <div className="mt-5 pt-4 border-t">
            <p className="text-[11px] text-muted-foreground font-medium mb-2">Demo credentials</p>
            <div className="space-y-1">
              {[
                { label: "Admin", email: "admin@example.com", pwd: "demo-admin-2024" },
                { label: "Legal", email: "legal@example.com", pwd: "demo-legal-2024" },
                { label: "Compliance", email: "compliance@example.com", pwd: "demo-compliance-2024" },
              ].map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => { setEmail(d.email); setPassword(d.pwd); }}
                  className="w-full text-left text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
                >
                  <span className="font-medium">{d.label}</span> — {d.email}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
