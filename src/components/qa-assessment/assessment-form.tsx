"use client";

import * as React from "react";
import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2, Plus } from "@/lib/icons";
import { toast } from "sonner";
import { manageQaAssessment, createQaAssessmentsFromTemplate } from "@/actions/qa-assessment/manage-assessment";

interface AssessmentFormProps {
  assessments: Array<{
    id: string;
    assessmentYear: number;
    iiaStandard: string;
    question: string;
    response: string | null;
    evidence: string | null;
    gapIdentified: boolean;
    issueCreated: boolean;
  }>;
  summary: {
    total: number;
    conforms: number;
    partiallyConforms: number;
    doesNotConform: number;
    notApplicable: number;
    gapsIdentified: number;
    issuesCreated: number;
  };
  canManage: boolean;
}

// IIA Standards template for initialization
const IIA_STANDARDS_TEMPLATE = [
  {
    iiaStandard: "1000",
    question: "Is the internal audit charter documented and approved by senior management and the board?",
  },
  {
    iiaStandard: "1000",
    question: "Does the charter define the internal audit activity's position within the organization?",
  },
  {
    iiaStandard: "1100",
    question: "Does the internal audit activity remain free from interference in determining scope, performing work, and communicating results?",
  },
  {
    iiaStandard: "1100",
    question: "Do internal auditors refrain from auditing operations for which they were previously responsible?",
  },
  {
    iiaStandard: "1200",
    question: "Does the internal audit activity collectively possess the knowledge, skills, and competencies needed?",
  },
  {
    iiaStandard: "1200",
    question: "Do internal auditors apply the care and skill expected of a reasonably prudent and competent internal auditor?",
  },
  {
    iiaStandard: "1300",
    question: "Has a quality assurance and improvement program been developed and maintained?",
  },
  {
    iiaStandard: "2000",
    question: "Does the CAE effectively manage the internal audit activity to ensure it adds value to the organization?",
  },
  {
    iiaStandard: "2100",
    question: "Does the internal audit activity evaluate and contribute to the improvement of governance processes?",
  },
  {
    iiaStandard: "2200",
    question: "Are engagements performed with proficiency and due professional care?",
  },
];

export function AssessmentForm({ assessments, summary, canManage }: AssessmentFormProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editResponse, setEditResponse] = React.useState<string>("");
  const [editEvidence, setEditEvidence] = React.useState<string>("");
  const [isInitializing, setIsInitializing] = React.useState(false);

  // Group assessments by IIA standard category
  const groupedAssessments = React.useMemo(() => {
    const groups: Record<string, typeof assessments> = {};
    assessments.forEach((assessment) => {
      const category = assessment.iiaStandard.substring(0, 1) + "000";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(assessment);
    });
    return groups;
  }, [assessments]);

  const handleEdit = (assessment: typeof assessments[0]) => {
    setEditingId(assessment.id);
    setEditResponse(assessment.response || "");
    setEditEvidence(assessment.evidence || "");
  };

  const handleSave = async (assessment: typeof assessments[0]) => {
    const result = await manageQaAssessment({
      id: assessment.id,
      assessmentYear: assessment.assessmentYear,
      iiaStandard: assessment.iiaStandard,
      question: assessment.question,
      response: editResponse as any,
      evidence: editEvidence,
    });

    if (result.success) {
      toast.success("Assessment updated successfully");
      setEditingId(null);
    } else {
      toast.error(result.error);
    }
  };

  const handleInitialize = async () => {
    setIsInitializing(true);
    const currentYear = new Date().getFullYear();
    
    const result = await createQaAssessmentsFromTemplate(
      currentYear,
      IIA_STANDARDS_TEMPLATE
    );

    if (result.success) {
      toast.success(`Created ${result.data.created} assessment questions`);
    } else {
      toast.error(result.error);
    }
    setIsInitializing(false);
  };

  const conformanceRate = summary.total > 0
    ? Math.round((summary.conforms / summary.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Conformance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conformanceRate}%</div>
            <Badge
              variant="outline"
              className={
                conformanceRate >= 80
                  ? "mt-2 bg-green-100 text-green-800 border-green-300"
                  : conformanceRate >= 60
                    ? "mt-2 bg-amber-100 text-amber-800 border-amber-300"
                    : "mt-2 bg-red-100 text-red-800 border-red-300"
              }
            >
              {conformanceRate >= 80
                ? "Generally Conforms"
                : conformanceRate >= 60
                  ? "Partially Conforms"
                  : "Does Not Conform"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Gaps Identified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.gapsIdentified}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.issuesCreated} converted to issues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {canManage && (
              <Button
                onClick={handleInitialize}
                disabled={isInitializing || assessments.length > 0}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {isInitializing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Plus className="mr-2 h-4 w-4" />
                Initialize from Template
              </Button>
            )}
            {assessments.length === 0 && !canManage && (
              <p className="text-xs text-muted-foreground">No assessments yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assessment Table by Standard Category */}
      {Object.entries(groupedAssessments).map(([category, categoryAssessments]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">IIA Standard {category}</CardTitle>
            <CardDescription>
              {categoryAssessments.length} questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Standard</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead className="w-[180px]">Response</TableHead>
                  <TableHead className="w-[200px]">Evidence</TableHead>
                  <TableHead className="w-[80px]">Gap?</TableHead>
                  <TableHead className="w-[80px]">Issue?</TableHead>
                  {canManage && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryAssessments.map((assessment) => {
                  const isEditing = editingId === assessment.id;
                  return (
                    <TableRow key={assessment.id}>
                      <TableCell className="font-mono text-xs">
                        {assessment.iiaStandard}
                      </TableCell>
                      <TableCell className="text-sm">{assessment.question}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select value={editResponse} onValueChange={setEditResponse}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select response" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CONFORMS">Conforms</SelectItem>
                              <SelectItem value="PARTIALLY_CONFORMS">Partially Conforms</SelectItem>
                              <SelectItem value="DOES_NOT_CONFORM">Does Not Conform</SelectItem>
                              <SelectItem value="NOT_APPLICABLE">Not Applicable</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {assessment.response
                              ? assessment.response.replace(/_/g, " ")
                              : "Not Answered"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Textarea
                            value={editEvidence}
                            onChange={(e) => setEditEvidence(e.target.value)}
                            rows={2}
                            className="text-xs"
                          />
                        ) : (
                          <p className="text-xs text-muted-foreground truncate">
                            {assessment.evidence || "—"}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {assessment.gapIdentified && (
                          <Badge variant="destructive" className="text-xs">
                            Yes
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {assessment.issueCreated && (
                          <Badge variant="secondary" className="text-xs">
                            Created
                          </Badge>
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          {isEditing ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSave(assessment)}
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(assessment)}
                            >
                              Edit
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {assessments.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No QA assessments found for the current year.</p>
            {canManage && (
              <p className="mt-2 text-sm">
                Click "Initialize from Template" to create the standard assessment questions.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
