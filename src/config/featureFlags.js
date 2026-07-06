// Feature flags (#AB:169). Board-cutover Fase 7 (#176): laat het Purchase Orders-board lezen uit de
// generieke tb_*-laag (/api/data/purchase-orders) i.p.v. de legacy po_*-laag (/api/purchase-orders),
// zodat de fk_join lookup-verrijking (o.a. de Excel-koppeling #162 en vendor/item-lookups #161) op het
// board verschijnt. Achter een vlag zoals het cutover-plan voorschrijft.
//
// Board-cutover afgerond (Fase 8, #AB:177): de po_*-laag is verwijderd; het board draait permanent op
// tb_*. De vlag blijft als constante `true` staan zodat bestaande imports/branches blijven werken (de
// dode po_-branches in de hooks zijn cosmetisch en mogen in een latere opschoning weg). Terugvallen op
// po_* kan niet meer — die code bestaat niet meer.
export const BOARD_TB_SOURCE = true;
