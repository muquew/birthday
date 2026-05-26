# Changelog

## V2.22.0 - Theme Foundation

- Removed the public explanation page and its desktop/mobile navigation entry.
- Preserved the current visual style as the named `经典暖色` theme.
- Added a global theme system with `经典暖色`, `清透亮色`, and `夜间深色`.
- Added shared theme switching to the public header and admin sidebar.
- Moved core color surfaces to CSS custom properties so future themes can be
  developed without rewriting component layout styles.

## V2.21.0 - Calendar View and Custom Selects

- Added a calendar view to the public "All birthdays" page, grouped by each
  birthday's next occurrence month.
- Added a list/calendar view switch on the public birthday browser.
- Replaced native select boxes with a shared custom select control across the
  public filters, admin filters, JSON import mode, and birthday form fields.
- Added keyboard and outside-click handling for the custom select control.

## V2.20.0 - Lean Admin Workbench

- Removed the standalone "needs attention" block from the admin workbench.
- Removed the duplicated six-card dashboard metrics and four-card maintenance
  metrics above the record list.
- Kept the workbench focused on filters, result count, batch actions, the
  record table, group/tag views, and the add/edit form.
- Added a compact record-scope chip line in the record-list title for library
  size and exceptional states such as hidden, duplicate, or leap-month records.
- Removed unused admin metric, attention, and filter-stat UI code/styles.

## V2.19.3 - Admin Accuracy and API Tests

- Displayed admin operation-log timestamps down to seconds and milliseconds.
- Fixed the admin workbench attention filters so the seven-day reminder opens
  the exact seven-day range, and duplicate shortcuts clear conflicting filters
  before showing duplicate records.
- Added formal Vitest integration tests for empty imports, public API privacy,
  settings log details, millisecond log timestamps, and JSON replace logging.
- Split the Express app construction from the production listener so API tests
  can run against the real routes without starting the deployment entrypoint.

## V2.19.2 - Backend Review Hardening

- Made append-style CSV and JSON imports transactional so they cannot partially
  write records if a runtime database error occurs.
- Prevented JSON replace imports from producing a duplicate lower-level
  `replace_birthdays` operation log.
- Changed empty CSV files and empty JSON arrays to preview/import errors
  instead of reporting a successful `0`-record import.
- Rechecked public birthday responses so backend-only fields stay private.

## V2.19.1 - Accurate Settings Operation Logs

- Changed site-settings operation logs to record only the fields that actually
  changed.
- Fixed correction-note updates being displayed as birthday-template changes
  in the admin operation log.

## V2.19.0 - Admin Workbench Redesign

- Made `/xingxing/admin` the single birthday workbench for record display and
  management.
- Redirected `/xingxing/admin/birthdays` back to the workbench to avoid two
  competing record surfaces.
- Reworked admin navigation into Workbench, Import Backup, Operation Logs, and
  Site Settings.
- Moved full operation logs to `/xingxing/admin/logs`.
- Reorganized the workbench into summary metrics, attention filters, a
  left-side record table, and a right-side add/edit panel.

## V2.18.2 - Single Admin Record Surface

- Removed the dashboard's separate recent-record table.
- Kept birthday records displayed and managed only in the birthday-management
  page, with the dashboard focused on summary metrics, attention items, and
  operation logs.

## V2.18.1 - Admin Interface Reuse

- Reused one admin metric-strip component for dashboard summary cards and
  birthday-management overview cards.
- Kept dashboard and birthday-management metric spacing, typography, tone, and
  mobile grid behavior consistent from one component.

## V2.18.0 - Admin Operations Suite

- Added admin batch actions for selected birthday records: show, hide, and
  delete.
- Added group and tag management views inside the birthday management page.
- Added an admin operation log API and dashboard panel for recent changes.
- Added `updated_by` tracking to birthday records and surfaced last-modified
  time/operator in the admin table and storage summary.
- Added dashboard attention reminders for today's birthdays, near-term
  birthdays, hidden records, duplicate records, and lunar leap-month records.
