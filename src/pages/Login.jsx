import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, Coffee } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function Login() {
  const locationState = window.history.state?.usr || {};
  const [email, setEmail] = useState(locationState?.email || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail("demo@beanledgerexport.com");
    setPassword("Demo@2026");
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome to BeanLedger Export"
      subtitle="Coffee Export Operations Platform"
      footer={null}
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      {/* Demo credentials */}
      <div className="mt-6 p-4 rounded-xl border border-dashed" style={{ borderColor: '#B08D57', background: '#F7F3EE' }}>
        <div className="flex items-center gap-2 mb-2">
          <Coffee className="w-4 h-4 flex-shrink-0" style={{ color: '#B08D57' }} />
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#1F2A24' }}>Demo Access</p>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p><span className="font-medium text-foreground">Email:</span> demo@beanledgerexport.com</p>
          <p><span className="font-medium text-foreground">Password:</span> Demo@2026</p>
        </div>
        <button
          type="button"
          onClick={fillDemo}
          className="mt-2 text-xs font-medium underline"
          style={{ color: '#B08D57' }}
        >
          Fill demo credentials
        </button>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Don't have an account?{" "}
        <Link to="/register" className="text-primary font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}