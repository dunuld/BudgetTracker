# Haushaltsbuch — Home Assistant Add-on

[![GitHub release](https://img.shields.io/github/v/release/kroeppelt/BudgetTracker)](https://github.com/kroeppelt/BudgetTracker/releases)
[![License](https://img.shields.io/github/license/kroeppelt/BudgetTracker)](https://github.com/kroeppelt/BudgetTracker/blob/main/LICENSE)

Home Assistant Add-on zum Verwalten von Haushaltsdaten aus ING-Kontoauszügen (PDF).

Lade PDF-Kontoauszüge hoch, lass die Buchungen automatisch kategorisieren und behalte den Überblick über deine Finanzen — direkt in Home Assistant.

---

## Installation

1. Öffne Home Assistant und navigiere zu **Einstellungen** → **Add-ons, Backup & Supervisor** → **Add-on Store**.
2. Klicke oben rechts auf die **Drei Punkte** → **Repositories**.
3. Füge folgende URL hinzu und klicke **Hinzufügen**:

   ```
   https://github.com/kroeppelt/BudgetTracker
   ```

4. Öffne den Add-on Store erneut und suche nach **Haushaltsbuch**.
5. Klicke auf die Add-on-Karte und drücke **Installieren**.
6. Starte das Add-on anschließend über den **Start**-Button.

Nach dem Start erscheint das Haushaltsbuch als Panel in Home Assistant (Icon: 💵).

---

## Funktionen

- **PDF-Upload**: Lade ING-Kontoauszüge (PDF) direkt hoch.
- **Automatische Kategorisierung**: Buchungen werden automatisch nach Kategorien eingeordnet.
- **Kategorien-Verwaltung**: Passe Kategorien und Regeln an deine Bedürfnisse an.
- **Übersichtliches Dashboard**: Visualisiere deine Ausgaben und Einnahmen direkt in Home Assistant.
- **Persistente Speicherung**: Alle Daten werden im `.data`-Verzeichnis des Add-ons gespeichert.

---

## Nutzung

Nach der Installation und dem Start des Add-ons findest du das **Haushaltsbuch** als Panel in deiner Home Assistant-Weboberfläche.

### Kontoauszüge hochladen

1. Öffne das Haushaltsbuch-Panel.
2. Navigiere zum Upload-Bereich.
3. Wähle eine oder mehrere PDF-Dateien deiner ING-Kontoauszüge aus.
4. Die Buchungen werden automatisch geparst und kategorisiert.

### Kategorien verwalten

Du kannst bestehende Kategorien bearbeiten, neue Kategorien erstellen und Regeln für die automatische Zuordnung anpassen.

---

## Daten

Alle Daten werden im persistenten `.data`-Verzeichnis des Add-ons gespeichert:

| Pfad | Beschreibung |
|------|-------------|
| `.data/budget.db` | SQLite-Datenbank mit allen Buchungen und Kategorien |
| `.data/uploads/` | Hochgeladene PDF-Kontoauszüge |

Das Verzeichnis wird vom Home Assistant Supervisor automatisch verwaltet und bleibt bei Updates erhalten.

---

## System-Anforderungen

- **Home Assistant** mit Supervisor (z. B. Home Assistant OS)
- Unterstützte Architekturen: `amd64`, `aarch64`

---

## Support

Hast du eine Frage oder ein Problem?

- **Issues**: [GitHub Issues](https://github.com/kroeppelt/BudgetTracker/issues) — melde Bugs oder schlage Verbesserungen vor.
- **Diskussionen**: [GitHub Discussions](https://github.com/kroeppelt/BudgetTracker/discussions) — stelle Fragen oder teile Ideen.

---

## Changelog

Siehe [CHANGELOG.md](CHANGELOG.md) für eine Übersicht aller Änderungen pro Version.

---

## Lizenz

Dieses Projekt steht unter der [MIT-Lizenz](LICENSE).
