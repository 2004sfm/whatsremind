import type { ExcelPreview } from "../lib/types";

const PREVIEW_ROWS = 3;

export function FilePreviewTable({ preview }: { preview: ExcelPreview }) {
  return (
    <div className="border rounded-md overflow-hidden">
      <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm font-medium border-b">
        Vista previa (Primeras {Math.min(preview.rows.length, PREVIEW_ROWS)} filas)
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-900/50 border-b">
            <tr>
              {preview.headers.map((h) => (
                <th key={h} className="px-4 py-2 font-medium text-slate-500 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {preview.rows.slice(0, PREVIEW_ROWS).map((row) => (
              <tr
                key={`preview-${row.join("-")}`}
                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
              >
                {row.map((cell, j) => (
                  <td key={`cell-${j}-${cell}`} className="px-4 py-2 whitespace-nowrap">
                    {cell}
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
