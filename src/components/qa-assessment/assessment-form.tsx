"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2 } from "@/lib/icons";
import { toast } from "sonner";

interface AssessmentFormProps {
  assessment: any;
  canManage: boolean;
}

// IIA Standards categories and sample questions
const IIA_STANDARDS = [
  {
    code: "1000",
    title: "Purpose, Authority, and Responsibility",
    questions: [
      {
        id: "1000-1",
        text: "Is the internal audit charter documented and approved by senior management and the board?",
      },
      {
        id: "1000-2",
        text: "Does the charter define the internal audit activity's position within the organization?",
      },
    ],
  },
  {
    code: "1100",
    title: "Independence and Objectivity",
    questions: [
      {
        id: "1100-1",
        text: "Does the internal audit activity remain free from interference in determining scope, performing work, and communicating results?",
      },
      {
        id: "1100-2",
        text: "Do internal auditors refrain from auditing operations for which they were previously responsible?",
      },
    ],
  },
  {
    code: "1200",
    title: "Proficiency and Due Professional Care",
    questions: [
      {
        id: "1200-1",
        text: "Does the internal audit activity collectively possess the knowledge, skills, and competencies needed?",
      },
      {
        id: "1200-2",
        text: "Do internal auditors apply the care and skill expected of a reasonably prudent and competent internal auditor?",
      },
    ],
  },
];

export function AssessmentForm({ assessment, canManage }: AssessmentFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [responses, setResponses] = React.useState<Record<string, string>>({});
  const [comments, setComments] = React.useState<Record<string, string>>({});

  async function handleSave() {
    setIsSubmitting(true);
    // TODO: Implement save assessment action
    toast.success("Assessment saved successfully");
    setIsSubmitting(false);
  }

  function calculateCompliance() {
    const totalQuestions = IIA_STANDARDS.reduce((sum, std) => sum + std.questions.length, 0);
    const compliantCount = Object.values(responses).filter((r) => r === "YES").length;
    if (totalQuestions === 0) return 0;
    return Math.round((compliantCount / totalQuestions) * 100);
  }

  const complianceScore = calculateCompliance();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Compliance Score</CardTitle>
              <CardDescription>Overall IIA Standards compliance</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{complianceScore}%</div>
              <Badge
                variant="outline"
                className={
                  complianceScore >= 80
                    ? "bg-green-100 text-green-800 border-green-300"
                    : complianceScore >= 60
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-red-100 text-red-800 border-red-300"
                }
              >
                {complianceScore >= 80 ? "Generally Conforms" : complianceScore >= 60 ? "Partially Conforms" : "Does Not Conform"}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {IIA_STANDARDS.map((standard) => (
        <Card key={standard.code}>
          <CardHeader>
            <CardTitle className="text-lg">
              {standard.code} — {standard.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {standard.questions.map((question) => (
              <div key={question.id} className="space-y-3 pb-6 border-b last:border-0 last:pb-0">
                <Label className="text-sm font-normal leading-relaxed">{question.text}</Label>
                <RadioGroup
                  value={responses[question.id]}
                  onValueChange={(value) =>
                    setResponses((prev) => ({ ...prev, [question.id]: value }))
                  }
                  disabled={!canManage}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="YES" id={`${question.id}-yes`} />
                    <Label htmlFor={`${question.id}-yes`} className="font-normal cursor-pointer">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PARTIAL" id={`${question.id}-partial`} />
                    <Label htmlFor={`${question.id}-partial`} className="font-normal cursor-pointer">
                      Partial
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="NO" id={`${question.id}-no`} />
                    <Label htmlFor={`${question.id}-no`} className="font-normal cursor-pointer">
                      No
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="NA" id={`${question.id}-na`} />
                    <Label htmlFor={`${question.id}-na`} className="font-normal cursor-pointer">
                      N/A
                    </Label>
                  </div>
                </RadioGroup>
                <Textarea
                  placeholder="Comments / Evidence"
                  value={comments[question.id] || ""}
                  onChange={(e) =>
                    setComments((prev) => ({ ...prev, [question.id]: e.target.value }))
                  }
                  disabled={!canManage}
                  rows={2}
                  className="mt-2"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {canManage && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Assessment
          </Button>
        </div>
      )}
    </div>
  );
}
