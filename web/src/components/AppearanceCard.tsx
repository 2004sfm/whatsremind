import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Moon, Sun } from "lucide-react";
import { useTheme, toggleTheme } from "../hooks/useTheme";

export function AppearanceCard() {
  const isDark = useTheme();

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-md">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 pb-6">
        <CardTitle className="text-xl flex items-center gap-2">
          <Moon className="text-emerald-500" />
          Apariencia
        </CardTitle>
        <CardDescription>Personaliza el tema visual de la aplicación.</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-medium text-slate-900 dark:text-slate-100">
              Modo oscuro
            </Label>
            <p className="text-sm text-slate-500">Cambia entre el tema claro y oscuro.</p>
          </div>
          <Button
            variant="outline"
            onClick={toggleTheme}
            className="w-12 h-12 rounded-full p-0 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-none shadow-sm transition-colors"
          >
            {isDark ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-slate-600" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
