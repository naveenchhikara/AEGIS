"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Mail, Shield } from "@/lib/icons";

export function LoginForm() {
  const router = useRouter();
  const t = useTranslations("Login");
  const tCommon = useTranslations("Common");
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
              <span className="text-foreground text-xl font-bold tracking-wide">
                {tCommon("appName")}
              </span>
              <span className="text-muted-foreground text-xs tracking-widest">
                {tCommon("companyName")}
              </span>
            </div>
            <p className="text-muted-foreground text-center text-sm">
              {tCommon("appTagline")}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                {t("emailAddress")}
              </Label>
              <div className="relative">
                <Mail className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
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
                {t("password")}
              </Label>
              <div className="relative">
                <Lock className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  id="password"
                  type="password"
                  placeholder={t("passwordPlaceholder")}
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
                {t("mfaCode")}{" "}
                <span className="text-muted-foreground">
                  ({tCommon("optional")})
                </span>
              </Label>
              <div className="relative">
                <Shield className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  id="mfa"
                  type="text"
                  inputMode="numeric"
                  placeholder={t("mfaDigitPlaceholder")}
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
              {isLoading ? t("signingIn") : t("signIn")}
            </Button>
          </form>

          {/* Demo hint */}
          <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
            <p className="text-center text-xs text-blue-700">
              <span className="font-medium">{tCommon("demoMode")}:</span>{" "}
              {tCommon("demoHint")}
            </p>
          </div>

          {/* Trust indicators */}
          <div className="mt-4 flex items-center justify-center">
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <Shield className="h-3 w-3" />
              <span>RBI Compliant</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-muted-foreground text-xs">
        {tCommon("securedBy")} &middot; {tCommon("companyName")}
      </p>
    </div>
  );
}
