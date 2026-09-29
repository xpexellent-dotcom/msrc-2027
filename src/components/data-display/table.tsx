import type { Key, ReactNode } from "react";

export type TableColumn<Row> = {
  id: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  rowHeader?: boolean;
};

type TableProps<Row> = {
  caption: string;
  columns: readonly TableColumn<Row>[];
  rows: readonly Row[];
  getRowKey: (row: Row) => Key;
  emptyMessage: string;
  loadingMessage: string;
  loading?: boolean;
  scrollHint?: string;
};

/** Presentation only: callers supply approved or clearly synthetic records. */
export function Table<Row>({
  caption,
  columns,
  rows,
  getRowKey,
  emptyMessage,
  loadingMessage,
  loading = false,
  scrollHint,
}: TableProps<Row>) {
  return (
    <div className="data-table">
      {scrollHint ? <p className="data-table__hint">{scrollHint}</p> : null}
      <div className="data-table__scroll" role="region" aria-label={caption} tabIndex={0}>
        <table aria-busy={loading || undefined}>
          <caption>{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => <th key={column.id} scope="col">{column.header}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading || rows.length === 0 ? (
              <tr>
                <td className="data-table__message" colSpan={Math.max(columns.length, 1)}>
                  {loading ? loadingMessage : emptyMessage}
                </td>
              </tr>
            ) : rows.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => column.rowHeader ? (
                  <th key={column.id} scope="row">{column.cell(row)}</th>
                ) : (
                  <td key={column.id}>{column.cell(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span className="sr-only" role="status">{loading ? loadingMessage : ""}</span>
    </div>
  );
}
