# Home Assistant Add-on: Haushaltsbuch

Das Haushaltsbuch verwaltet dein Haushaltsbudget auf Basis von ING-Kontoauszügen. Monatlich wird
ein Kontoauszug (PDF) hochgeladen, alle Transaktionen werden automatisch kategorisiert und als
Diagramme dargestellt.

## Installation

Die Installation dieses Add-ons ist einfach und unterscheidet sich nicht von anderen
Home Assistant Add-ons:

1. Das Repository `https://github.com/dunuld/BudgetTracker` im Add-on Store hinzufügen
   (**Einstellungen → Add-ons → Add-on Store → ⋮ → Repositories**).
2. Im Add-on Store nach **Haushaltsbuch** suchen und auf **Installieren** klicken.
3. Das Add-on **starten**.
4. Optional **In Seitenleiste anzeigen** aktivieren – das Haushaltsbuch erscheint dann als Panel
   mit dem Icon `mdi:cash-multiple` in der Seitenleiste.
5. Über **Benutzeroberfläche öffnen** oder das Panel in der Seitenleiste starten.

## Konfiguration

Das Add-on benötigt keine Konfiguration – es gibt keine Optionen im Tab **Konfiguration**.
Der Zugriff erfolgt ausschließlich über Home Assistant Ingress; es werden keine Ports nach außen
geöffnet.

## Nutzung

### Kontoauszug hochladen

1. Im Menü auf **Upload** klicken.
2. Den ING-Kontoauszug als PDF auswählen und hochladen.
3. Nach dem Import siehst du Zeitraum, Anzahl der Buchungen, Saldo-Prüfung und die Anzahl der
   automatisch kategorisierten Buchungen.

Wurde ein Auszug bereits importiert, wird dies erkannt und du kannst ihn ersetzen.

### Monatsübersicht

- Die Startseite zeigt Einnahmen, Ausgaben und Saldo des gewählten Monats.
- Ein Donut-Diagramm visualisiert die Ausgaben nach Kategorie.
- Ein Klick auf eine Kategorie öffnet die gefilterte Transaktionsliste.
- Mit den Pfeilen navigierst du zwischen den Monaten.

### Transaktionen

- Alle Buchungen sind filterbar nach Monat, Kategorie und Freitext.
- Die Kategorie einer Buchung kann direkt geändert werden.
- Optional kann dabei eine neue Regel für den Empfänger angelegt werden, damit künftige Buchungen
  automatisch zugeordnet werden.

### Verlauf

- Mehrere Monate lassen sich in einem gestapelten Balkendiagramm vergleichen.
- Der Zeitraum wird über die Monatsauswahl festgelegt (maximal 120 Monate).

### Einstellungen

- **Kategorien**: Neue Kategorien anlegen (Name, Farbe, Typ) oder bestehende löschen.
- **Regeln**: Kategorisierungsregeln verwalten (Feld, Match-Typ, Muster, Priorität).
  **Regeln neu anwenden** aktualisiert alle nicht manuell zugeordneten Buchungen.
- **Auszüge**: Importierte Kontoauszüge auflisten und löschen.

### Darstellung

Über den Theme-Umschalter in der Navigation wählst du zwischen Hell, Dunkel und System. Im Modus
„System“ übernimmt das Panel Farben, Schrift und Hell/Dunkel des aktiven Home-Assistant-Themes.

## Datenspeicherung

Alle Daten werden lokal im persistenten Add-on-Verzeichnis `/data` gespeichert, das vom
Supervisor verwaltet wird und bei Updates erhalten bleibt:

| Pfad              | Beschreibung                                                    |
| ----------------- | --------------------------------------------------------------- |
| `/data/budget.db` | SQLite-Datenbank mit Kategorien, Regeln, Auszügen und Buchungen |
| `/data/uploads/`  | Original-PDFs der hochgeladenen Kontoauszüge                    |

Die Daten verlassen niemals dein Home-Assistant-System und sind in Home-Assistant-Backups des
Add-ons enthalten.

## Bekannte Einschränkungen

- Es werden **nur ING-Kontoauszüge** unterstützt. Das Parser-Interface ist für weitere Banken
  vorbereitet, diese sind aber noch nicht implementiert.
- Das Add-on stellt **keine Sensoren oder Entitäten** bereit – es ist nur über die Weboberfläche
  (Ingress) erreichbar.
- Die Kategorisierung ist **regelbasiert** (Keyword-/Regex-Abgleich), nicht KI-gestützt.
- Unterstützte Architekturen: `amd64`, `aarch64`.

## Support

Hast du Fragen oder ein Problem gefunden?

- [GitHub Issues](https://github.com/dunuld/BudgetTracker/issues) – Fehler melden oder
  Verbesserungen vorschlagen
- [GitHub Discussions](https://github.com/dunuld/BudgetTracker/discussions) – Fragen stellen und
  Ideen teilen

## Lizenz

MIT – siehe [LICENSE](https://github.com/dunuld/BudgetTracker/blob/main/LICENSE).
