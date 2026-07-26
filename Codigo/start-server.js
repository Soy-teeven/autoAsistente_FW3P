import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const TUNNEL_FILE = path.join(__dirname, 'tunnel.txt');

console.clear();
console.log('\x1b[36m=================================================================\x1b[0m');
console.log('\x1b[36m   INICIANDO SERVIDOR Y TÚNEL DE ACCESO COMPARTIDO (CLOUDFLARE)   \x1b[0m');
console.log('\x1b[36m=================================================================\x1b[0m');
console.log('\x1b[33m* Nota: Para que tus compañeros accedan, la PC debe seguir encendida.\x1b[0m');
console.log('\x1b[33m* Tip: Configura "Suspensión" en "Nunca" en las opciones de energía de Windows.\x1b[0m');
console.log('\x1b[36m-----------------------------------------------------------------\x1b[0m\n');

// 1. Iniciar Vite (npm run dev)
console.log('\x1b[32m[Vite]\x1b[0m Iniciando servidor de desarrollo en puerto ' + PORT + '...');
const viteProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// 2. Iniciar Cloudflare Tunnel
console.log('\x1b[34m[Cloudflare]\x1b[0m Iniciando túnel seguro...');
const cfProcess = spawn('npx', ['cloudflared', 'tunnel', '--url', `http://localhost:${PORT}`], {
  shell: true
});

let urlFound = false;

// Capturar salida de error/estándar de cloudflared
cfProcess.stdout.on('data', handleTunnelOutput);
cfProcess.stderr.on('data', handleTunnelOutput);

function handleTunnelOutput(data) {
  const output = data.toString();
  
  // Si no hemos encontrado la URL aún, la buscamos en la salida
  if (!urlFound) {
    const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match) {
      const url = match[0];
      urlFound = true;
      
      console.log('\n\x1b[42m\x1b[30m=================================================================\x1b[0m');
      console.log('\x1b[42m\x1b[30m                   ¡TÚNEL CREADO CON ÉXITO!                      \x1b[0m');
      console.log('\x1b[42m\x1b[30m=================================================================\x1b[0m');
      console.log(`\x1b[32m\x1b[1mEnlace público para compartir:\x1b[0m`);
      console.log(`\x1b[36m\x1b[1m>> ${url} <<\x1b[0m`);
      console.log('\x1b[42m\x1b[30m=================================================================\x1b[0m\n');
      
      // Guardar en tunnel.txt
      try {
        fs.writeFileSync(TUNNEL_FILE, url, 'utf8');
        console.log(`\x1b[32m[Ok]\x1b[0m Enlace guardado en: \x1b[35m${TUNNEL_FILE}\x1b[0m\n`);
      } catch (err) {
        console.error('\x1b[31m[Error]\x1b[0m No se pudo escribir en tunnel.txt:', err.message);
      }
      
      console.log('\x1b[90mPresiona Ctrl+C en esta ventana para detener el servidor.\x1b[0m\n');
    }
  }
}

// Manejar cierre de procesos de forma limpia
function cleanup() {
  console.log('\n\x1b[31mDeteniendo servidor y túnel...\x1b[0m');
  try {
    viteProcess.kill();
  } catch (e) {}
  try {
    cfProcess.kill();
  } catch (e) {}
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
