-- Migratie 014: kolomvlag visible_at_delete op po_columns (#AB:130)
-- Bepaalt of een kolom getoond wordt in de "verborgen orders die nog in de D365-filter vallen"-popup.
-- Onafhankelijk van is_active (= zichtbaar in de tabel): een kolom kan verborgen zijn in het
-- overzicht maar wél in de verwijder-popup verschijnen, en andersom.
-- Idempotent: veilig meerdere keren uitvoeren.

IF COL_LENGTH('dbo.po_columns', 'visible_at_delete') IS NULL
BEGIN
  ALTER TABLE dbo.po_columns
    ADD visible_at_delete BIT NOT NULL
      CONSTRAINT DF_po_columns_visible_at_delete DEFAULT 0;
END
