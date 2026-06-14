# Changelog

All notable changes to this project will be documented in this file.

The version history source of truth is git tags in the format `vMAJOR.MINOR.PATCH`.

## [0.1.1] - 2026-06-14

### Fixed

- Printer URI validation errors from the `@bestimmaa/posprint` library (invalid URI, unsupported scheme, unsupported path) are now surfaced as `VALIDATION_ERROR` instead of `PRINTER_ERROR`.
- `npx` invocation in README and MCP client config examples now uses `--package=@bestimmaa/posprint-mcp posprint-mcp` to correctly resolve the binary (scoped package name does not match the bin name).

## [0.1.0] - 2026-06-14

### Added

- Initial version.
