"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { LANGUAGES, type LanguageCode } from "@/lib/constants";
import { Lock, Mail, Shield } from "@/lib/icons";

export function LoginForm() {
  const router = useRouter();
  const [language, setLanguage] = useState<LanguageCode>("en");
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
      {/* Language pills */}
      <div className="flex gap-1 rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm backdrop-blur-sm">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
              language === lang.code
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {lang.short}
          </button>
        ))}
      </div>

      {/* Login card */}
      <Card className="w-full border-0 bg-white/70 shadow-xl shadow-slate-200/50 backdrop-blur-md">
        <CardContent className="p-8">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <Image
              src="/logos/aegis-logo.png"
              alt="AEGIS"
              width={180}
              height={60}
              className="h-14 w-auto"
              priority
            />
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
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-xs text-muted-foreground">
        Secured by AEGIS &middot; Sapiex Technology
      </p>
    </div>
  );
}
