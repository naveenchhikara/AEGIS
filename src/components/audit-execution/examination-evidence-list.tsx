"use client";

import { useState } from "react";
import { format } from "date-fns";
import { FileText, Download, Loader2 } from "@/lib/icons";
import { Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getExaminationEvidenceDownloadUrl } from "@/actions/audit-execution/upload-examination-evidence";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Evidence {
  id: string;
  filename: string;
  fileSize: number;
  contentType: string;
  description: string | null;
  createdAt: Date;
  uploadedBy: { id: string; name: string };
}

interface ExaminationEvidenceListProps {
  evidence: Evidence[];
  engagementId: string;
  responseId: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith("image/")) {
    return <Image className="h-5 w-5 text-blue-600" />;
  }
  return <FileText className="h-5 w-5 text-muted-foreground" />;
}

function getFileTypeLabel(contentType: string): string {
  const typeMap: Record<string, string> = {
    "application/pdf": "PDF",
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  };
  return typeMap[contentType] || "File";
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ExaminationEvidenceList({
  evidence,
  engagementId,
  responseId,
}: ExaminationEvidenceListProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (evidenceId: string, filename: string) => {
    setDownloadingId(evidenceId);

    try {
      const result = await getExaminationEvidenceDownloadUrl(evidenceId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      // Trigger download by opening presigned URL
      const link = document.createElement("a");
      link.href = result.data.downloadUrl;
      link.download = filename;
      link.click();

      toast.success("Download started");
    } catch (error) {
      toast.error("Failed to download file");
    } finally {
      setDownloadingId(null);
    }
  };

  if (evidence.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">No evidence attached</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {evidence.map((item) => {
        const isDownloading = downloadingId === item.id;
        const fileTypeLabel = getFileTypeLabel(item.contentType);

        return (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50"
          >
            {/* File icon */}
            <div className="flex-shrink-0">{getFileIcon(item.contentType)}</div>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{item.filename}</p>
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {fileTypeLabel}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatFileSize(item.fileSize)}</span>
                <span>•</span>
                <span>
                  Uploaded by {item.uploadedBy.name}
                </span>
                <span>•</span>
                <span>
                  {format(new Date(item.createdAt), "MMM d, yyyy")}
                </span>
              </div>
              {item.description && (
                <p className="mt-1 text-xs text-muted-foreground italic">
                  {item.description}
                </p>
              )}
            </div>

            {/* Download button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDownload(item.id, item.filename)}
              disabled={isDownloading}
              className="flex-shrink-0"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