- Added import preview summary counts for valid rows, invalid rows, existing
  duplicates, and duplicates within the import file.
- Added one-click restore for the default birthday blessing templates in admin
  settings.

## V2.17.2 - Remove Admin Data-Scope Panel

- Removed the birthday-management data-scope panel entirely so the admin page
  stays focused on actual work.
- Kept the current-filter statistics and the per-record storage summary that
  appears only while editing an existing record.

## V2.17.1 - Admin Management Refinement

- Changed the birthday-management data-scope explanation into a compact
  collapsible block and clarified that it does not represent extra databases.
- Added current-filter statistics for visible, hidden, today, and next-30-day
  records in the admin birthday list.

## V2.17.0 - Admin Data Clarity

- Added a data-scope panel to the birthday management page explaining the
  difference between stored birthday records, computed admin views, and public
  visibility.
- Added an editable-record storage summary that shows the corresponding
  `birthday_people` database fields, including id, raw date fields, flags,
  tags JSON, visibility, and timestamps.
- Added a birthday-template count hint in admin settings.
- Added automatic expired admin-session cleanup during login/session checks.

## V2.16.0 - Deep Review Hardening

- Fixed lunar birthday lookup around the beginning of a Gregorian year by also
  checking the previous lunar source year.
- Added a regression test for lunar birthdays that fall in January from the
  previous lunar year.
- Changed public and admin date labels from misleading `今年` wording to
  `下次` / `下次日期`, matching the countdown behavior.
- Hardened admin failure paths so failed saves keep form values and failed
  delete, visibility, CSV preview, and JSON preview actions show errors.
- Made the frontend verify an existing admin session on non-login entry points,
  so navigating from the public site into `/admin` can reuse a valid cookie.
- Verified public and admin API flows against a temporary SQLite database.

## V2.15.4 - Mobile Dipper Spacing

- Removed the extra mobile top offset above the Big Dipper card.
- Tightened the mobile right-column spacing so the constellation sits closer to
  the birthday panel above it.

## V2.15.3 - Compact Mobile Today Date

- Changed the mobile today date panel so Gregorian and lunar dates sit on the
  same line.
- Tightened mobile date typography and added overflow protection for long lunar
  date text.

## V2.15.2 - Narrow Mobile Month Rail

- Kept the mobile month navigation as a right-side vertical rail while reducing
  its width.
- Moved the active month text under the active short-line marker so the label
  stays inside the rail instead of taking horizontal space.
- Reduced the mobile month board's right-side reserve to give the birthday list
  more room.

## V2.15.1 - Mobile Month Rail Refinement

- Centered the mobile month rail vertically on the right edge.
- Removed the rail's outer frame so the mobile month navigation reads as short
  line markers instead of a floating panel.
- Added active-month labeling so only the currently visible month shows its
  `几月` text while the other months stay as compact line markers.

## V2.15.0 - Copy Polish And Mobile Month Scrubber

- Rewrote the home hero subtitle so it feels warmer and less mechanical.
- Replaced the Big Dipper card's "countdown lit" explanation with gentler next-blessing copy.
- Polished the Big Dipper card with a meta row, softer layering, and clearer visual hierarchy.
- Changed the mobile month index into a right-side vertical scrubber.
- Added press-and-drag behavior on the mobile month scrubber so the month list follows the selected position.

## V2.14.0 - Date Panel And Month Rail

- Reworked the home-page today date panel so Gregorian date and lunar date read as one date group.
- Kept the date panel date-only: no birthday-person copy appears there.
- Added a compact month navigation rail with short horizontal-line markers to the month view.
- Adapted the month rail to a horizontal scroll strip on mobile.
- Verified the home and month pages on mobile and desktop.

## V2.13.0 - Review Hardening Pass

- Ran a full review pass across public pages, admin pages, API access, and build configuration.
- Enabled TypeScript unused-local and unused-parameter checks for both client and server builds.
- Removed obsolete CSS left over from the old today-date birthday prompt.
- Added generated review screenshots under `output/` to `.gitignore`.
- Verified public and admin routes on mobile and desktop with browser automation.

