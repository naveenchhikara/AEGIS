import { findings } from "@/data";
import type { FindingsData } from "@/types";
import { FindingDetail } from "@/components/findings/finding-detail";
import { notFound } from "next/navigation";

interface FindingPageProps {
  params: Promise<{ id: string }>;
}

const data = findings as unknown as FindingsData;

export function generateStaticParams() {
  return data.findings.map((f) => ({ id: f.id }));
}

export default async function FindingPage({ params }: FindingPageProps) {
  const { id } = await params;
  const finding = data.findings.find((f) => f.id === id);

  if (!finding) {
    notFound();
  }

  return <FindingDetail finding={finding} />;
}
