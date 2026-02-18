"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoanReviewTable } from "./loan-review-table";
import { LoanReviewForm } from "./loan-review-form";

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

interface LoanReviewTableWrapperProps {
  loanReviews: LoanReview[];
  engagementId: string;
}

export function LoanReviewTableWrapper({
  loanReviews,
  engagementId,
}: LoanReviewTableWrapperProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanReview | undefined>();

  const handleAdd = () => {
    setEditingLoan(undefined);
    setFormOpen(true);
  };

  const handleEdit = (loan: LoanReview) => {
    setEditingLoan(loan);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingLoan(undefined);
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Loan
        </Button>
      </div>

      <LoanReviewTable
        loanReviews={loanReviews}
        engagementId={engagementId}
        onEdit={handleEdit}
      />

      <LoanReviewForm
        engagementId={engagementId}
        existingData={editingLoan}
        open={formOpen}
        onClose={handleFormClose}
      />
    </>
  );
}
