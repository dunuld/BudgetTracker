# Haushaltsbuch – HomeAssistant Addon

Ein HomeAssistant-Addon zum Verwalten des gemeinsamen Haushaltsbudgets. Monatlich wird ein ING-Kontoauszug (PDF) hochgeladen, alle Transaktionen werden automatisch kategorisiert und als Diagramme dargestellt.

## Installation

1. Dieses Verzeichnis als `budget_tracker` in dein HomeAssistant-Addons-Verzeichnis kopieren:
   ```bash
   cp -r /pfad/zu/BudgetTracker /addons/budget_tracker
   ```
2. In HomeAssistant unter **Einstellungen → Add-ons, Backup & Supervisor** nach unten scrollen bis **Add-on Store**.
3. Oben rechts auf das Menü klicken und **Updates abrufen** wählen.
4. Das Addon **Haushaltsbuch** finden, installieren und starten.
5. Über die Seitenleiste von HomeAssistant ist das Addon dann als **Haushaltsbuch** (Icon: 💰) erreichbar.

## Nutzung

### PDF hochladen

1. Im Menü auf **Upload** klicken.
2. Den ING-Kontoauszug als PDF auswählen und hochladen.
3. Nach dem Import siehst du: Zeitraum, Anzahl Buchungen, Saldo-Prüfung und Anzahl der automatisch kategorisierten Buchungen.

### Monatsübersicht

- Die Startseite zeigt Einnahmen, Ausgaben und Saldo des aktuellen Monats.
- Ein Donut-Diagramm visualisiert die Ausgaben nach Kategorie.
- Klick auf eine Kategorie öffnet die gefilterte Transaktionsliste.
- Mit den Pfeilen kannst du zwischen Monaten navigieren.

### Transaktionen

- Alle Buchungen filterbar nach Monat, Kategorie und Freitext.
- Kategorie einer Buchung direkt ändern.
- Optional: Neue Regel für den Empfänger anlegen, damit künftige Buchungen automatisch zugeordnet werden.

### Verlauf

- Mehrere Monate vergleichen mit einem gestapelten Balkendiagramm.
- Zeitraum über die Monatsauswähler festlegen.

### Einstellungen

- **Kategorien**: Neue Kategorien anlegen (Name, Farbe, Typ) oder bestehende löschen.
- **Regeln**: Kategorisierungsregeln verwalten (Feld, Match-Typ, Muster, Priorität). „Regeln neu anwenden" aktualisiert alle nicht-manuell zugeordneten Buchungen.
- **Auszüge**: Importierte Kontoauszüge auflisten und löschen.

## Datenspeicherung

Alle Daten werden lokal im Addon-Container unter `/data` gespeichert:

- `budget.db` – SQLite-Datenbank mit Kategorien, Regeln, Auszügen und Transaktionen.
- `uploads/` – Original-PDFs der hochgeladenen Kontoauszüge.

Die Daten verlassen niemals dein HomeAssistant-System.

## Grenzen

- **Nur ING-Kontoauszüge** werden unterstützt. Andere Banken sind nicht implementiert, aber das Parser-Interface ist vorbereitet für zukünftige Erweiterungen.
- Keine HomeAssistant-Sensoren oder Entities – das Addon ist nur über die Weboberfläche (Ingress) erreichbar.
- Keine KI-gestützte Kategorisierung – nur regelbasierte Zuordnung mit Keyword-Match.

## Technische Details

- **Frontend**: Angular 22 mit Signal-basierten Komponenten, Chart.js für Diagramme.
- **Backend**: Node.js/Express (TypeScript), SQLite über `node:sqlite`.
- **PDF-Parser**: pdfjs-dist mit ING-spezifischem Layout-Parser.
- **Architektur**: Ein Docker-Container, der Angular statisch ausliefert und die REST-API bereitstellt.
