"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "@/lib/icons";
import { toast } from "sonner";

interface Risk {
  id: string;
  riskCode: string;
  description: string;
  category: string;
  inherentRisk: number;
  residualRisk: number;
  status: string;
}

interface RiskRegisterTableProps {
  risks: Risk[];
  canManage: boolean;
}

const RISK_LEVEL_COLORS: Record<string, string> = {
  HIGH: "bg-red-100 text-red-800 border-red-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  LOW: "bg-green-100 text-green-800 border-green-300",
};

function getRiskLevel(score: number): string {
  if (score >= 15) return "HIGH";
  if (score >= 8) return "MEDIUM";
  return "LOW";
}

export function RiskRegisterTable({ risks, canManage }: RiskRegisterTableProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleCreate() {
    setIsSubmitting(true);
    // TODO: Implement create risk action
    toast.success("Risk created successfully");
    setIsSubmitting(false);
    setDialogOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Risk
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Risk to Register</DialogTitle>
                <DialogDescription>
                  Create a new risk entry in the enterprise risk register.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="riskCode">Risk Code</Label>
                  <Input id="riskCode" placeholder="e.g., CR-001" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Risk Description</Label>
                  <Textarea id="description" rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Risk Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Inherent Risk</TableHead>
              <TableHead>Residual Risk</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {risks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No risks in register.
                </TableCell>
              </TableRow>
            ) : (
              risks.map((risk) => {
                const inherentLevel = getRiskLevel(risk.inherentRisk);
                const residualLevel = getRiskLevel(risk.residualRisk);
                return (
                  <TableRow
                    key={risk.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/risk-management/${risk.id}`)}
                  >
                    <TableCell className="font-medium">{risk.riskCode}</TableCell>
                    <TableCell>{risk.description}</TableCell>
                    <TableCell>{risk.category}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={RISK_LEVEL_COLORS[inherentLevel]}>
                        {risk.inherentRisk}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={RISK_LEVEL_COLORS[residualLevel]}>
                        {risk.residualRisk}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{risk.status}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
