# Backend SQL Schema Notes

This directory documents the current database schema by loose domain groups.

## Rules

- Flyway migrations under `src/main/resources/db/migration` are the source of truth.
- Files in this directory are schema snapshots for humans, not deployment scripts.
- Do not apply these files directly to production.
- When adding or changing a Flyway migration, update the related SQL file here in the same change.
- Domain directories are intentionally loose. Add or move groups when it makes the schema easier to find.

## Current Groups

- `generation`: generation value rules such as `TEEN` and `TWENTY`.
- `keyword`: keyword and related term tables.
- `trend`: trend feed and time-series style tables.
