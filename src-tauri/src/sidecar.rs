use std::net::TcpListener;
use std::process::Command as StdCommand;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager};

#[cfg(not(debug_assertions))]
use tauri_plugin_shell::ShellExt;

use tauri_plugin_shell::process::CommandChild;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

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

        // Directorio de autenticación seguro
        let auth_dir = app_handle.path().app_data_dir()
            .unwrap_or_else(|_| std::env::temp_dir())
            .join("auth_info_baileys");

        // Intentar usar el sidecar empaquetado nativo (solo en release, en debug usamos Node.js fallback)
        #[cfg(not(debug_assertions))]
        if let Ok(cmd) = app_handle.shell().sidecar("sidecar") {
            match cmd.env("PORT", port.to_string()).env("AUTH_DIR", auth_dir.to_string_lossy().to_string()).spawn() {
                Ok((mut rx, child)) => {
                    *proc_sidecar_guard = Some(child);
                    *self.port.lock().unwrap() = Some(port);
                    // Drenar la salida para evitar bloqueos
                    tauri::async_runtime::spawn(async move {
                        while let Some(_) = rx.recv().await {}
                    });
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

        let mut cmd = StdCommand::new("node");
        cmd.arg("index.js")
            .current_dir(sidecar_dir)
            .env("PORT", port.to_string())
            .env("AUTH_DIR", auth_dir.to_string_lossy().to_string())
            .stdin(std::process::Stdio::piped());

        #[cfg(debug_assertions)]
        {
            cmd.stdout(std::process::Stdio::inherit())
               .stderr(std::process::Stdio::inherit());
        }
        #[cfg(not(debug_assertions))]
        {
            cmd.stdout(std::process::Stdio::null())
               .stderr(std::process::Stdio::null());
        }

        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);

        let child = cmd.spawn()
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
