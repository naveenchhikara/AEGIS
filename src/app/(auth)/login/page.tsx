"use client";

import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Authentication page with login and signup tabs
 *
 * Features:
 * - Tab switching between login and signup
 * - Session check: redirect to dashboard if already authenticated
 * - Clean, centered layout with AEGIS branding
 */
export default function LoginPage() {
  const t = useTranslations("Login");
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

  // Note: Server-side session check is in the (dashboard) layout
  // This page only redirects after successful auth

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4">
      <div className="w-full max-w-md">
        <Tabs
          defaultValue="login"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "login" | "signup")}
          className="w-full"
        >
          {/* Tab list */}
          <TabsList className="grid w-full grid-cols-2 bg-white/50 backdrop-blur-sm">
            <TabsTrigger value="login" className="data-[state=active]:bg-white">
              {t("signIn")}
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="data-[state=active]:bg-white"
            >
              {t("signUp")}
            </TabsTrigger>
          </TabsList>

          {/* Login tab */}
          <TabsContent value="login" className="mt-4">
            <LoginForm />
          </TabsContent>

          {/* Signup tab */}
          <TabsContent value="signup" className="mt-4">
            <SignupForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
