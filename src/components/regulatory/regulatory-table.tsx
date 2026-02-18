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
import { Plus, FileText, Loader2 } from "@/lib/icons";
import { toast } from "sonner";
import { AtrForm } from "./atr-form";

interface RegulatoryObservation {
  id: string;
  refNumber: string;
  regulator: string;
  description: string;
  severity: string;
  dueDate: string;
  atrStatus: string;
  atrSubmittedDate?: string;
}

interface RegulatoryTableProps {
  observations: RegulatoryObservation[];
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-300",
  HIGH: "bg-orange-100 text-orange-800 border-orange-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  LOW: "bg-green-100 text-green-800 border-green-300",
};

const ATR_STATUS_COLORS: Record<string, string> = {
  NOT_SUBMITTED: "bg-red-100 text-red-800 border-red-300",
  DRAFT: "bg-gray-100 text-gray-800 border-gray-300",
  SUBMITTED: "bg-blue-100 text-blue-800 border-blue-300",
  ACCEPTED: "bg-green-100 text-green-800 border-green-300",
  REJECTED: "bg-red-100 text-red-800 border-red-300",
};

export function RegulatoryTable({ observations }: RegulatoryTableProps) {
  const router = useRouter();
  const [atrDialogOpen, setAtrDialogOpen] = React.useState(false);
  const [selectedObservation, setSelectedObservation] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function handleSubmitAtr(observationId: string) {
    setSelectedObservation(observationId);
    setAtrDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref Number</TableHead>
              <TableHead>Regulator</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>ATR Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {observations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No regulatory observations found.
                </TableCell>
              </TableRow>
            ) : (
              observations.map((obs) => (
                <TableRow key={obs.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{obs.refNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{obs.regulator}</Badge>
                  </TableCell>
                  <TableCell>{obs.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={SEVERITY_COLORS[obs.severity] ?? ""}>
                      {obs.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>{obs.dueDate}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant="outline" className={ATR_STATUS_COLORS[obs.atrStatus] ?? ""}>
                        {obs.atrStatus.replace("_", " ")}
                      </Badge>
                      {obs.atrSubmittedDate && (
                        <div className="text-xs text-muted-foreground">
                          Submitted: {obs.atrSubmittedDate}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {obs.atrStatus === "NOT_SUBMITTED" || obs.atrStatus === "DRAFT" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSubmitAtr(obs.id)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Submit ATR
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/regulatory/${obs.id}`)}
                      >
                        View
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedObservation && (
        <Dialog open={atrDialogOpen} onOpenChange={setAtrDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submit Action Taken Report (ATR)</DialogTitle>
              <DialogDescription>
                Provide details of actions taken in response to the regulatory observation.
              </DialogDescription>
            </DialogHeader>
            <AtrForm
              observationId={selectedObservation}
              onSuccess={() => {
                setAtrDialogOpen(false);
                router.refresh();
              }}
              onCancel={() => setAtrDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
