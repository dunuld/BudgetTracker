# Home Assistant Add-on: Neues Add-on

Dieses Add-on ist ein Grundgerüst und hat noch keine eigene Funktion. Die Startseite zeigt an,
ob das Backend erreichbar ist.

## Installation

1. Das Repository `https://github.com/dunuld/BudgetTracker` im Add-on Store hinzufügen
   (**Einstellungen → Add-ons → Add-on Store → ⋮ → Repositories**).
2. Im Add-on Store nach **Neues Add-on** suchen und auf **Installieren** klicken.
   Da das Add-on als _experimentell_ markiert ist, wird es nur im erweiterten Modus angezeigt.
3. Das Add-on **starten**.
4. Optional **In Seitenleiste anzeigen** aktivieren – das Add-on erscheint dann als Panel mit dem
   Icon `mdi:puzzle` in der Seitenleiste.
5. Über **Benutzeroberfläche öffnen** oder das Panel in der Seitenleiste starten.

## Konfiguration

Das Add-on benötigt keine Konfiguration – es gibt keine Optionen im Tab **Konfiguration**.
Der Zugriff erfolgt ausschließlich über Home Assistant Ingress; es werden keine Ports nach außen
geöffnet.

## Nutzung

### Darstellung

Über den Theme-Umschalter in der Navigation wählst du zwischen Hell, Dunkel und System. Im Modus
„System“ übernimmt das Panel Farben, Schrift und Hell/Dunkel des aktiven Home-Assistant-Themes.

## Datenspeicherung

Daten werden im persistenten Add-on-Verzeichnis `/data` abgelegt, das vom Supervisor verwaltet
wird, bei Updates erhalten bleibt und in Home-Assistant-Backups des Add-ons enthalten ist.

## Support

Hast du Fragen oder ein Problem gefunden?

- [GitHub Issues](https://github.com/dunuld/BudgetTracker/issues) – Fehler melden oder
  Verbesserungen vorschlagen
- [GitHub Discussions](https://github.com/dunuld/BudgetTracker/discussions) – Fragen stellen und
  Ideen teilen

## Lizenz

MIT – siehe [LICENSE](https://github.com/dunuld/BudgetTracker/blob/main/LICENSE).
