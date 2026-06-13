const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const colorReplacements = {
  'indigo': 'emerald',
  'purple': 'teal',
};

// We will also add a formatError function to src/lib/utils.ts
const formatErrorFunc = `
export function formatError(err: any): string {
  if (!err) return "Ocurrió un error desconocido";
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (typeof err === 'object') {
    const keys = Object.keys(err);
    if (keys.length > 0) {
      const val = err[keys[0]];
      if (typeof val === 'string') return val;
      return JSON.stringify(err);
    }
  }
  return String(err);
}
`;

let utilsPath = path.join('src', 'lib', 'utils.ts');
if (fs.existsSync(utilsPath)) {
  let content = fs.readFileSync(utilsPath, 'utf8');
  if (!content.includes('formatError')) {
    fs.writeFileSync(utilsPath, content + formatErrorFunc);
  }
}

walkDir('src', (filePath) => {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace colors
  content = content.replace(/indigo/g, 'emerald').replace(/purple/g, 'teal');
  
  // Also we want to replace `bg-emerald-600` with `bg-[#128C7E]` to get the exact color the user wants
  // or we can just redefine emerald-600 in tailwind config.
  // Actually, redefining emerald in tailwind.config.js is cleaner.

  // Replace error handling
  if (content.includes('catch (err')) {
    if (!content.includes('import { formatError }')) {
      // Find the last import
      const importRegex = /^import .* from .*;/gm;
      let lastMatch;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        lastMatch = match;
      }
      
      let importStatement = `import { formatError } from '../lib/utils';\n`;
      if (filePath.split('/').length === 2) {
        importStatement = `import { formatError } from './lib/utils';\n`;
      } else if (filePath.split('/').length === 4) {
        importStatement = `import { formatError } from '../../lib/utils';\n`;
      }
      
      if (lastMatch) {
        content = content.slice(0, lastMatch.index + lastMatch[0].length) + '\n' + importStatement + content.slice(lastMatch.index + lastMatch[0].length);
      } else {
        content = importStatement + content;
      }
    }
    
    // Replace err.message || '...' with formatError(err)
    content = content.replace(/err\.message \|\| ['"][^'"]+['"]/g, 'formatError(err)');
    content = content.replace(/String\(err\)/g, 'formatError(err)');
    content = content.replace(/\$\{err\}/g, '${formatError(err)}');
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content);
  }
});

let tailwindPath = 'tailwind.config.js';
if (fs.existsSync(tailwindPath)) {
  let content = fs.readFileSync(tailwindPath, 'utf8');
  if (!content.includes('128C7E')) {
    // Inject custom colors
    content = content.replace('extend: {', `extend: {
      colors: {
        emerald: {
          50: '#f2fcf9',
          100: '#e0f8f1',
          200: '#c2efe4',
          300: '#94e0d1',
          400: '#5dc8b6',
          500: '#38ad9b',
          600: '#128C7E',
          700: '#1f7168',
          800: '#1d5b54',
          900: '#1c4b46',
          950: '#0d2d2a',
        },
      },`);
    fs.writeFileSync(tailwindPath, content);
  }
}
