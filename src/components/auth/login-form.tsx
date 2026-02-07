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

  const handleSubmit = (e: React.FormEvent) => {
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
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-4">
        {/* Logo placeholder */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">{APP_NAME}</h1>
              <p className="text-xs text-muted-foreground">{APP_TAGLINE}</p>
            </div>
          </div>
        </div>

        {/* Language selector */}
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Globe className="h-4 w-4" />
                <span>{selectedLanguage.flag} {selectedLanguage.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {Object.values(LANGUAGES).map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className="gap-2"
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CardTitle className="text-center text-xl">Sign in to your account</CardTitle>
        <CardDescription className="text-center">
          Enter your credentials to access the audit platform
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Error message */}
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Email field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="your.email@ucb.co.in"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                className="pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* MFA field */}
          <div className="space-y-2">
            <Label htmlFor="mfa">MFA Code</Label>
            <div className="relative">
              <Shield className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="mfa"
                type="text"
                placeholder="Enter code from authenticator app"
                className="pl-9"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                maxLength={6}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <p>Demo: Enter any valid email to continue</p>
          </div>
        </CardFooter>
      </form>

      <div className="px-6 pb-6">
        <p className="text-center text-xs text-muted-foreground">
          By signing in, you agree to the UCB Information Security Policy
        </p>
      </div>
    </Card>
  );
}
