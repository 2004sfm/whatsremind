import { execSync } from 'child_process';
import os from 'os';

const platform = os.platform();
const arch = os.arch();

console.log(`\n🚀 Detectando plataforma: ${platform} (${arch})`);

// 1. Compilar con ncc
console.log('📦 Paso 1: Instalando dependencias y compilando sidecar con ncc...');
execSync('cd sidecar && pnpm install && npx @vercel/ncc build index.js -o dist', { stdio: 'inherit' });

// 2. Determinar los targets según el OS
let target = '';
let output = '';

if (platform === 'win32') {
  target = 'node18-win-x64';
  output = '../src-tauri/sidecar-x86_64-pc-windows-msvc.exe';
} else if (platform === 'linux') {
  target = 'node18-linux-x64';
  output = '../src-tauri/sidecar-x86_64-unknown-linux-gnu';
} else if (platform === 'darwin') {
  // Mapeamos macos por las dudas
  target = `node18-macos-${arch === 'arm64' ? 'arm64' : 'x64'}`;
  output = `../src-tauri/sidecar-${arch === 'arm64' ? 'aarch64' : 'x86_64'}-apple-darwin`;
} else {
  console.error('❌ Plataforma no soportada para el sidecar');
  process.exit(1);
}

// 3. Empaquetar con pkg
console.log(`\n⚙️ Paso 2: Empaquetando ejecutable con pkg para ${target}...`);
execSync(`cd sidecar && npx pkg dist/index.js -t ${target} -o ${output}`, { stdio: 'inherit' });

console.log('\n✅ ¡Sidecar compilado y listo para ser usado por Tauri!\n');
