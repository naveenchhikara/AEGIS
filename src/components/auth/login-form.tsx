"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Shield, Globe, Building2 } from "lucide-react";
import Image from "next/image";
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
  const [focusedField, setFocusedField] = useState<string | null>(null);

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
    <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm overflow-hidden animate-fade-in-up">
      {/* Top accent bar with gradient */}
      <div className="h-1.5 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500" />

      <CardHeader className="relative pb-6 pt-10 px-8 space-y-5">
        {/* Language selector - positioned absolutely in top right */}
        <div className="absolute right-5 top-5 z-10 opacity-0 animate-fade-in-up animation-delay-100" style={{ opacity: 1 }}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-9 px-3 text-xs font-medium hover:bg-blue-50 hover:border-blue-200 transition-colors border-slate-200"
              >
                <Globe className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{selectedLanguage.label}</span>
                <span className="hidden sm:inline text-slate-600">{selectedLanguage.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px] border-slate-200">
              {Object.values(LANGUAGES).map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className="gap-3 cursor-pointer text-sm"
                >
                  <span className="text-xs font-medium text-slate-500">{lang.label}</span>
                  <span className="text-slate-700">{lang.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Logo and title with professional branding */}
        <div className="flex flex-col items-center pt-3 opacity-0 animate-fade-in-up animation-delay-200" style={{ opacity: 1 }}>
          <div className="flex flex-col items-center gap-4 mb-4">
            {/* AEGIS Logo */}
            <div className="relative">
              <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-xl shadow-blue-600/30 border border-blue-500/20">
                <Image
                  src="/logos/aegis-mark.png"
                  alt="AEGIS"
                  width={48}
                  height={48}
                  className="object-contain"
                  priority
                />
              </div>
              {/* Subtle glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl blur opacity-20 -z-10" />
            </div>

            {/* Brand text */}
            <div className="text-center">
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-1">{APP_NAME}</h1>
              <p className="text-sm text-blue-600 font-semibold tracking-wide uppercase">{APP_TAGLINE}</p>
            </div>
          </div>
        </div>

        {/* Welcome message with institutional trust indicators */}
        <div className="space-y-2 text-center pt-3 opacity-0 animate-fade-in-up animation-delay-300" style={{ opacity: 1 }}>
          <CardTitle className="text-2xl font-semibold text-slate-900 tracking-tight">Secure Login</CardTitle>
          <CardDescription className="text-base text-slate-600 font-normal">
            Access your audit and compliance dashboard
          </CardDescription>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5 px-8 pb-2">
          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3.5 text-sm text-red-800 flex items-start gap-2.5 shadow-sm">
              <Shield className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Email field with enhanced styling */}
          <div className="space-y-2.5 opacity-0 animate-fade-in-up animation-delay-300" style={{ opacity: 1 }}>
            <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email Address</Label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail className={`h-4.5 w-4.5 transition-colors duration-200 ${focusedField === 'email' ? 'text-blue-600' : 'text-slate-400 group-focus-within:text-blue-600'}`} />
              </div>
              <Input
                id="email"
                type="email"
                placeholder="your.email@ucb.co.in"
                className="pl-11 h-11 text-sm border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-slate-50/50 focus:bg-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                required
              />
            </div>
          </div>

          {/* Password field with enhanced styling */}
          <div className="space-y-2.5 opacity-0 animate-fade-in-up animation-delay-300" style={{ opacity: 1 }}>
            <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className={`h-4.5 w-4.5 transition-colors duration-200 ${focusedField === 'password' ? 'text-blue-600' : 'text-slate-400 group-focus-within:text-blue-600'}`} />
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                className="pl-11 h-11 text-sm border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-slate-50/50 focus:bg-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                required
              />
            </div>
          </div>

          {/* MFA field with professional styling */}
          <div className="space-y-2.5 opacity-0 animate-fade-in-up animation-delay-300" style={{ opacity: 1 }}>
            <Label htmlFor="mfa" className="text-sm font-semibold text-slate-700">Two-Factor Authentication</Label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Shield className={`h-4.5 w-4.5 transition-colors duration-200 ${focusedField === 'mfa' ? 'text-blue-600' : 'text-slate-400 group-focus-within:text-blue-600'}`} />
              </div>
              <Input
                id="mfa"
                type="text"
                placeholder="000 000"
                inputMode="numeric"
                pattern="[0-9]*"
                className="pl-11 h-11 text-sm tracking-[0.2em] font-mono border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-slate-50/50 focus:bg-white text-center"
                value={mfaCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                  setMfaCode(val);
                }}
                onFocus={() => setFocusedField('mfa')}
                onBlur={() => setFocusedField(null)}
                maxLength={6}
              />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed pl-1 flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-blue-600" />
              Enter the 6-digit code from your authenticator app
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 px-8 pb-8 pt-4">
          {/* Primary CTA button with enhanced styling */}
          <Button
            type="submit"
            size="lg"
            className="w-full h-11.5 text-sm font-bold bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white shadow-lg shadow-blue-700/30 hover:shadow-xl hover:shadow-blue-700/40 transition-all duration-200 border border-blue-600/50"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2.5">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Authenticating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Sign In Securely
              </span>
            )}
          </Button>

          {/* Demo notice with professional trust styling */}
          <div className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-50 to-blue-50/50 border border-blue-200/50 shadow-sm">
            <Building2 className="h-4 w-4 text-blue-700" />
            <div className="text-left">
              <p className="text-xs text-blue-900 font-semibold">Demo Environment</p>
              <p className="text-[11px] text-blue-700 leading-tight">Any valid email credentials work</p>
            </div>
          </div>
        </CardFooter>
      </form>

      {/* Footer policy notice with professional styling */}
      <div className="px-8 pb-6 pt-4 border-t border-slate-200/80 bg-slate-50/50">
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <Shield className="h-3.5 w-3.5 text-blue-600" />
          <p className="text-[11px] text-slate-600 font-medium uppercase tracking-wide">
            Secured by Enterprise-Grade Encryption
          </p>
        </div>
        <p className="text-center text-[11px] text-slate-500 leading-relaxed">
          By signing in, you agree to the{" "}
          <a href="#" className="text-blue-700 hover:text-blue-900 underline underline-offset-2 font-medium transition-colors">
            UCB Information Security Policy
          </a>{" "}
          and{" "}
          <a href="#" className="text-blue-700 hover:text-blue-900 underline underline-offset-2 font-medium transition-colors">
            Acceptable Use Guidelines
          </a>
        </p>
      </div>

      {/* Bottom accent bar */}
      <div className="h-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
    </Card>
  );
}
