import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login - AEGIS",
  description: "Sign in to access the UCB Internal Audit & Compliance Platform",
};

export default function LoginPage() {
  return (
    <div className="w-full flex flex-col items-center">
      <LoginForm />
      <footer className="mt-8 text-center text-xs text-muted-foreground">
        <p>&copy; 2026 AEGIS. All rights reserved.</p>
      </footer>
    </div>
  );
}
