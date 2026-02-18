"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2 } from "@/lib/icons";
import { toast } from "sonner";

// IS Audit checklist categories
const IS_AUDIT_CHECKLIST = [
  {
    category: "Access Control & Authentication",
    items: [
      { id: "ac-1", text: "Strong password policy enforced (min 8 chars, complexity)" },
      { id: "ac-2", text: "Multi-factor authentication enabled for privileged users" },
      { id: "ac-3", text: "User access reviews conducted quarterly" },
      { id: "ac-4", text: "Segregation of duties properly implemented" },
    ],
  },
  {
    category: "Data Security & Encryption",
    items: [
      { id: "ds-1", text: "Data at rest encrypted (AES-256 or equivalent)" },
      { id: "ds-2", text: "Data in transit encrypted (TLS 1.2+)" },
      { id: "ds-3", text: "Database access logs maintained and reviewed" },
      { id: "ds-4", text: "Sensitive data masking implemented in non-production environments" },
    ],
  },
  {
    category: "Change Management",
    items: [
      { id: "cm-1", text: "Change approval process documented and followed" },
      { id: "cm-2", text: "Testing performed in non-production environment before deployment" },
      { id: "cm-3", text: "Rollback procedures documented and tested" },
      { id: "cm-4", text: "Emergency change procedures defined and authorized" },
    ],
  },
  {
    category: "Business Continuity & Disaster Recovery",
    items: [
      { id: "bc-1", text: "BCP/DR plan documented and approved" },
      { id: "bc-2", text: "Regular backups performed and verified (daily/weekly)" },
      { id: "bc-3", text: "DR drills conducted annually with documented results" },
      { id: "bc-4", text: "RTO/RPO defined and achievable" },
    ],
  },
  {
    category: "Vulnerability & Patch Management",
    items: [
      { id: "vm-1", text: "Vulnerability scans performed quarterly" },
      { id: "vm-2", text: "Critical patches applied within 30 days of release" },
      { id: "vm-3", text: "Antivirus/endpoint protection deployed and updated" },
      { id: "vm-4", text: "Security incident response plan documented" },
    ],
  },
];

export function ChecklistForm() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [checkedItems, setCheckedItems] = React.useState<Record<string, boolean>>({});
  const [comments, setComments] = React.useState<Record<string, string>>({});

  async function handleSave() {
    setIsSubmitting(true);
    // TODO: Implement save checklist action
    toast.success("Audit checklist saved successfully");
    setIsSubmitting(false);
  }

  function calculateCompliance() {
    const totalItems = IS_AUDIT_CHECKLIST.reduce((sum, cat) => sum + cat.items.length, 0);
    const checkedCount = Object.values(checkedItems).filter(Boolean).length;
    if (totalItems === 0) return 0;
    return Math.round((checkedCount / totalItems) * 100);
  }

  const complianceScore = calculateCompliance();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>IS Audit Compliance</CardTitle>
              <CardDescription>Overall security controls compliance</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{complianceScore}%</div>
              <Badge
                variant="outline"
                className={
                  complianceScore >= 90
                    ? "bg-green-100 text-green-800 border-green-300"
                    : complianceScore >= 70
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-red-100 text-red-800 border-red-300"
                }
              >
                {complianceScore >= 90 ? "Strong" : complianceScore >= 70 ? "Adequate" : "Weak"}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {IS_AUDIT_CHECKLIST.map((category) => (
        <Card key={category.category}>
          <CardHeader>
            <CardTitle className="text-lg">{category.category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {category.items.map((item) => (
              <div key={item.id} className="space-y-3 pb-6 border-b last:border-0 last:pb-0">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id={item.id}
                    checked={checkedItems[item.id] || false}
                    onCheckedChange={(checked) =>
                      setCheckedItems((prev) => ({ ...prev, [item.id]: checked === true }))
                    }
                  />
                  <Label
                    htmlFor={item.id}
                    className="text-sm font-normal leading-relaxed cursor-pointer"
                  >
                    {item.text}
                  </Label>
                </div>
                <Textarea
                  placeholder="Findings / Comments / Evidence"
                  value={comments[item.id] || ""}
                  onChange={(e) =>
                    setComments((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                  rows={2}
                  className="ml-7"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Save Checklist
        </Button>
      </div>
    </div>
  );
}
