import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
};

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  emptyMessage = "Aucune donnée",
  onRowClick,
}: DataTableProps<T>) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "whitespace-nowrap px-4 py-3 font-medium",
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "transition-colors hover:bg-slate-50/70",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "whitespace-nowrap px-4 py-3 text-slate-700",
                      column.className
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
