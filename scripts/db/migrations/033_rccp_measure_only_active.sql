-- Migratie 033: een inactieve kolom kan geen RCCP-waardekolom zijn.
--
-- Inactieve kolommen worden niet meegesynct en staan niet in de board-read (includeInactive:
-- false), dus als measure leveren ze altijd 0. De admin-tab toont ze wél — anders kon je ze nooit
-- heractiveren — waardoor de toggle daar zichtbaar was op kolommen die nooit data kunnen geven.
-- Op DEV stond hij daardoor aan op o.a. de gedeactiveerde purchase-orders-regelkolom
-- 'receivedPurchaseQuantity' (restant van 026/028; D365 levert dat veld niet op
-- PurchaseOrderLineV2 — de waarde komt tegenwoordig via de lookup op de ontvangstregels).
--
-- Bewust GEEN eenmalige marker: dit is een invariant, niet een seed. De code bewaakt hem vanaf nu
-- (resolveRccpMeasureEligibility), dus opnieuw draaien bij elke deploy is correct en zelfherstellend.

IF OBJECT_ID('dbo.tb_columns', 'U') IS NOT NULL
   AND EXISTS (
     SELECT 1 FROM sys.columns
     WHERE [name] = 'rccp_measure' AND object_id = OBJECT_ID('dbo.tb_columns')
   )
BEGIN
  UPDATE dbo.tb_columns
  SET rccp_measure = 0
  WHERE rccp_measure = 1
    AND is_active = 0;
END;
