use std::net::TcpListener;
use std::process::Command as StdCommand;
use std::sync::{Arc, Mutex};
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandChild;

#[derive(Default, Clone)]
pub struct SidecarManager {
    process_sidecar: Arc<Mutex<Option<CommandChild>>>,
    process_std: Arc<Mutex<Option<std::process::Child>>>,
    pub port: Arc<Mutex<Option<u16>>>,
}

impl SidecarManager {
    pub fn new() -> Self {
        Self {
            process_sidecar: Arc::new(Mutex::new(None)),
            process_std: Arc::new(Mutex::new(None)),
            port: Arc::new(Mutex::new(None)),
        }
    }

    pub fn start(&self, app_handle: &AppHandle) -> Result<u16, String> {
        let mut proc_sidecar_guard = self.process_sidecar.lock().unwrap();
        let mut proc_std_guard = self.process_std.lock().unwrap();

        // Si ya está corriendo en std
        if let Some(mut child) = proc_std_guard.take() {
            match child.try_wait() {
                Ok(None) => {
                    *proc_std_guard = Some(child);
                    if let Some(p) = self.port.lock().unwrap().as_ref() {
                        return Ok(*p);
                    }
                }
                _ => {
                    *self.port.lock().unwrap() = None;
                }
            }
        }

        // Si ya está corriendo en sidecar
        if let Some(child) = proc_sidecar_guard.take() {
            // CommandChild de Tauri v2 no tiene try_wait simple síncrono.
            // Asumimos que sigue vivo, o lo matamos y reiniciamos si la API de whatsapp no responde (se maneja fuera).
            *proc_sidecar_guard = Some(child);
            if let Some(p) = self.port.lock().unwrap().as_ref() {
                return Ok(*p);
            }
        }

        // Discover free port
        let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
        let port = listener.local_addr().map_err(|e| e.to_string())?.port();
        drop(listener);

        // Intentar usar el sidecar empaquetado nativo (Tauri v2)
        if let Ok(cmd) = app_handle.shell().sidecar("sidecar") {
            match cmd.env("PORT", port.to_string()).spawn() {
                Ok((_rx, child)) => {
                    *proc_sidecar_guard = Some(child);
                    *self.port.lock().unwrap() = Some(port);
                    return Ok(port);
                }
                Err(_) => {
                    // Falló al spawnear el sidecar, continuar al fallback
                }
            }
        }

        // Fallback: usar Node.js directamente (útil para `pnpm run tauri dev`)
        let app_dir = std::env::current_dir().unwrap();
        let mut sidecar_dir = app_dir.join("../sidecar");
        if !sidecar_dir.exists() {
            sidecar_dir = app_dir.join("sidecar");
        }

        let child = StdCommand::new("node")
            .arg("index.js")
            .current_dir(sidecar_dir)
            .env("PORT", port.to_string())
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Fallo al iniciar sidecar nativo y Node fallback: {}", e))?;

        *proc_std_guard = Some(child);
        *self.port.lock().unwrap() = Some(port);

        Ok(port)
    }

    pub fn stop(&self) {
        let mut proc_sidecar_guard = self.process_sidecar.lock().unwrap();
        if let Some(child) = proc_sidecar_guard.take() {
            let _ = child.kill();
        }

        let mut proc_std_guard = self.process_std.lock().unwrap();
        if let Some(mut child) = proc_std_guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }

        *self.port.lock().unwrap() = None;
    }
}

impl Drop for SidecarManager {
    fn drop(&mut self) {
        self.stop();
    }
}