## V2.12.0 - Open Dipper And Cleaner Desktop Balance

- Simplified the "today star calendar" panel so it only shows Gregorian date,
  weekday, and lunar date.
- Removed birthday-person copy from the date panel because today's birthdays
  are already shown directly below it.
- Changed the Big Dipper SVG to an open six-line one-stroke ladle shape rather
  than a closed bowl.
- Reduced the desktop star-map card size and moved the summary statistics into
  the right column below the star map.
- Verified mobile and desktop rendering with browser screenshots.

## V2.11.0 - Desktop Hero And Dipper Rebalance

- Reworked the desktop first screen into a stronger two-column composition:
  title and today's birthday stack on the left, Big Dipper visual spanning the
  full right side.
- Reoriented the Big Dipper points so the constellation reads as a clearer
  dipper shape instead of a left-heavy small motif.
- Enlarged and centered the constellation inside the star-map panel.
- Increased the visibility of unfilled stars and lines so the complete seven
  star structure remains readable even when fewer than seven birthdays exist.
- Kept the mobile single-column layout and verified that the fixed bottom
  navigation does not cover key content.

## V2.10.0 - Merged Today Panel And Dynamic Dipper

- Merged today's Gregorian/lunar date context into the today's birthday panel so mobile users see them together.
- Reworked the desktop home layout into a title row followed by a two-column today panel and star-map area.
- Rebuilt the Big Dipper as an SVG constellation with seven stars and seven connecting lines.
- Made the Big Dipper meaningful: it now lights the nearest seven public birthdays in countdown order, with today's birthday highlighted.
- Reduced the star-map height on both desktop and mobile.
- Reworded the star-map explanation so it no longer claims every birthday is shown at once.

## V2.9.0 - Cleaner Home And Big Dipper

- Removed the three public home story cards so the homepage is more focused.
- Reworked the home hero layout into a cleaner birthday-wall column and a dedicated star-map panel.
- Changed the star-map graphic from a generic five-star motif to a seven-star Big Dipper constellation.
- Removed unrelated stage/microphone decoration from the star-map panel.
- Verified the cleaned homepage on mobile and desktop with browser screenshots.

## V2.8.0 - Larger Default Blessing Library

- Expanded the default birthday blessing template library from 4 to 20 original templates.
- Raised the admin blessing-template limit to 30 entries so the 20 default templates fit comfortably with room for additions.
- Updated validation coverage to assert the default template count.

## V2.7.0 - Configurable Blessing Templates

- Moved birthday blessing copy from hardcoded frontend strings into editable site settings.
- Added admin settings support for one blessing template per line.
- Added template placeholders for `{names}`, `{subject}`, and `{count}`.
- Added default templates so the public page still works before admins configure anything.
- Stored blessing templates in the existing `site_settings` key-value table as JSON.
- Added validation tests for default and empty blessing template behavior.

## V2.6.0 - Blessings And Duplicate Review

- Added a public birthday blessing card with original warm blessing copy and a "change line" action.
- Changed the copy-blessing action to copy the currently displayed blessing text instead of a terse placeholder sentence.
- Added live duplicate-name and exact duplicate-date warnings in the admin birthday form.
- Added a save-time confirmation when an admin tries to create a same-name same-date record.
- Kept group context visible in compact mobile public birthday rows so same-name records are easier to distinguish.
- Tightened birthday form numeric inputs for month, day, and year.
- Added another mobile rendering review pass for blessings, duplicate notices, and compact list rows.

## V2.5.0 - Admin Workflow And Settings

- Added editable site settings for public site name, correction note, and default upcoming-day window.
- Wired public settings into the home page, header brand, and upcoming birthday range.
- Added admin public-display preview while creating or editing birthday records.
- Simplified the default birthday form by moving optional year, grouping, tags, notes, age, visibility, and lunar leap controls into an advanced section.
- Added JSON restore in the admin import/export page, with append and replace modes plus dry-run validation.
- Added a copyable birthday greeting action for today's birthdays.
- Added duplicate-only filtering in admin birthday management.
- Reworked public birthday filters into a mobile-friendly drawer while keeping desktop filters visible.
- Added site-settings validation tests.

