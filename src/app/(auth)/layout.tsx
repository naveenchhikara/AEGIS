import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AEGIS - Login",
  description: "UCB Internal Audit & Compliance Platform",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100/80 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-50/40 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
      </div>

      <div className={inter.className + " relative z-10 w-full flex justify-center"}>
        {children}
      </div>
    </div>
  );
}
