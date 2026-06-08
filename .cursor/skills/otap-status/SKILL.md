---
name: otap-status
description: Haal de OTAP status op van Azure Container Apps voor dev, acc en prod.
disable-model-invocation: true
---

# OTAP status

Gebruik deze skill wanneer de actuele status van de Container Apps moet worden gecontroleerd.

## Broninstructie

Deze skill maakt `.claude/commands/otap-status.md` beschikbaar voor Cursor. Lees dat bestand eerst en voer de statuschecks uit als Azure CLI beschikbaar en geauthenticeerd is.

## Te rapporteren velden

- Omgeving: dev, acc of prod.
- Container App naam.
- Running status.
- Huidige image-tag.
- Ingress URL.

## Fallback

Als `az` niet beschikbaar of niet geauthenticeerd is, rapporteer dat expliciet en gebruik geen verzonnen statusdata.
