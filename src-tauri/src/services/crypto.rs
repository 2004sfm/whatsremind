use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use sha2::{Digest, Sha256};
use std::path::Path;

use crate::error::AppError;

/// Derives a 32-byte machine key from the machine's unique identifier.
///
/// Strategy:
///   1. Linux: read `/etc/machine-id`, SHA-256 hash → 32 bytes.
///   2. Windows: read `HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid`, hash.
///   3. Fallback: read `app_data_dir/.machine_key`; if missing, generate 32 random
///      bytes, persist, and return them.
pub fn derive_machine_key(app_data_dir: &Path) -> [u8; 32] {
    // Try Linux machine-id
    #[cfg(target_os = "linux")]
    if let Ok(id) = std::fs::read_to_string("/etc/machine-id") {
        let id = id.trim().to_string();
        if !id.is_empty() {
            return sha256_bytes(id.as_bytes());
        }
    }

    // Try Windows registry MachineGuid
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        if let Ok(output) = Command::new("reg")
            .args([
                "query",
                r"HKLM\SOFTWARE\Microsoft\Cryptography",
                "/v",
                "MachineGuid",
            ])
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            if let Some(guid) = text.split_whitespace().last() {
                return sha256_bytes(guid.as_bytes());
            }
        }
    }

    // Fallback: persist random key in app data dir
    fallback_key(app_data_dir)
}

fn sha256_bytes(data: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.finalize().into()
}

fn fallback_key(app_data_dir: &Path) -> [u8; 32] {
    let key_path = app_data_dir.join(".machine_key");

    if key_path.exists() {
        if let Ok(bytes) = std::fs::read(&key_path) {
            if bytes.len() == 32 {
                let mut key = [0u8; 32];
                key.copy_from_slice(&bytes);
                return key;
            }
        }
    }

    // Generate new random 32-byte key
    use rand::RngCore;
    let mut key = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut key);

    // Best-effort persist; if it fails we still return the key for this session
    let _ = std::fs::create_dir_all(app_data_dir);
    let _ = std::fs::write(&key_path, key);

    key
}

/// Encrypts `plaintext` using AES-256-GCM with the provided `key`.
///
/// Returns `(ciphertext, nonce)` — both must be stored to enable decryption.
pub fn encrypt(plaintext: &str, key: &[u8; 32]) -> Result<(Vec<u8>, Vec<u8>), AppError> {
    let cipher =
        Aes256Gcm::new_from_slice(key).map_err(|e| AppError::Crypto(e.to_string()))?;

    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let ciphertext = cipher
        .encrypt(&nonce, plaintext.as_bytes())
        .map_err(|e| AppError::Crypto(e.to_string()))?;

    Ok((ciphertext, nonce.to_vec()))
}

/// Decrypts `ciphertext` using AES-256-GCM with the given `nonce` and `key`.
pub fn decrypt(ciphertext: &[u8], nonce: &[u8], key: &[u8; 32]) -> Result<String, AppError> {
    let cipher =
        Aes256Gcm::new_from_slice(key).map_err(|e| AppError::Crypto(e.to_string()))?;

    let nonce = Nonce::from_slice(nonce);
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| AppError::Crypto(format!("decryption failed: {}", e)))?;

    String::from_utf8(plaintext).map_err(|e| AppError::Crypto(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_key() -> [u8; 32] {
        // Deterministic key for tests derived from a known string
        sha256_bytes(b"test-machine-id-for-unit-tests")
    }

    #[test]
    fn test_roundtrip_encrypt_decrypt_succeeds() {
        let key = test_key();
        let plaintext = "my-secret-token-12345";

        let (ciphertext, nonce) = encrypt(plaintext, &key).expect("encrypt should not fail");
        let decrypted = decrypt(&ciphertext, &nonce, &key).expect("decrypt should not fail");

        assert_eq!(plaintext, decrypted);
    }

    #[test]
    fn test_wrong_key_returns_error() {
        let key = test_key();
        let wrong_key = sha256_bytes(b"wrong-key");

        let plaintext = "super-secret";
        let (ciphertext, nonce) = encrypt(plaintext, &key).expect("encrypt should not fail");

        let result = decrypt(&ciphertext, &nonce, &wrong_key);
        assert!(result.is_err(), "decrypting with wrong key should fail");
    }

    #[test]
    fn test_ciphertext_differs_from_plaintext() {
        let key = test_key();
        let plaintext = "visible-text";

        let (ciphertext, _nonce) = encrypt(plaintext, &key).expect("encrypt should not fail");

        assert_ne!(
            plaintext.as_bytes(),
            ciphertext.as_slice(),
            "ciphertext must not equal plaintext"
        );
    }

    #[test]
    fn test_derive_machine_key_returns_32_bytes() {
        // Use a temp dir as app_data_dir for the fallback path
        let tmp = std::env::temp_dir().join("wa_test_key_derive");
        std::fs::create_dir_all(&tmp).ok();
        let key = derive_machine_key(&tmp);
        assert_eq!(key.len(), 32);
        // Clean up
        std::fs::remove_dir_all(&tmp).ok();
    }

    #[test]
    fn test_fallback_key_is_stable_across_calls() {
        let tmp = std::env::temp_dir().join("wa_test_key_stable");
        std::fs::create_dir_all(&tmp).ok();

        let key1 = derive_machine_key(&tmp);
        let key2 = derive_machine_key(&tmp);
        assert_eq!(key1, key2, "fallback key should be stable across calls");

        std::fs::remove_dir_all(&tmp).ok();
    }
}
