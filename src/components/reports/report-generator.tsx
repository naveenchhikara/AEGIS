"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { generateXlsxReport } from "@/actions/reports/generate-xlsx";
import { generatePdfReport } from "@/actions/reports/generate-pdf";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, FileText, Loader2, Download } from "@/lib/icons";
import { toast } from "sonner";

interface ReportGeneratorProps {
  canGenerate: boolean;
  templates: Array<{
    id: string;
    name: string;
    category: string;
    versionNumber: number;
  }>;
}

export function ReportGenerator({ canGenerate, templates }: ReportGeneratorProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [engagementId, setEngagementId] = React.useState("");
  const [selectedTemplate, setSelectedTemplate] = React.useState("");

  const handleGenerateXlsx = async () => {
    if (!engagementId.trim()) {
      toast.error("Please provide an engagement ID");
      return;
    }

    setIsGenerating(true);
    const result = await generateXlsxReport({ engagementId });
    setIsGenerating(false);

    if (result.success) {
      toast.success("XLSX report generated successfully");
      // In production, you'd provide a download link here
      toast.info(`S3 Key: ${result.data.s3Key}`);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleGeneratePdf = async () => {
    if (!engagementId.trim()) {
      toast.error("Please provide an engagement ID");
      return;
    }

    setIsGenerating(true);
    const result = await generatePdfReport({ engagementId });
    setIsGenerating(false);

    if (result.success) {
      toast.success("PDF report generated successfully");
      toast.info(`S3 Key: ${result.data.s3Key}`);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  if (!canGenerate) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          You do not have permission to generate reports.
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="xlsx" className="space-y-4">
      <TabsList>
        <TabsTrigger value="xlsx">XLSX Export</TabsTrigger>
        <TabsTrigger value="pdf">PDF Summary</TabsTrigger>
        <TabsTrigger value="templates">Templates</TabsTrigger>
      </TabsList>

      {/* XLSX Export */}
      <TabsContent value="xlsx">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <CardTitle>Generate XLSX Report</CardTitle>
            </div>
            <CardDescription>
              Export detailed audit data to Excel format (XLSX)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="engagement-xlsx">Audit Engagement ID</Label>
              <Input
                id="engagement-xlsx"
                placeholder="Enter engagement ID (UUID)"
                value={engagementId}
                onChange={(e) => setEngagementId(e.target.value)}
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                Generate a comprehensive audit report with all findings, cash checks, loan reviews, and SMA/NPA data
              </p>
            </div>
            <Button onClick={handleGenerateXlsx} disabled={isGenerating}>
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Generate XLSX
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* PDF Summary */}
      <TabsContent value="pdf">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Generate PDF Summary</CardTitle>
            </div>
            <CardDescription>
              Create an executive summary report in PDF format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="engagement-pdf">Audit Engagement ID</Label>
              <Input
                id="engagement-pdf"
                placeholder="Enter engagement ID (UUID)"
                value={engagementId}
                onChange={(e) => setEngagementId(e.target.value)}
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                Generate a formatted PDF summary for board presentations and executive review
              </p>
            </div>
            <Button onClick={handleGeneratePdf} disabled={isGenerating}>
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <FileText className="mr-2 h-4 w-4" />
              Generate PDF
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Templates */}
      <TabsContent value="templates">
        <Card>
          <CardHeader>
            <CardTitle>Report Templates</CardTitle>
            <CardDescription>
              {templates.length} active report templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No templates configured.
              </p>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div>
                      <p className="font-medium">{template.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {template.category} • v{template.versionNumber}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Use
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
