import { Card, CardContent } from "./ui/card";

interface ClientStatsCardsProps {
  totalDebt: number;
}

export function ClientStatsCards({ totalDebt }: ClientStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
        <CardContent className="p-5 flex flex-col justify-center">
          <p className="text-emerald-100 font-medium text-sm">Deuda total (Página actual)</p>
          <p className="text-3xl font-bold mt-2 tracking-tight">${totalDebt.toFixed(2)}</p>
        </CardContent>
      </Card>
      <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
        <CardContent className="p-5 flex flex-col justify-center">
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Tasa de éxito</p>
          <p className="text-3xl font-bold mt-2 tracking-tight text-slate-900 dark:text-white">
            N/A <span className="text-sm font-normal text-slate-400 dark:text-slate-500">Sin historial</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
