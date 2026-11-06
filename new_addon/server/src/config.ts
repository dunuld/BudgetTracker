import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** IP des Home-Assistant-Ingress-Proxys (Supervisor-Netz). */
export const INGRESS_PROXY_IP = '172.30.32.2';

export interface ServerConfig {
  port: number;
  host: string;
  addonMode: boolean;
  /** Persistentes Datenverzeichnis (im Add-on: /data) */
  dataDir: string;
  staticDir: string;
  /** `null` = kein IP-Filter (lokale Entwicklung) */
  allowedIps: string[] | null;
  version: string;
}

const isTrue = (value: string | undefined): boolean =>
  value !== undefined && ['1', 'true', 'yes'].includes(value.toLowerCase());

function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Konfiguration aus Umgebungsvariablen:
 * ADDON_MODE, PORT, HOST, DATA_DIR, STATIC_DIR, ALLOWED_IPS (Komma-getrennt).
 * Im Addon-Modus sind nur der Ingress-Proxy und Loopback erlaubt.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const addonMode = isTrue(env['ADDON_MODE']);
  const explicitIps = env['ALLOWED_IPS']
    ?.split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);

  return {
    port: Number(env['PORT'] ?? 8099),
    host: env['HOST'] ?? (addonMode ? '0.0.0.0' : '127.0.0.1'),
    addonMode,
    dataDir: resolve(env['DATA_DIR'] ?? (addonMode ? '/data' : '.data')),
    staticDir: resolve(env['STATIC_DIR'] ?? 'dist/NewAddon/browser'),
    allowedIps: explicitIps?.length
      ? explicitIps
      : addonMode
        ? [INGRESS_PROXY_IP, '127.0.0.1', '::1']
        : null,
    version: readVersion(),
  };
}
