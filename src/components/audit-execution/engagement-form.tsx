"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  CreateEngagementSchema,
  type CreateEngagementInput,
} from "@/actions/audit-execution/schemas";
import { createEngagement } from "@/actions/audit-execution/create-engagement";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface EngagementFormProps {
  branches: { id: string; name: string; code: string }[];
  auditAreas: { id: string; name: string }[];
  auditPlans: { id: string; year: number; quarter: string }[];
}

const AUDIT_TYPES = [
  { value: "RBIA", label: "RBIA (Risk-Based Internal Audit)" },
  { value: "CONCURRENT", label: "Concurrent Audit" },
  { value: "IS_EDP", label: "IS/EDP Audit" },
  { value: "STATUTORY", label: "Statutory Audit" },
];

export function EngagementForm({
  branches,
  auditAreas,
  auditPlans,
}: EngagementFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateEngagementInput>({
    resolver: zodResolver(CreateEngagementSchema) as any,
    defaultValues: {
      auditPlanId: "",
      branchId: "",
      auditAreaId: undefined,
      auditNumber: "",
      auditType: "RBIA",
      visitNumber: 1,
      periodFrom: "",
      periodTo: "",
      scheduledStartDate: "",
      completionDate: "",
    },
  });

  const onSubmit = async (data: CreateEngagementInput) => {
    const result = await createEngagement(data);

    if (result.success) {
      toast.success("Audit engagement created successfully");
      router.push(`/audit-execution/${result.data.id}`);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Audit Plan */}
        <div className="space-y-2">
          <Label htmlFor="auditPlanId">Audit Plan *</Label>
          <Select
            value={watch("auditPlanId")}
            onValueChange={(value) => setValue("auditPlanId", value)}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select audit plan" />
            </SelectTrigger>
            <SelectContent>
              {auditPlans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  FY {plan.year} - {plan.quarter}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.auditPlanId && (
            <p className="text-destructive text-sm">
              {errors.auditPlanId.message}
            </p>
          )}
        </div>

        {/* Branch */}
        <div className="space-y-2">
          <Label htmlFor="branchId">Branch *</Label>
          <Select
            value={watch("branchId")}
            onValueChange={(value) => setValue("branchId", value)}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.code} - {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.branchId && (
            <p className="text-destructive text-sm">
              {errors.branchId.message}
            </p>
          )}
        </div>

        {/* Audit Area (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="auditAreaId">Audit Area</Label>
          <Select
            value={watch("auditAreaId") || ""}
            onValueChange={(value) =>
              setValue("auditAreaId", value || undefined)
            }
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select audit area (optional)" />
            </SelectTrigger>
            <SelectContent>
              {auditAreas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-sm">
            Optional - specific area or thematic focus
          </p>
          {errors.auditAreaId && (
            <p className="text-destructive text-sm">
              {errors.auditAreaId.message}
            </p>
          )}
        </div>

        {/* Audit Number */}
        <div className="space-y-2">
          <Label htmlFor="auditNumber">Audit Number *</Label>
          <Input
            id="auditNumber"
            placeholder="e.g., RBIA/2025-26/BR-001/V1"
            disabled={isSubmitting}
            {...register("auditNumber")}
          />
          <p className="text-muted-foreground text-sm">
            Unique audit reference number
          </p>
          {errors.auditNumber && (
            <p className="text-destructive text-sm">
              {errors.auditNumber.message}
            </p>
          )}
        </div>

        {/* Audit Type */}
        <div className="space-y-2">
          <Label htmlFor="auditType">Audit Type *</Label>
          <Select
            value={watch("auditType")}
            onValueChange={(value) => setValue("auditType", value)}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select audit type" />
            </SelectTrigger>
            <SelectContent>
              {AUDIT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.auditType && (
            <p className="text-destructive text-sm">
              {errors.auditType.message}
            </p>
          )}
        </div>

        {/* Visit Number */}
        <div className="space-y-2">
          <Label htmlFor="visitNumber">Visit Number *</Label>
          <Input
            id="visitNumber"
            type="number"
            min={1}
            disabled={isSubmitting}
            {...register("visitNumber", { valueAsNumber: true })}
          />
          <p className="text-muted-foreground text-sm">
            1 for first visit, 2 for second, etc.
          </p>
          {errors.visitNumber && (
            <p className="text-destructive text-sm">
              {errors.visitNumber.message}
            </p>
          )}
        </div>

        {/* Period From */}
        <div className="space-y-2">
          <Label htmlFor="periodFrom">Period From *</Label>
          <Input
            id="periodFrom"
            type="datetime-local"
            disabled={isSubmitting}
            {...register("periodFrom")}
          />
          <p className="text-muted-foreground text-sm">
            Start of audit coverage period
          </p>
          {errors.periodFrom && (
            <p className="text-destructive text-sm">
              {errors.periodFrom.message}
            </p>
          )}
        </div>

        {/* Period To */}
        <div className="space-y-2">
          <Label htmlFor="periodTo">Period To *</Label>
          <Input
            id="periodTo"
            type="datetime-local"
            disabled={isSubmitting}
            {...register("periodTo")}
          />
          <p className="text-muted-foreground text-sm">
            End of audit coverage period
          </p>
          {errors.periodTo && (
            <p className="text-destructive text-sm">
              {errors.periodTo.message}
            </p>
          )}
        </div>

        {/* Scheduled Start Date */}
        <div className="space-y-2">
          <Label htmlFor="scheduledStartDate">Scheduled Start Date *</Label>
          <Input
            id="scheduledStartDate"
            type="datetime-local"
            disabled={isSubmitting}
            {...register("scheduledStartDate")}
          />
          <p className="text-muted-foreground text-sm">
            When the audit is planned to begin
          </p>
          {errors.scheduledStartDate && (
            <p className="text-destructive text-sm">
              {errors.scheduledStartDate.message}
            </p>
          )}
        </div>

        {/* Completion Date */}
        <div className="space-y-2">
          <Label htmlFor="completionDate">Completion Date *</Label>
          <Input
            id="completionDate"
            type="datetime-local"
            disabled={isSubmitting}
            {...register("completionDate")}
          />
          <p className="text-sm text-muted-foreground">
            Expected audit completion date
          </p>
          {errors.completionDate && (
            <p className="text-sm text-destructive">
              {errors.completionDate.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Engagement
        </Button>
      </div>
    </form>
  );
}
