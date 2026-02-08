"use client";

import * as React from "react";
import { ArrowUpDown } from "@/lib/icons";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
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
import { ComplianceDetailDialog } from "./compliance-detail-dialog";
import { ComplianceFilters } from "./compliance-filters";
import { demoComplianceRequirements } from "@/data";
import { STATUS_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { ComplianceRequirement } from "@/types";

const CATEGORY_MAP: Record<string, string> = {
  "risk-management": "Risk Management",
  governance: "Governance",
  operations: "Operations",
  it: "IT",
  credit: "Credit",
  "market-risk": "Market Risk",
};

export function ComplianceTable() {
  const compData = demoComplianceRequirements as any;
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [selectedRequirement, setSelectedRequirement] =
    React.useState<ComplianceRequirement | null>(null);

  // Filter state for dropdowns
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const columns: ColumnDef<ComplianceRequirement>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue("id")}</span>
      ),
    },
    {
      accessorKey: "categoryId",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Category
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const categoryId = row.getValue("categoryId") as string;
        return CATEGORY_MAP[categoryId] || categoryId;
      },
    },
    {
      accessorKey: "title",
      header: "Description",
      cell: ({ row }) => (
        <div className="max-w-[200px] md:max-w-[300px]">
          <div className="truncate text-sm font-medium md:text-base">
            {row.getValue("title")}
          </div>
          <div className="text-muted-foreground line-clamp-1 text-sm md:text-base">
            {row.original.description}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as keyof typeof STATUS_COLORS;
        return (
          <Badge className={STATUS_COLORS[status]}>
            {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "dueDate",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Due Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => formatDate(row.getValue("dueDate")),
    },
    {
      accessorKey: "evidenceCount",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden md:flex"
        >
          Evidence
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="hidden md:inline">
          {row.getValue("evidenceCount")}
        </span>
      ),
    },
    {
      accessorKey: "assignedToName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden md:flex"
        >
          Assigned To
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="hidden md:inline">
          {row.getValue("assignedToName")}
        </span>
      ),
    },
  ];

  const table = useReactTable({
    data: compData.complianceRequirements,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Handle filter changes
  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    if (value === "all") {
      setColumnFilters((prev) => prev.filter((f) => f.id !== "categoryId"));
    } else {
      setColumnFilters((prev) => {
        const otherFilters = prev.filter((f) => f.id !== "categoryId");
        return [...otherFilters, { id: "categoryId", value }];
      });
    }
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    if (value === "all") {
      setColumnFilters((prev) => prev.filter((f) => f.id !== "status"));
    } else {
      setColumnFilters((prev) => {
        const otherFilters = prev.filter((f) => f.id !== "status");
        return [...otherFilters, { id: "status", value }];
      });
    }
  };

  const handleReset = () => {
    setCategoryFilter("all");
    setStatusFilter("all");
    setColumnFilters([]);
  };

  const totalRequirements = compData.complianceRequirements.length;
  const filteredRows = table.getFilteredRowModel().rows;
  const isFiltered = filteredRows.length !== totalRequirements;

  return (
    <div className="space-y-4">
      <ComplianceFilters
        categoryFilter={categoryFilter}
        statusFilter={statusFilter}
        onCategoryChange={handleCategoryChange}
        onStatusChange={handleStatusChange}
        onReset={handleReset}
      />

      <div className="text-muted-foreground text-sm">
        {isFiltered
          ? `Showing ${filteredRows.length} of ${totalRequirements} requirements`
          : `${totalRequirements} requirements`}
      </div>

      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-muted/50 cursor-pointer transition-colors duration-150"
                    onClick={() => setSelectedRequirement(row.original)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedRequirement(row.original);
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No compliance requirements found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedRequirement && (
        <ComplianceDetailDialog
          requirement={selectedRequirement}
          open={!!selectedRequirement}
          onOpenChange={(open) => !open && setSelectedRequirement(null)}
        />
      )}
    </div>
  );
}
