# Haushaltsbuch – Home Assistant Add-on Repository

[![CI – Build & Tests][ci-badge]][ci-workflow]
[![Code Quality][quality-badge]][quality-workflow]
[![GitHub Release][release-badge]][releases]
[![License][license-badge]](LICENSE)
![Unterstützte Architekturen][arch-badge]

Home Assistant Add-on Repository für das **Haushaltsbuch**: ING-Kontoauszüge (PDF) hochladen,
Buchungen automatisch kategorisieren und Einnahmen und Ausgaben direkt in Home Assistant auswerten.

[![Repository zu Home Assistant hinzufügen][repo-btn]][repo-add]

## Add-ons

Dieses Repository enthält folgende Add-ons:

### [Haushaltsbuch](./budget_tracker)

![Version][version-badge]
![amd64][amd64-badge]
![aarch64][aarch64-badge]

_Haushaltsbuch für ING-Kontoauszüge (PDF) mit automatischer Kategorisierung._

[Dokumentation](budget_tracker/DOCS.md) · [Changelog](budget_tracker/CHANGELOG.md)

## Installation

1. Klicke auf den Button **Repository zu Home Assistant hinzufügen** oben – oder füge das
   Repository manuell hinzu:
   1. In Home Assistant **Einstellungen → Add-ons → Add-on Store** öffnen.
   2. Oben rechts über das Menü (⋮) **Repositories** wählen.
   3. Folgende URL eintragen und **Hinzufügen** klicken:

      ```
      https://github.com/dunuld/BudgetTracker
      ```

2. Im Add-on Store nach **Haushaltsbuch** suchen und das Add-on **installieren**.
3. Das Add-on **starten** und die Hinweise in der [Dokumentation](budget_tracker/DOCS.md) befolgen.

## Support

- [GitHub Issues][issues] – Fehler melden oder Verbesserungen vorschlagen
- [GitHub Discussions][discussions] – Fragen stellen und Ideen teilen

## Mitwirken

Beiträge sind willkommen! Hinweise zur lokalen Entwicklung, zu Tests und zur Projektstruktur
findest du in [CONTRIBUTING.md](CONTRIBUTING.md).

## Lizenz

Dieses Projekt steht unter der [MIT-Lizenz](LICENSE).

[ci-badge]: https://github.com/dunuld/BudgetTracker/actions/workflows/ci.yml/badge.svg?branch=main
[ci-workflow]: https://github.com/dunuld/BudgetTracker/actions/workflows/ci.yml
[quality-badge]: https://github.com/dunuld/BudgetTracker/actions/workflows/code-quality.yml/badge.svg?branch=main
[quality-workflow]: https://github.com/dunuld/BudgetTracker/actions/workflows/code-quality.yml
[release-badge]: https://img.shields.io/github/v/release/dunuld/BudgetTracker
[releases]: https://github.com/dunuld/BudgetTracker/releases
[license-badge]: https://img.shields.io/github/license/dunuld/BudgetTracker
[arch-badge]: https://img.shields.io/badge/arch-amd64%20%7C%20aarch64-blue
[version-badge]: https://img.shields.io/badge/dynamic/yaml?label=Version&query=%24.version&url=https%3A%2F%2Fraw.githubusercontent.com%2Fdunuld%2FBudgetTracker%2Fmain%2Fbudget_tracker%2Fconfig.yaml
[amd64-badge]: https://img.shields.io/badge/amd64-yes-green
[aarch64-badge]: https://img.shields.io/badge/aarch64-yes-green
[repo-btn]: https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg
[repo-add]: https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fdunuld%2FBudgetTracker
[issues]: https://github.com/dunuld/BudgetTracker/issues
[discussions]: https://github.com/dunuld/BudgetTracker/discussions
