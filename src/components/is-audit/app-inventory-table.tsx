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
import { Plus, Loader2, ShieldCheck, ShieldAlert } from "@/lib/icons";
import { toast } from "sonner";

interface Application {
  id: string;
  appCode: string;
  name: string;
  vendor: string;
  version: string;
  hostingType: string;
  criticalityLevel: string;
  lastAuditDate: string;
  vulnerabilityScore: number;
  complianceStatus: string;
}

interface AppInventoryTableProps {
  applications: Application[];
}

const CRITICALITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-300",
  HIGH: "bg-orange-100 text-orange-800 border-orange-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  LOW: "bg-green-100 text-green-800 border-green-300",
};

const COMPLIANCE_COLORS: Record<string, string> = {
  COMPLIANT: "bg-green-100 text-green-800 border-green-300",
  NON_COMPLIANT: "bg-red-100 text-red-800 border-red-300",
  PARTIAL: "bg-amber-100 text-amber-800 border-amber-300",
};

export function AppInventoryTable({ applications }: AppInventoryTableProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleCreate() {
    setIsSubmitting(true);
    // TODO: Implement create application action
    toast.success("Application added to inventory");
    setIsSubmitting(false);
    setDialogOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Application
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Application to Inventory</DialogTitle>
              <DialogDescription>
                Register a new application for IS audit tracking.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="appCode">Application Code</Label>
                <Input id="appCode" placeholder="e.g., CBS-001" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Application Name</Label>
                <Input id="name" />
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>App Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Hosting</TableHead>
              <TableHead>Criticality</TableHead>
              <TableHead>Last Audit</TableHead>
              <TableHead>Vuln. Score</TableHead>
              <TableHead>Compliance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No applications in inventory.
                </TableCell>
              </TableRow>
            ) : (
              applications.map((app) => (
                <TableRow
                  key={app.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/is-audit/${app.id}`)}
                >
                  <TableCell className="font-medium">{app.appCode}</TableCell>
                  <TableCell>{app.name}</TableCell>
                  <TableCell>{app.vendor}</TableCell>
                  <TableCell>{app.version}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{app.hostingType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={CRITICALITY_COLORS[app.criticalityLevel] ?? ""}>
                      {app.criticalityLevel}
                    </Badge>
                  </TableCell>
                  <TableCell>{app.lastAuditDate}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={app.vulnerabilityScore > 7 ? "text-red-600 font-semibold" : ""}>
                        {app.vulnerabilityScore.toFixed(1)}
                      </span>
                      {app.vulnerabilityScore > 7 && <ShieldAlert className="h-4 w-4 text-red-600" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={COMPLIANCE_COLORS[app.complianceStatus] ?? ""}>
                      {app.complianceStatus.replace("_", " ")}
                    </Badge>
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
