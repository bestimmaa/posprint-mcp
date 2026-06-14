# Changelog

All notable changes to this project will be documented in this file.

The version history source of truth is git tags in the format `vMAJOR.MINOR.PATCH`.

## [0.2.1] - 2026-06-14

### Fixed

- `dist/src/cli.js` is now packed with the executable bit set, so `npx -y @bestimmaa/posprint-mcp` works without `command not found`.

## [0.2.0] - 2026-06-14

### Fixed

- Printer URI is now correctly included in `VALIDATION_ERROR` meta (previously the error code string was used instead).
- `timeoutMs` is now forwarded directly to the underlying `printRawToPrinterUri` call; the redundant wrapper was removed.
- Timeout detection broadened to match `"timed out"` (ipp-printer style) in addition to `"timeout"`, so ipp timeouts are correctly mapped to `TIMEOUT` instead of `PRINTER_ERROR`.

### Changed

- `prepare` script replaces `prepack` so that `npm install github:bestimmaa/posprint-mcp` triggers a build automatically.
- README restructured to lead with the recommended MCP client config (`npx -y @bestimmaa/posprint-mcp`).

## [0.1.1] - 2026-06-14

### Fixed

- Printer URI validation errors from the `@bestimmaa/posprint` library (invalid URI, unsupported scheme, unsupported path) are now surfaced as `VALIDATION_ERROR` instead of `PRINTER_ERROR`.
- `npx` invocation in README and MCP client config examples now uses `--package=@bestimmaa/posprint-mcp posprint-mcp` to correctly resolve the binary (scoped package name does not match the bin name).

## [0.1.0] - 2026-06-14

### Added

- Initial version.
