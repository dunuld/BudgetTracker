# Changelog

## 0.1.0 (unveröffentlicht)

### Hinzugefügt

- Grundgerüst des Add-ons: Angular-Frontend mit Startseite und Theme-Umschalter (übernimmt das
  Home-Assistant-Theme), Express-Backend mit Health-Check unter `/api/health`
- Zugriff ausschließlich über Home Assistant Ingress (IP-Filter auf den Ingress-Proxy)

### Technik

- Angular 22, Node.js 24/Express (TypeScript), Docker-Image auf Basis von `node:24-alpine`
- Tests mit Vitest inkl. Coverage-Schwellen, ESLint, Prettier und TypeScript-Typprüfung
- Multi-Architektur-Unterstützung (amd64, aarch64)
