-- Migratie 017: tb_columns.visible_at_delete voor pariteit met po_columns (board-cutover Fase 1, #AB:170).
-- Plan: .cursor/plans/dev_2026-07-03-po-board-cutover-tb.plan.md
-- Idempotent + non-destructief. Los van is_active (dat de zichtbaarheid op het bord stuurt); deze vlag
-- bepaalt of een kolom zichtbaar is in de "verborgen orders in D365-filter"-popup (Fase 2, row-exclusions).
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tb_columns') AND name = 'visible_at_delete')
  ALTER TABLE dbo.tb_columns ADD visible_at_delete BIT NOT NULL
    CONSTRAINT DF_tb_columns_visible_at_delete DEFAULT 0;
