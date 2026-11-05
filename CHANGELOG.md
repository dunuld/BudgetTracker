# Changelog

## 0.1.0 (2026-11-03)

### Hinzugefügt
- **PDF-Import**: ING-Girokonto-Kontoauszüge als PDF hochladen, Transaktionen automatisch parsen
- **Kategorisierung**: Regelbasierte Zuordnung mit vordefinierten Kategorien (Lebensmittel, Streaming, Versicherungen, etc.)
- **Monatsübersicht**: Einnahmen, Ausgaben, Saldo mit Donut-Diagramm nach Kategorie
- **Transaktionsliste**: Filterbar nach Monat, Kategorie, Freitext; Kategorie inline änderbar
- **Verlauf**: Gestapeltes Balkendiagramm für mehrere Monate
- **Einstellungen**: Kategorien, Regeln und Auszüge verwalten
- **Duplikaterkennung**: Bereits importierte Auszüge werden erkannt und können ersetzt werden
- **Saldo-Prüfung**: Warnung wenn Summe der Buchungen nicht der Saldo-Differenz entspricht
- **Regeln neu anwenden**: Alle nicht-manuell zugeordneten Buchungen mit aktuellen Regeln aktualisieren

### Technik
- Angular 22 Frontend mit Signal-basierten Komponenten
- Node.js/Express Backend (TypeScript)
- SQLite-Datenbank über `node:sqlite` (Node 24)
- PDF-Parser mit pdfjs-dist
- Chart.js für Diagramme
- Docker-Container für HomeAssistant-Ingress
- Multi-Architektur-Unterstützung (amd64, aarch64)
