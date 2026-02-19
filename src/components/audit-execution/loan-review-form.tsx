"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createLoanReview,
  updateLoanReview,
} from "@/actions/audit-execution/loan-review";

const ASSET_CLASSES = [
  "STANDARD",
  "SMA0",
  "SMA1",
  "SMA2",
  "NPA_SUB",
  "NPA_DOUBTFUL",
  "NPA_LOSS",
] as const;

const PRODUCT_TYPES = [
  "Term Loan",
  "Cash Credit",
  "Overdraft",
  "Gold Loan",
  "Vehicle Loan",
  "Home Loan",
  "Personal Loan",
  "Other",
];

const formSchema = z.object({
  accountNo: z.string().min(1, "Account number is required").max(50),
  borrowerName: z.string().min(1, "Borrower name is required").max(200),
  productType: z.string().min(1, "Product type is required"),
  sanctionAmount: z.coerce
    .number()
    .positive("Sanction amount must be positive"),
  outstandingAmount: z.coerce
    .number()
    .min(0, "Outstanding amount must be non-negative"),
  assetClass: z.enum(ASSET_CLASSES),
  dpd: z.coerce.number().int().min(0).default(0),
  auditObservation: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface LoanReviewFormProps {
  engagementId: string;
  existingData?: {
    id: string;
    accountNo: string;
    borrowerName: string;
    productType: string;
    sanctionAmount: number;
    outstandingAmount: number;
    assetClass: string;
    dpd: number;
    auditObservation: string | null;
  };
  open: boolean;
  onClose: () => void;
}

export function LoanReviewForm({
  engagementId,
  existingData,
  open,
  onClose,
}: LoanReviewFormProps) {
  const isEditMode = !!existingData;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      accountNo: "",
      borrowerName: "",
      productType: "",
      sanctionAmount: 0,
      outstandingAmount: 0,
      assetClass: "STANDARD",
      dpd: 0,
      auditObservation: "",
    },
  });

  // Reset form when existingData changes
  useEffect(() => {
    if (existingData) {
      form.reset({
        accountNo: existingData.accountNo,
        borrowerName: existingData.borrowerName,
        productType: existingData.productType,
        sanctionAmount: Number(existingData.sanctionAmount),
        outstandingAmount: Number(existingData.outstandingAmount),
        assetClass: existingData.assetClass as any,
        dpd: existingData.dpd,
        auditObservation: existingData.auditObservation ?? "",
      });
    } else {
      form.reset({
        accountNo: "",
        borrowerName: "",
        productType: "",
        sanctionAmount: 0,
        outstandingAmount: 0,
        assetClass: "STANDARD",
        dpd: 0,
        auditObservation: "",
      });
    }
  }, [existingData, form]);

  const onSubmit = async (values: FormValues) => {
    const input = {
      ...values,
      engagementId,
      ...(isEditMode && { id: existingData.id }),
    };

    const result = isEditMode
      ? await updateLoanReview(input as any)
      : await createLoanReview(input);

    if (result.success) {
      toast.success(isEditMode ? "Loan review updated" : "Loan review created");
      onClose();
      form.reset();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit" : "Add"} Loan Review</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the loan account details."
              : "Add a new loan account for review."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit as any)}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="accountNo"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Account Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="borrowerName"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Borrower Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="productType"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Product Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRODUCT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assetClass"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Asset Class</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ASSET_CLASSES.map((cls) => (
                          <SelectItem key={cls} value={cls}>
                            {cls}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sanctionAmount"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Sanction Amount (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="outstandingAmount"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Outstanding Amount (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dpd"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Days Past Due (DPD)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="auditObservation"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Audit Observation (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Saving..."
                  : isEditMode
                    ? "Update"
                    : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
