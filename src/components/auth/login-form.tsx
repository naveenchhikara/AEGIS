"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Mail, Shield } from "@/lib/icons";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Demo: redirect on any valid-looking email
    await new Promise((r) => setTimeout(r, 600));
    router.push("/dashboard");
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Login card */}
      <Card className="w-full border-0 bg-white/70 shadow-xl shadow-slate-200/50 backdrop-blur-md">
        <CardContent className="p-8">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-2">
            <Image
              src="/logos/aegis-mark.png"
              alt="AEGIS"
              width={56}
              height={56}
              className="h-14 w-14"
              priority
            />
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold tracking-wide text-foreground">
                AEGIS
              </span>
              <span className="text-[11px] tracking-widest text-muted-foreground">
                SAPIEX TECHNOLOGY
              </span>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Audit & Compliance Platform for UCBs
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="rajesh.deshmukh@apexbank.example"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* MFA */}
            <div className="space-y-2">
              <Label htmlFor="mfa" className="text-sm font-medium">
                MFA Code{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="mfa"
                  type="text"
                  inputMode="numeric"
                  placeholder="6-digit code"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-200/50 transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Demo hint */}
          <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
            <p className="text-center text-xs text-blue-700">
              <span className="font-medium">Demo Mode:</span> Enter any valid
              email and password to access the dashboard
            </p>
          </div>

          {/* Trust indicators */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>256-bit Encryption</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>RBI Compliant</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>SOC 2 Certified</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-xs text-muted-foreground">
        Secured by AEGIS &middot; Sapiex Technology
      </p>
    </div>
  );
}
