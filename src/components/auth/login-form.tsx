"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANGUAGES, type LanguageCode, APP_NAME, APP_TAGLINE } from "@/lib/constants";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError("");

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    // Demo authentication - redirect to dashboard on valid email
    setTimeout(() => {
      router.push("/dashboard");
    }, 500);
  };

  const selectedLanguage = LANGUAGES[language];

  return (
    <Card className="w-full shadow-xl border border-border/60 bg-card overflow-hidden">
      {/* Top accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-blue-600 to-blue-500" />

      <CardHeader className="relative pb-4 pt-8 px-8 space-y-4">
        {/* Language selector - positioned absolutely in top right */}
        <div className="absolute right-4 top-4 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-9 px-3 text-sm hover:bg-accent border-border/60"
              >
                <Globe className="h-4 w-4" />
                <span>{selectedLanguage.flag}</span>
                <span className="hidden sm:inline">{selectedLanguage.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              {Object.values(LANGUAGES).map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className="gap-3 cursor-pointer"
                >
                  <span className="text-base">{lang.flag}</span>
                  <span>{lang.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Logo and title */}
        <div className="flex flex-col items-center pt-2">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">{APP_NAME}</h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-medium">{APP_TAGLINE}</p>
        </div>

        {/* Title and description */}
        <div className="space-y-1 text-center pt-2">
          <CardTitle className="text-2xl font-semibold tracking-tight">Welcome back</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Sign in to access your dashboard
          </CardDescription>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 px-8">
          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-start gap-2">
              <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Email field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-foreground">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground pointer-events-none" />
              <Input
                id="email"
                type="email"
                placeholder="your.email@ucb.co.in"
                className="pl-11 h-11 text-sm border-input/80 focus:border-primary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold text-foreground">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground pointer-events-none" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="pl-11 h-11 text-sm border-input/80 focus:border-primary"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* MFA field */}
          <div className="space-y-2">
            <Label htmlFor="mfa" className="text-sm font-semibold text-foreground">Two-factor authentication</Label>
            <div className="relative">
              <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground pointer-events-none" />
              <Input
                id="mfa"
                type="text"
                placeholder="000 000"
                inputMode="numeric"
                pattern="[0-9]*"
                className="pl-11 h-11 text-sm tracking-[0.2em] font-mono border-input/80 focus:border-primary"
                value={mfaCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                  setMfaCode(val);
                }}
                maxLength={6}
              />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pl-1">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 px-8 pb-8 pt-2">
          <Button
            type="submit"
            size="lg"
            className="w-full h-11 text-base font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 cursor-pointer transition-all duration-200"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign in to your account"
            )}
          </Button>

          {/* Demo notice - styled as secondary info */}
          <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
            <Shield className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
              Demo mode — Any valid email works
            </p>
          </div>
        </CardFooter>
      </form>

      {/* Footer policy notice */}
      <div className="px-8 pb-6 pt-2 border-t border-border/40">
        <p className="text-center text-xs text-muted-foreground leading-relaxed">
          By signing in, you agree to the{" "}
          <a href="#" className="underline hover:text-foreground transition-colors">
            UCB Information Security Policy
          </a>
        </p>
      </div>
    </Card>
  );
}
