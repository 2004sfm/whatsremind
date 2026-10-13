import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { HelpCircle, FileSpreadsheet, Download, Smartphone, Cloud, Code, Briefcase, CheckCircle2 } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen && <HelpModalContent onClose={onClose} />}
    </Dialog>
  );
}

function HelpModalContent({ onClose }: { onClose: () => void }) {
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false);

  const handleDownloadTemplate = async () => {
    // Loaded on demand: xlsx is ~875 kB and is only needed when the user
    // actually downloads the template, so it stays out of the initial bundle.
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      [], // Row 1 (empty)
      [null, "Nombre de condominio"], // Row 2: B2 = Condominium name
      [], // Row 3 (empty)
      [null, "Código", "Nombre", "Teléfono", "Deuda"], // Row 4: B4 to E4
      [null, "101A", "Juan Pérez", "+584241234567", "150.50"], // Row 5 (example)
      [null, "102B", "María García", "+584149876543", "0.00"], // Row 6 (example)
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "formato_whatsremind.xlsx");
    setShowDownloadSuccess(true);
  };

  return (
    <>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-slate-900 dark:text-white">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600">
                <HelpCircle size={24} />
              </div>
              Centro de ayuda
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4 text-slate-600 dark:text-slate-300">
            <ExcelFormatSection onDownload={handleDownloadTemplate} />

            <hr className="border-slate-200 dark:border-slate-800" />

            <SendModesSection />

            <hr className="border-slate-200 dark:border-slate-800" />

            <MetaResourcesSection />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>

        <DownloadSuccessModal
        isOpen={showDownloadSuccess}
        onClose={() => setShowDownloadSuccess(false)}
      />
    </>
  );
}

function ExcelFormatSection({ onDownload }: { onDownload: () => void }) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-slate-900 dark:text-white">Formato de Clientes (Excel)</h3>
      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm">
          <div className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 p-2 rounded-lg shrink-0">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">formato_whatsremind.xlsx</p>
            <p className="text-slate-500">Plantilla oficial con las 4 columnas necesarias.</p>
          </div>
        </div>
        <Button onClick={onDownload} className="w-full sm:w-auto shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white">
          <Download size={16} className="mr-2" /> Descargar
        </Button>
      </div>
    </div>
  );
}

function SendModesSection() {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-slate-900 dark:text-white">Modos de Envío</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <Smartphone size={16} className="text-indigo-500" />
            Dispositivo vinculado
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Conexión por código QR. <strong>Gratuito</strong>, pero con riesgo de bloqueo si recibes reportes.
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <Cloud size={16} className="text-blue-500" />
            Cuenta corporativa
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            API oficial de Meta. Usa saldo y plantillas, pero es <strong>100% segura</strong> y sin bloqueos.
          </p>
        </div>
      </div>
    </div>
  );
}

const EXTERNAL_TOOLS = [
  {
    href: "https://developers.facebook.com/",
    icon: Code,
    iconClass: "bg-blue-100 dark:bg-blue-500/20 text-blue-600",
    title: "Meta for Developers",
    description: "Para generar el Token y el Identificador.",
  },
  {
    href: "https://business.facebook.com/",
    icon: Briefcase,
    iconClass: "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600",
    title: "Meta Business Suite",
    description: "Para crear plantillas y recargar saldo.",
  },
];

function MetaResourcesSection() {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-slate-900 dark:text-white">Cuenta corporativa (API de Meta)</h3>
      <p className="text-sm leading-relaxed">
        Para configurar el envío masivo oficial y evitar el riesgo de bloqueos de línea,{" "}
        <br className="hidden sm:block" />
        necesitas habilitar las siguientes herramientas:
      </p>
      <div className="grid sm:grid-cols-2 gap-3 mt-2">
        {EXTERNAL_TOOLS.map((tool) => (
          <a
            key={tool.href}
            href={tool.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className={`${tool.iconClass} p-2 rounded-md shrink-0`}>
              <tool.icon size={20} />
            </div>
            <div className="text-sm">
              <p className="font-medium text-slate-900 dark:text-white">{tool.title}</p>
              <p className="text-slate-500 text-xs">{tool.description}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function DownloadSuccessModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm text-center">
        <div className="flex flex-col items-center justify-center py-4">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 size={32} />
          </div>
          <DialogTitle className="text-xl mb-2">¡Descarga exitosa!</DialogTitle>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            El archivo <strong>formato_whatsremind.xlsx</strong> ha sido guardado en tu computadora. Puedes abrirlo con
            Excel para comenzar a llenarlo.
          </p>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white w-full" onClick={onClose}>
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
