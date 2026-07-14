# Feature 207 — Row remarks and complete row activity

Date: 2026-07-13  
Branch: `feature/207-row-remarks`  
Version: `v1.14.132`

## Automated validation

- Full test suite: passed, 31 files and 259 tests.
- Frontend and backend typecheck: passed.
- Production build: passed.
- Git diff whitespace validation: passed.
- Critical board components remain below 250 lines.

## Covered

- Secured remarks API, reactions, ownership and read-only Remarks column.
- Stable row-activity pagination, source deduplication and reaction mapping.
- Shared cell context menu and board-level remark summaries.
- Remark badge, Remarks cell and accessible drawer integration.
- Polling cleanup, visibility pause, overlap prevention and backoff.
- Remarks column restrictions and singleton reactivation behavior.

## Environment validation still required

- Run migration 023 against DEV through the normal preview deployment.
- Validate the complete browser flow on the preview URL with two employee accounts.
- Verify Server-Timing, browser console and network behavior.
- Run migration 023 on PROD only through the production deployment after merge.
