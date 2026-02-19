"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteLoanReview } from "@/actions/audit-execution/loan-review";

interface LoanReview {
  id: string;
  accountNo: string;
  borrowerName: string;
  productType: string;
  sanctionAmount: number;
  outstandingAmount: number;
  assetClass: string;
  dpd: number;
  auditObservation: string | null;
}

interface LoanReviewTableProps {
  loanReviews: LoanReview[];
  engagementId: string;
  onEdit: (loanReview: LoanReview) => void;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getAssetClassVariant(
  assetClass: string,
): "default" | "secondary" | "destructive" {
  if (assetClass === "STANDARD") return "default";
  if (assetClass.startsWith("SMA")) return "secondary";
  return "destructive";
}

export function LoanReviewTable({
  loanReviews,
  engagementId,
  onEdit,
}: LoanReviewTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    const result = await deleteLoanReview({ id: deleteId, engagementId });

    if (result.success) {
      toast.success("Loan review deleted successfully");
      setDeleteId(null);
    } else {
      toast.error(result.error);
    }
    setIsDeleting(false);
  };

  const totalSanction = loanReviews.reduce(
    (sum, lr) => sum + Number(lr.sanctionAmount),
    0,
  );
  const totalOutstanding = loanReviews.reduce(
    (sum, lr) => sum + Number(lr.outstandingAmount),
    0,
  );

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account No</TableHead>
              <TableHead>Borrower</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Sanction (₹)</TableHead>
              <TableHead className="text-right">Outstanding (₹)</TableHead>
              <TableHead>Asset Class</TableHead>
              <TableHead className="text-right">DPD</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loanReviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No loan reviews found. Add records manually or import from
                  CSV.
                </TableCell>
              </TableRow>
            ) : (
              loanReviews.map((lr) => (
                <TableRow key={lr.id}>
                  <TableCell className="font-medium">{lr.accountNo}</TableCell>
                  <TableCell>{lr.borrowerName}</TableCell>
                  <TableCell>{lr.productType}</TableCell>
                  <TableCell className="text-right">
                    {formatAmount(Number(lr.sanctionAmount))}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatAmount(Number(lr.outstandingAmount))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getAssetClassVariant(lr.assetClass)}>
                      {lr.assetClass}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{lr.dpd}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onEdit(lr)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteId(lr.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {loanReviews.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="font-semibold">
                  Total
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatAmount(totalSanction)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatAmount(totalOutstanding)}
                </TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Loan Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this loan review? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
