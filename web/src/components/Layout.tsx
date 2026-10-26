import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "../components/AppSidebar";
import { TopHeader, ConnectionBanner } from "../components/TopHeader";
import { ApiErrorModal } from "../components/ApiErrorModal";
import { HelpModal } from "../components/HelpModal";
import { useApiStatus } from "../hooks/useApiStatus";

export function Layout() {
  const location = useLocation();
  const { status: apiStatus, engine, phoneId, hasChecked } = useApiStatus();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Apply the persisted theme on first render.
  useEffect(() => {
    const shouldBeDark =
      document.documentElement.classList.contains("dark") || localStorage.theme === "dark";
    if (shouldBeDark) document.documentElement.classList.add("dark");
  }, []);

  // Splash screen: remove it once the first API check resolves (with a failsafe).
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const removeSplash = () => {
      const splash = document.getElementById("splash");
      if (splash) {
        splash.style.opacity = "0";
        timeoutId = setTimeout(() => splash.remove(), 400);
      }
    };

    if (hasChecked) {
      removeSplash();
    } else {
      // Failsafe: if the check takes more than 5 seconds, drop the splash anyway.
      timeoutId = setTimeout(removeSplash, 5000);
    }

    return () => clearTimeout(timeoutId);
  }, [hasChecked]);

  // The API hook emits this event when a manual check fails.
  useEffect(() => {
    const handleApiError = () => setShowErrorModal(true);
    window.addEventListener("api-error", handleApiError);
    return () => window.removeEventListener("api-error", handleApiError);
  }, []);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 overflow-hidden font-sans transition-colors duration-300">
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden border-0 cursor-default"
          onClick={closeMobileMenu}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
              e.preventDefault();
              closeMobileMenu();
            }
          }}
        />
      )}

      <AppSidebar
        isCollapsed={isCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        apiStatus={apiStatus}
        engine={engine}
        onNavigate={closeMobileMenu}
        onStatusClick={() => apiStatus === "error" && setShowErrorModal(true)}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-emerald-50/50 to-transparent dark:from-emerald-950/20 pointer-events-none" />

        <TopHeader
          pathname={location.pathname}
          onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenHelp={() => setShowHelpModal(true)}
        />

        {apiStatus === "error" && (engine === "unofficial" || phoneId) && (
          <ConnectionBanner engine={engine} />
        )}

        <div className="flex-1 overflow-auto p-4 md:p-8 pt-4 relative flex flex-col">
          <div className="max-w-6xl mx-auto w-full flex-1 mb-8">
            <Outlet context={{ apiStatus, isCollapsed }} />
          </div>

          <footer className="mt-auto pt-4 text-center text-sm font-medium text-slate-400 dark:text-slate-500 w-full shrink-0">
            &copy; {new Date().getFullYear()}{" "}
            <span className="font-bold text-emerald-600 dark:text-emerald-500 tracking-wide">famtiago</span>. Todos los
            derechos reservados.
          </footer>
        </div>
      </main>

      <ApiErrorModal
        isOpen={showErrorModal}
        engine={engine}
        onClose={() => setShowErrorModal(false)}
      />

      <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
    </div>
  );
}
