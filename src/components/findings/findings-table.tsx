"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { FindingsFilters } from "./findings-filters";
import { findings } from "@/data";
import { SEVERITY_COLORS, FINDING_STATUS_COLORS } from "@/lib/constants";
import { ArrowUp, ArrowDown, ArrowUpDown } from "@/lib/icons";
import type { Finding, FindingsData } from "@/types";

const data = findings as unknown as FindingsData;

// Custom sort orders for severity and status
const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const STATUS_ORDER: Record<string, number> = {
  draft: 0,
  submitted: 1,
  reviewed: 2,
  responded: 3,
  closed: 4,
};

// Derive unique categories from data
const ALL_CATEGORIES = [
  ...new Set(data.findings.map((f) => f.category)),
].sort();

function calculateAge(createdAt: string): number {
  return Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24),
  );
}

function ageColorClass(days: number): string {
  if (days > 180) return "text-red-600 font-medium";
  if (days > 120) return "text-amber-600 font-medium";
  if (days <= 60) return "text-green-600";
  return "text-muted-foreground";
}

function SortIcon({ column }: { column: { getIsSorted: () => false | "asc" | "desc" } }) {
  const sorted = column.getIsSorted();
  if (sorted === "asc") return <ArrowUp className="ml-1 h-3.5 w-3.5" />;
  if (sorted === "desc") return <ArrowDown className="ml-1 h-3.5 w-3.5" />;
  return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />;
}

const columns: ColumnDef<Finding>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        ID
        <SortIcon column={column} />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.getValue("id")}</span>
    ),
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Title
        <SortIcon column={column} />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="line-clamp-2 text-sm font-medium md:text-base">{row.getValue("title")}</span>
    ),
  },
  {
    accessorKey: "category",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 hidden md:flex"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Category
        <SortIcon column={column} />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="hidden text-sm md:inline">{row.getValue("category")}</span>
    ),
    filterFn: (row, id, value) => {
      return row.getValue(id) === value;
    },
  },
  {
    accessorKey: "severity",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Severity
        <SortIcon column={column} />
      </Button>
    ),
    cell: ({ row }) => {
      const severity = row.getValue("severity") as keyof typeof SEVERITY_COLORS;
      return (
        <Badge variant="outline" className={SEVERITY_COLORS[severity] ?? ""}>
          {severity.charAt(0).toUpperCase() + severity.slice(1)}
        </Badge>
      );
    },
    sortingFn: (rowA, rowB) => {
      const a = SEVERITY_ORDER[rowA.getValue("severity") as string] ?? 99;
      const b = SEVERITY_ORDER[rowB.getValue("severity") as string] ?? 99;
      return a - b;
    },
    filterFn: (row, id, value) => {
      return row.getValue(id) === value;
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Status
        <SortIcon column={column} />
      </Button>
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as keyof typeof FINDING_STATUS_COLORS;
      return (
        <Badge
          variant="outline"
          className={FINDING_STATUS_COLORS[status] ?? ""}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
    sortingFn: (rowA, rowB) => {
      const a = STATUS_ORDER[rowA.getValue("status") as string] ?? 99;
      const b = STATUS_ORDER[rowB.getValue("status") as string] ?? 99;
      return a - b;
    },
    filterFn: (row, id, value) => {
      return row.getValue(id) === value;
    },
  },
  {
    accessorKey: "assignedAuditor",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 hidden md:flex"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Auditor
        <SortIcon column={column} />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="hidden text-sm md:inline">
        {row.getValue("assignedAuditor")}
      </span>
    ),
  },
  {
    id: "age",
    accessorFn: (row) => calculateAge(row.createdAt),
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 hidden md:flex"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Age (days)
        <SortIcon column={column} />
      </Button>
    ),
    cell: ({ row }) => {
      const days = row.getValue("age") as number;
      return (
        <span className={`hidden text-sm md:inline ${ageColorClass(days)}`}>
          {days}d
        </span>
      );
    },
    sortingFn: "basic",
  },
];

export function FindingsTable() {
  const router = useRouter();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>([]);

  // Filter state for dropdowns
  const [severityFilter, setSeverityFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");

  const table = useReactTable({
    data: data.findings,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleSeverityChange = (value: string) => {
    setSeverityFilter(value);
    if (value === "all") {
      setColumnFilters((prev) => prev.filter((f) => f.id !== "severity"));
    } else {
      setColumnFilters((prev) => {
        const other = prev.filter((f) => f.id !== "severity");
        return [...other, { id: "severity", value }];
      });
    }
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    if (value === "all") {
      setColumnFilters((prev) => prev.filter((f) => f.id !== "status"));
    } else {
      setColumnFilters((prev) => {
        const other = prev.filter((f) => f.id !== "status");
        return [...other, { id: "status", value }];
      });
    }
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    if (value === "all") {
      setColumnFilters((prev) => prev.filter((f) => f.id !== "category"));
    } else {
      setColumnFilters((prev) => {
        const other = prev.filter((f) => f.id !== "category");
        return [...other, { id: "category", value }];
      });
    }
  };

  const handleReset = () => {
    setSeverityFilter("all");
    setStatusFilter("all");
    setCategoryFilter("all");
    setColumnFilters([]);
  };

  const totalCount = data.findings.length;
  const filteredCount = table.getFilteredRowModel().rows.length;
  const isFiltered = filteredCount !== totalCount;

  return (
    <div className="space-y-4">
      <FindingsFilters
        severityFilter={severityFilter}
        statusFilter={statusFilter}
        categoryFilter={categoryFilter}
        categories={ALL_CATEGORIES}
        onSeverityChange={handleSeverityChange}
        onStatusChange={handleStatusChange}
        onCategoryChange={handleCategoryChange}
        onReset={handleReset}
      />

      <div className="text-sm text-muted-foreground">
        {isFiltered
          ? `Showing ${filteredCount} of ${totalCount} findings`
          : `${totalCount} findings`}
      </div>

      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() =>
                      router.push(`/findings/${row.original.id}`)
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/findings/${row.original.id}`);
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
                    No findings match the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
