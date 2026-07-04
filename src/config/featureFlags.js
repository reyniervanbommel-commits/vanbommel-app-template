// Feature flags (#AB:169). Board-cutover Fase 7 (#176): laat het Purchase Orders-board lezen uit de
// generieke tb_*-laag (/api/data/purchase-orders) i.p.v. de legacy po_*-laag (/api/purchase-orders),
// zodat de fk_join lookup-verrijking (o.a. de Excel-koppeling #162 en vendor/item-lookups #161) op het
// board verschijnt. Achter een vlag zoals het cutover-plan voorschrijft.
//
// Overridebaar via env (VITE_BOARD_TB_SOURCE=false om terug te vallen op po_*). Op deze cutover-branch
// staat de vlag standaard AAN zodat de preview de omschakeling toont. LET OP: vóór een merge naar develop
// moet de default terug naar env-gestuurd/uit tot Fases 3-6 (write-back/historie/filters) pariteit hebben.
export const BOARD_TB_SOURCE = (import.meta.env.VITE_BOARD_TB_SOURCE ?? 'true') !== 'false';
