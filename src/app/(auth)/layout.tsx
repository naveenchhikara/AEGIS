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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className={inter.className}>
        {children}
      </div>
    </div>
  );
}
