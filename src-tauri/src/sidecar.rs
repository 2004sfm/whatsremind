use std::net::TcpListener;
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use tauri::AppHandle;

#[derive(Default, Clone)]
pub struct SidecarManager {
    process: Arc<Mutex<Option<Child>>>,
    pub port: Arc<Mutex<Option<u16>>>,
}

impl SidecarManager {
    pub fn new() -> Self {
        Self {
            process: Arc::new(Mutex::new(None)),
            port: Arc::new(Mutex::new(None)),
        }
    }

    pub fn start(&self, _app_handle: &AppHandle) -> Result<u16, String> {
        let mut proc_guard = self.process.lock().unwrap();
        if let Some(mut child) = proc_guard.take() {
            match child.try_wait() {
                Ok(None) => {
                    *proc_guard = Some(child);
                    if let Some(p) = self.port.lock().unwrap().as_ref() {
                        return Ok(*p);
                    }
                }
                _ => {
                    *self.port.lock().unwrap() = None;
                }
            }
        }

        // Discover free port
        let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
        let port = listener.local_addr().map_err(|e| e.to_string())?.port();
        drop(listener); // release port so sidecar can bind to it

        let app_dir = std::env::current_dir().unwrap();
        // In dev it's in `whatsremind/src-tauri`, sidecar is in `whatsremind/sidecar`.
        // If deployed, it might be different, but we'll try `../sidecar` first.
        let mut sidecar_dir = app_dir.join("../sidecar");
        if !sidecar_dir.exists() {
            sidecar_dir = app_dir.join("sidecar"); // Fallback
        }

        let child = Command::new("node")
            .arg("index.js")
            .current_dir(sidecar_dir)
            .env("PORT", port.to_string())
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| e.to_string())?;

        *proc_guard = Some(child);
        *self.port.lock().unwrap() = Some(port);

        Ok(port)
    }

    pub fn stop(&self) {
        let mut proc_guard = self.process.lock().unwrap();
        if let Some(mut child) = proc_guard.take() {
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