## V2.4.0 - Single-File Inspiration Pass

- Added a home-page "today star calendar" strip showing the current Gregorian date, weekday, and lunar date.
- Added a warm birthday prompt that names today's birthdays or the next upcoming birthday.
- Strengthened today's birthday highlighting across home, birthday list, and month list views.
- Added a lightweight public `/today` API so lunar date formatting stays on the server and does not bloat the client bundle.
- Kept calendar type labels directly attached to the birthday date instead of displaying them as separate badges or columns.
- Tightened admin visibility and CSV boolean validation so invalid values fail loudly instead of being coerced silently.
- Fixed mobile admin table rules so import previews remain readable after compact birthday-table tuning.
- Signed admin session cookies with `SESSION_SECRET` so tampered cookie values are rejected before database lookup.
- Added same-file duplicate warnings to CSV import preview.
- Converted malformed CSV parser failures into row-level preview errors instead of generic server errors.
- Added year-specific lunar validation for known-year lunar dates and leap months.
- Quoted Vitest exclude globs so all source test files run reliably from `npm test`.
- Kept the single-file page's useful ideas while preserving the app's database-backed architecture.

## V2.3.0 - Faster Browsing And Admin Flow

- Added public range tabs for all birthdays, today, next 30 days, and next 90 days.
- Added public and admin result summaries with one-click filter clearing.
- Added admin range filtering so maintainers can focus on today or near-term birthdays.
- Added an admin edit context panel and automatic scroll-to-form behavior when editing from the list on mobile.
- Kept the compact one-person-per-row mobile list direction from V2.2.

## V2.2.0 - Compact Mobile Lists

- Removed the fixed Zhang Jie birthday anchor from the public home experience.
- Stopped adding the legacy Zhang Jie anchor sample record, and clean up only the exact old auto-seeded sample.
- Changed mobile public birthday results from card blocks to compact one-person-per-row list items.
- Changed the mobile month view from large month cards to compact month rows.
- Changed mobile admin birthday tables from card blocks to compact review rows.
- Kept the Xingxing visual direction while making the theme less dependent on one person.

## V2.1.0 - Maintenance And Star Map Polish

- Added public star-map statistics for total records, today's birthdays, next birthday, and Zhang Jie anchor countdown.
- Added admin search, calendar type filtering, visibility filtering, and filter reset.
- Added admin maintenance summary with visible result count, hidden records, and likely duplicate count.
- Added downloadable CSV template and one-click fill-template action.
- Replaced the native file input with a Chinese mobile-friendly CSV upload control.
- Preserved mobile-first public navigation and mobile admin card table behavior.

## V2.0.0 - Final Mobile And Xingxing Theme Pass

- Added Zhang Jie / Xingxing themed public experience.
- Added original BeiDou constellation, stage-light, microphone, and moving-star visual motifs.
- Added Zhang Jie as a seeded theme anchor birthday record.
- Added mobile bottom navigation for public pages.
- Reworked admin birthday table into mobile-friendly cards.
- Tightened public privacy handling so birth years are not shown unless age display is explicitly enabled.
- Added source links in the public about page for the Zhang Jie / Xingxing theme notes.

## V1.5.0 - Theme Upgrade

- Researched public Zhang Jie and Xingxing references.
- Added the theme roadmap during planning.
- Added hero badges, theme story cards, and stage visual direction.

## V1.0.0 - Usable Baseline

- Public birthday site under `/xingxing`.
- Admin area under `/xingxing/admin`.
- SQLite-backed birthday records.
- Gregorian and lunar birthday calculation.
- Leap lunar month policy.
- Admin login, CRUD, hide/show, CSV import preview, CSV/JSON export.
- Production build and browser checks.
