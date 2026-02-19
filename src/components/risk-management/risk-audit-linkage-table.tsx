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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Link as LinkIcon } from "@/lib/icons";
import { toast } from "sonner";
import { manageRiskAuditLinkage } from "@/actions/risk-management/manage-linkage";

interface LinkageData {
  id: string;
  thematicArea: string;
  linkageType: string;
  entity: {
    id: string;
    name: string;
    entityType: string;
  };
  riskRegister: {
    id: string;
    riskStatement: string;
    riskCategory: string;
    residualScore: number;
  };
  engagement: {
    id: string;
    auditNumber: string | null;
    status: string;
  } | null;
}

interface RiskAuditLinkageTableProps {
  linkages: LinkageData[];
  entities: Array<{ id: string; name: string; entityType: string }>;
  risks: Array<{
    id: string;
    riskStatement: string;
    entityId: string;
    residualScore: number;
  }>;
  engagements: Array<{ id: string; auditNumber: string | null }>;
  canManage: boolean;
}

type FormState = {
  success?: boolean;
  error?: string;
};

async function submitLinkageAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const input = {
    entityId: formData.get("entityId") as string,
    riskRegisterId: formData.get("riskRegisterId") as string,
    engagementId: (formData.get("engagementId") as string) || undefined,
    thematicArea: formData.get("thematicArea") as any,
    linkageType: (formData.get("linkageType") as any) || undefined,
  };

  return manageRiskAuditLinkage(input);
}

export function RiskAuditLinkageTable({
  linkages,
  entities,
  risks,
  engagements,
  canManage,
}: RiskAuditLinkageTableProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedEntity, setSelectedEntity] = React.useState<string>("");
  const [state, formAction, isPending] = useActionState(
    submitLinkageAction,
    {},
  );

  // Filter risks based on selected entity
  const filteredRisks = selectedEntity
    ? risks.filter((r) => r.entityId === selectedEntity)
    : [];

  // Handle success/error feedback
  React.useEffect(() => {
    if (state.success) {
      toast.success("Risk-audit linkage created successfully");
      setDialogOpen(false);
      setSelectedEntity("");
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
                Link Risk to Audit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form action={formAction}>
                <DialogHeader>
                  <DialogTitle>Create Risk-Audit Linkage</DialogTitle>
                  <DialogDescription>
                    Link an enterprise risk to an audit engagement for coverage
                    tracking.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="entityId">
                      Entity <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      name="entityId"
                      value={selectedEntity}
                      onValueChange={setSelectedEntity}
                      required
                    >
                      <SelectTrigger>
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
                    <Label htmlFor="riskRegisterId">
                      Risk <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      name="riskRegisterId"
                      disabled={!selectedEntity}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select risk" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredRisks.map((risk) => (
                          <SelectItem key={risk.id} value={risk.id}>
                            {risk.riskStatement.slice(0, 80)}...
                            <Badge variant="outline" className="ml-2">
                              {Number(risk.residualScore).toFixed(1)}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="engagementId">Audit Engagement</Label>
                    <Select name="engagementId">
                      <SelectTrigger>
                        <SelectValue placeholder="(Optional) Select engagement" />
                      </SelectTrigger>
                      <SelectContent>
                        {engagements.map((eng) => (
                          <SelectItem key={eng.id} value={eng.id}>
                            {eng.auditNumber || eng.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="thematicArea">
                        Thematic Area{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        name="thematicArea"
                        defaultValue="OPERATIONS"
                        required
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CREDIT">Credit</SelectItem>
                          <SelectItem value="OPERATIONS">Operations</SelectItem>
                          <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                          <SelectItem value="IT">IT</SelectItem>
                          <SelectItem value="GOVERNANCE">Governance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="linkageType">Linkage Type</Label>
                      <Select name="linkageType" defaultValue="DIRECT">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DIRECT">Direct</SelectItem>
                          <SelectItem value="THEMATIC">Thematic</SelectItem>
                          <SelectItem value="COVERAGE">Coverage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setSelectedEntity("");
                    }}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Linkage
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
              <TableHead>Risk</TableHead>
              <TableHead>Residual Score</TableHead>
              <TableHead>Thematic Area</TableHead>
              <TableHead>Linkage Type</TableHead>
              <TableHead>Audit Engagement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linkages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="text-muted-foreground">
                    <LinkIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    <p>No risk-audit linkages found.</p>
                    {canManage && (
                      <p className="mt-1 text-sm">
                        Click "Link Risk to Audit" to create your first linkage.
                      </p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              linkages.map((linkage) => (
                <TableRow key={linkage.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{linkage.entity.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {linkage.entity.entityType}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-sm">
                      <p className="line-clamp-2 text-sm">
                        {linkage.riskRegister.riskStatement}
                      </p>
                      <Badge variant="outline" className="mt-1">
                        {linkage.riskRegister.riskCategory}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        Number(linkage.riskRegister.residualScore) > 3.5
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }
                    >
                      {Number(linkage.riskRegister.residualScore).toFixed(2)}
                    </Badge>
                  </TableCell>
                  <TableCell>{linkage.thematicArea}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{linkage.linkageType}</Badge>
                  </TableCell>
                  <TableCell>
                    {linkage.engagement ? (
                      <div>
                        <div className="text-sm">
                          {linkage.engagement.auditNumber || "N/A"}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {linkage.engagement.status}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
