# UI-tekst inventarisatie (NL → EN)

Datum: 2026-07-14  
Versie na vertaling: v1.14.174

## Status

| Gebied | Bestanden | Status |
|--------|-----------|--------|
| Auth | LoginPage, ForgotPassword, ResetPassword, SetPassword, MfaPage, AuthGuard | Vertaald |
| Layout / Shared | AppFooter, LoadingOverlay, DataTable, DevPerfOverlay, App.jsx | Vertaald |
| Admin — gebruikers | UsersManagement, CreateUserDialog, EditPermissionsDialog, UserSecurityActions, AdminPage | Vertaald |
| Admin — analytics | UserAnalytics | Vertaald |
| Admin — OData | AdminODataSettings, ODataInfoDialog | Vertaald |
| Admin — datamodel | AdminDataModel, ExcelLinkWizard, StepUpload/Keys/Columns/Publish, ExistingLinksList | Vertaald |
| Supplier / PO board | Kolommen, bulk, views, cellen, toolbar, dialogs | Vertaald |
| Hooks / utils (frontend fallbacks) | api.js, useSessionAuth, useUsersManagement, useAnalyticsData, useExcelLinkWizard, usePurchaseOrderBulkEdit, usePurchaseOrderFormulaValidation | Vertaald |
| Server API errors | auth, admin, data, supplier, dataLinks, middleware, services | Vertaald |

## Herhaalde patronen

| Nederlands | Engels |
|-----------|--------|
| Laden... | Loading... |
| Bezig... | Working... |
| Opslaan / Opslaan... | Save / Saving... |
| Annuleren | Cancel |
| Verwijderen / Verwijderen... | Delete / Deleting... |
| Sluiten | Close |
| Geen gegevens gevonden | No data found |
| Geef een … op. | Enter a … |
| … mislukt | … failed |
| Versie | Version |
| Inloggen | Sign in |
| Wachtwoord | Password |
| Gebruiker | User |
| Kolom | Column |
| Formule | Formula |
| Hernoemen | Rename |
| Toevoegen | Add |
| Vernieuwen | Refresh |

## Tests met NL UI-asserties (bijwerken na vertaling)

- `src/components/supplier/PurchaseOrderColumnFilterMenu.test.jsx` — "Categorie / groeperen" → "Category / group"
- `src/components/supplier/purchaseOrderFormulaValidationTips.test.js` — NL serverfout in testdata

## Niet vertaald (bewust)

- Code comments en JSDoc
- Test `describe`/`it`-namen
- Formule-taal keywords (`ALS`, `FOUT`, etc.) — domain language voor formule-editor
- Dev-only notices in ForgotPasswordPage (`DEV:` prefix blijft, tekst Engels)

## Volledige detail-lijst

Zie agent-inventaris in chat-sessie 2026-07-14 (~250 unieke strings). Dit document dient als routekaart; de broncode is leidend na merge.
