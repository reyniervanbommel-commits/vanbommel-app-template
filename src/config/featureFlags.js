// Feature flags (#AB:169). Board-cutover Fase 7 (#176): laat het Purchase Orders-board lezen uit de
// generieke tb_*-laag (/api/data/purchase-orders) i.p.v. de legacy po_*-laag (/api/purchase-orders),
// zodat de fk_join lookup-verrijking (o.a. de Excel-koppeling #162 en vendor/item-lookups #161) op het
// board verschijnt. Achter een vlag zoals het cutover-plan voorschrijft.
//
// Overridebaar via env (VITE_BOARD_TB_SOURCE=false om terug te vallen op po_*). Default AAN: bewuste
// keuze (2026-07-04) om de cutover op DEV te tonen inclusief de fk_join-verrijking. LET OP: Fases 3-6
// (write-back/cel-historie/sync-filters/refresh-progress) hebben nog GEEN pariteit op tb_*; die acties
// tonen op het board een nette "nog niet beschikbaar"-melding. Zet VITE_BOARD_TB_SOURCE=false voor PROD
// tot die pariteit rond is (#172-#175).
export const BOARD_TB_SOURCE = (import.meta.env.VITE_BOARD_TB_SOURCE ?? 'true') !== 'false';
