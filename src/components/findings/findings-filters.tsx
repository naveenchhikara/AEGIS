"use client";


import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { XCircle } from "@/lib/icons";

export interface FindingsFiltersProps {
  severityFilter: string;
  statusFilter: string;
  categoryFilter: string;
  categories: string[];
  onSeverityChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onReset: () => void;
}

export function FindingsFilters({
  severityFilter,
  statusFilter,
  categoryFilter,
  categories,
  onSeverityChange,
  onStatusChange,
  onCategoryChange,
  onReset,
}: FindingsFiltersProps) {
  const isFiltered =
    severityFilter !== "all" ||
    statusFilter !== "all" ||
    categoryFilter !== "all";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={severityFilter} onValueChange={onSeverityChange}>
        <SelectTrigger className="w-full bg-muted sm:w-[160px]">
          <SelectValue placeholder="All Severities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Severities</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full bg-muted sm:w-[160px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="submitted">Submitted</SelectItem>
          <SelectItem value="reviewed">Reviewed</SelectItem>
          <SelectItem value="responded">Responded</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
        </SelectContent>
      </Select>

      <Select value={categoryFilter} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-full bg-muted sm:w-[200px]">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isFiltered && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          <XCircle className="mr-1 h-4 w-4" />
          Reset
        </Button>
      )}
    </div>
  );
}
