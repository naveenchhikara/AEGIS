"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "@/lib/icons";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { toast } from "sonner";
import { manageRisk } from "@/actions/risk-management/manage-risk";

interface Risk {
  id: string;
  riskStatement: string;
  riskCategory: string;
  inherentScore: number;
  controlScore: number;
  residualScore: number;
  status: string;
  riskOwner?: string | null;
  entity: {
    id: string;
    name: string;
    entityType: string;
  };
  kris?: Array<{
    id: string;
    name: string;
    breachStatus: string;
    currentValue: number | null;
  }>;
}

interface Entity {
  id: string;
  name: string;
  entityType: string;
}

interface RiskRegisterTableProps {
  risks: Risk[];
  entities: Entity[];
  canManage: boolean;
}

const RISK_LEVEL_COLORS: Record<string, string> = {
  HIGH: "bg-red-100 text-red-800 border-red-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  LOW: "bg-green-100 text-green-800 border-green-300",
};

function getRiskLevel(score: number): string {
  if (score >= 4) return "HIGH";
  if (score >= 2.5) return "MEDIUM";
  return "LOW";
}

type FormState = {
  success?: boolean;
  error?: string;
  data?: { id: string };
};

export function RiskRegisterTable({
  risks,
  entities,
  canManage,
}: RiskRegisterTableProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    entityId: "",
    riskStatement: "",
    riskCategory: "OPERATIONAL",
    inherentScore: 3,
    controlScore: 3,
    riskOwner: "",
    mitigationPlan: "",
  });

  async function submitAction(
    _prev: FormState,
    formData: FormData,
  ): Promise<FormState> {
    const input = {
      entityId: formData.get("entityId") as string,
      riskStatement: formData.get("riskStatement") as string,
      riskCategory: formData.get("riskCategory") as
        | "CREDIT"
        | "OPERATIONAL"
        | "MARKET"
        | "LIQUIDITY"
        | "COMPLIANCE"
        | "IT",
      inherentScore: Number(formData.get("inherentScore")),
      controlScore: Number(formData.get("controlScore")),
      riskOwner: (formData.get("riskOwner") as string) || undefined,
      mitigationPlan: (formData.get("mitigationPlan") as string) || undefined,
    };

    return manageRisk(input);
  }

  const [state, formAction, isPending] = useActionState(submitAction, {});

  // Handle success/error feedback
  React.useEffect(() => {
    if (state.success) {
      toast.success("Risk created successfully");
      setDialogOpen(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

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
            <DialogContent className="max-w-2xl">
              <form action={formAction}>
                <DialogHeader>
                  <DialogTitle>Add Risk to Register</DialogTitle>
                  <DialogDescription>
                    Create a new risk entry in the enterprise risk register.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="entityId">Entity</Label>
                    <Select
                      name="entityId"
                      defaultValue={formData.entityId}
                      required
                    >
                      <SelectTrigger id="entityId">
                        <SelectValue placeholder="Select entity" />
                      </SelectTrigger>
                      <SelectContent>
                        {entities.map((entity) => (
                          <SelectItem key={entity.id} value={entity.id}>
                            {entity.name} ({entity.entityType})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="riskStatement">Risk Statement</Label>
                    <Textarea
                      id="riskStatement"
                      name="riskStatement"
                      placeholder="Describe the risk..."
                      rows={3}
                      defaultValue={formData.riskStatement}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="riskCategory">Risk Category</Label>
                      <Select
                        name="riskCategory"
                        defaultValue={formData.riskCategory}
                        required
                      >
                        <SelectTrigger id="riskCategory">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CREDIT">Credit</SelectItem>
                          <SelectItem value="OPERATIONAL">
                            Operational
                          </SelectItem>
                          <SelectItem value="MARKET">Market</SelectItem>
                          <SelectItem value="LIQUIDITY">Liquidity</SelectItem>
                          <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                          <SelectItem value="IT">IT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="riskOwner">Risk Owner (Optional)</Label>
                      <Input
                        id="riskOwner"
                        name="riskOwner"
                        placeholder="e.g., Branch Manager"
                        defaultValue={formData.riskOwner}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="inherentScore">
                        Inherent Score (1-5)
                      </Label>
                      <Input
                        id="inherentScore"
                        name="inherentScore"
                        type="number"
                        min={1}
                        max={5}
                        step={0.1}
                        defaultValue={formData.inherentScore}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="controlScore">Control Score (1-5)</Label>
                      <Input
                        id="controlScore"
                        name="controlScore"
                        type="number"
                        min={1}
                        max={5}
                        step={0.1}
                        defaultValue={formData.controlScore}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mitigationPlan">
                      Mitigation Plan (Optional)
                    </Label>
                    <Textarea
                      id="mitigationPlan"
                      name="mitigationPlan"
                      placeholder="Describe mitigation strategies..."
                      rows={2}
                      defaultValue={formData.mitigationPlan}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entity</TableHead>
              <TableHead>Risk Statement</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Inherent</TableHead>
              <TableHead>Residual</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>KRIs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {risks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyStateCard
                    variant="inline"
                    title="No risks in register"
                    message={
                      canManage
                        ? "Click 'Add Risk' to create one."
                        : "No risk entries have been added yet."
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              risks.map((risk) => {
                const inherentLevel = getRiskLevel(Number(risk.inherentScore));
                const residualLevel = getRiskLevel(Number(risk.residualScore));
                const breachedKris =
                  risk.kris?.filter((k) => k.breachStatus === "BREACH")
                    .length || 0;

                return (
                  <TableRow
                    key={risk.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/risk-management/${risk.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/risk-management/${risk.id}`);
                      }
                    }}
                  >
                    <TableCell className="font-medium">
                      {risk.entity.name}
                      <div className="text-muted-foreground text-xs">
                        {risk.entity.entityType}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {risk.riskStatement}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{risk.riskCategory}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={RISK_LEVEL_COLORS[inherentLevel]}
                      >
                        {Number(risk.inherentScore).toFixed(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={RISK_LEVEL_COLORS[residualLevel]}
                      >
                        {Number(risk.residualScore).toFixed(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{risk.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {risk.kris && risk.kris.length > 0 ? (
                        <div className="flex items-center gap-1">
                          <span className="text-sm">{risk.kris.length}</span>
                          {breachedKris > 0 && (
                            <Badge
                              variant="outline"
                              className="border-red-300 bg-red-100 text-xs text-red-800"
                            >
                              {breachedKris} ⚠
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
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
