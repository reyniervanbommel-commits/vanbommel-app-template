-- Migratie 020: formule-expressie op tb_columns voor formulekolommen (Feature #187 / Story #188).
-- Alleen metadata-opslag; evaluatie gebeurt server-side in read().
IF COL_LENGTH('dbo.tb_columns', 'formula_expr') IS NULL
BEGIN
  ALTER TABLE dbo.tb_columns
    ADD formula_expr NVARCHAR(MAX) NULL;
END
