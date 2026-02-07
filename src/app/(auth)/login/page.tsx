import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login - AEGIS",
  description: "Sign in to access the UCB Internal Audit & Compliance Platform",
};

export default function LoginPage() {
  return (
    <div className="w-full max-w-md px-4">
      <LoginForm />
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>&copy; 2026 {process.env.NEXT_PUBLIC_APP_NAME || "AEGIS"}. All rights reserved.</p>
        <p className="mt-1 text-xs">UCB Internal Audit & Compliance Platform</p>
      </footer>
    </div>
  );
}
