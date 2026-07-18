import React, { useState } from "react";
import { authService } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, User, Lock, Loader2, Coffee } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authService.login({ username, password });
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid demo username or password");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setUsername("admin");
    setPassword("password");
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="BeanLedger Export PLC"
      subtitle="Demo Environment - synthetic data only"
      footer={null}
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        This local demo login is not production-grade security. Supabase Auth will replace it in a later phase.
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="username"
              type="text"
              autoComplete="username"
              autoFocus
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="password"
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
              Signing in...
            </>
          ) : (
            "Sign in to demo"
          )}
        </Button>
      </form>

      <div className="mt-6 p-4 rounded-xl border border-dashed" style={{ borderColor: '#B08D57', background: '#F7F3EE' }}>
        <div className="flex items-center gap-2 mb-2">
          <Coffee className="w-4 h-4 flex-shrink-0" style={{ color: '#B08D57' }} />
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#1F2A24' }}>Demo Credentials</p>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p><span className="font-medium text-foreground">Username:</span> admin</p>
          <p><span className="font-medium text-foreground">Password:</span> password</p>
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
    </AuthLayout>
  );
}
