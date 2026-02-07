import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to dashboard for authenticated users
  // In production, this would check authentication state
  redirect("/dashboard");
}
