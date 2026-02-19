"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { saveSmaNpaEntries } from "@/actions/audit-execution/sma-npa";

interface SmaNpaEntry {
  category: string;
  accountCount: number;
  totalAmount: number;
  remarks: string | null;
}

interface SmaNpaSummaryProps {
  engagementId: string;
  existingEntries: SmaNpaEntry[];
}

const CATEGORIES = [
  { code: "SMA0", label: "SMA-0" },
  { code: "SMA1", label: "SMA-1" },
  { code: "SMA2", label: "SMA-2" },
  { code: "NPA_SUB_STANDARD", label: "NPA Sub-Standard" },
  { code: "NPA_DOUBTFUL", label: "NPA Doubtful" },
  { code: "NPA_LOSS", label: "NPA Loss" },
];

interface CategoryRow {
  category: string;
  label: string;
  accountCount: number;
  totalAmount: number;
  remarks: string;
}

export function SmaNpaSummary({
  engagementId,
  existingEntries,
}: SmaNpaSummaryProps) {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize rows with existing data
  useEffect(() => {
    const initialRows = CATEGORIES.map((cat) => {
      const existing = existingEntries.find((e) => e.category === cat.code);
      return {
        category: cat.code,
        label: cat.label,
        accountCount: existing?.accountCount ?? 0,
        totalAmount: Number(existing?.totalAmount ?? 0),
        remarks: existing?.remarks ?? "",
      };
    });
    setRows(initialRows);
  }, [existingEntries]);

  const handleChange = (
    index: number,
    field: keyof CategoryRow,
    value: any,
  ) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);

    const entries = rows.map((row) => ({
      category: row.category,
      count: row.accountCount,
      amount: row.totalAmount,
      accountCount: row.accountCount,
      totalAmount: row.totalAmount,
      remarks: row.remarks || undefined,
    }));

    const result = await saveSmaNpaEntries({
      engagementId,
      entries,
    });

    if (result.success) {
      toast.success(`Saved ${result.data.saved} SMA/NPA entries`);
    } else {
      toast.error(result.error);
    }

    setIsSaving(false);
  };

  const totalAccounts = rows.reduce((sum, row) => sum + row.accountCount, 0);
  const totalAmount = rows.reduce((sum, row) => sum + row.totalAmount, 0);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMA/NPA Category Summary</CardTitle>
        <CardDescription>
          Enter account counts and total amounts for each SMA and NPA category.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Category</TableHead>
                <TableHead className="w-[150px]">Account Count</TableHead>
                <TableHead className="w-[200px]">Total Amount (₹)</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={row.category}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={row.accountCount}
                      onChange={(e) =>
                        handleChange(
                          idx,
                          "accountCount",
                          parseInt(e.target.value, 10) || 0,
                        )
                      }
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.totalAmount}
                      onChange={(e) =>
                        handleChange(
                          idx,
                          "totalAmount",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.remarks}
                      onChange={(e) =>
                        handleChange(idx, "remarks", e.target.value)
                      }
                      placeholder="Optional remarks"
                      maxLength={500}
                      className="w-full"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="font-semibold">{totalAccounts}</TableCell>
                <TableCell className="font-semibold">
                  {formatAmount(totalAmount)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save SMA/NPA Entries"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
