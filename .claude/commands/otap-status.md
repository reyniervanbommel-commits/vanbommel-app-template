# /otap-status — OTAP omgevingsstatus ophalen

Haal de status op van alle actieve Container Apps:

```bash
# Dev
az containerapp show --name [APP_NAME]-dev --resource-group [RESOURCE_GROUP] --query "{name:name, status:properties.runningStatus, image:properties.template.containers[0].image, url:properties.configuration.ingress.fqdn}" -o table

# Acc/Staging
az containerapp show --name [APP_NAME]-acc --resource-group [RESOURCE_GROUP] --query "{name:name, status:properties.runningStatus, image:properties.template.containers[0].image, url:properties.configuration.ingress.fqdn}" -o table

# Prod
az containerapp show --name [APP_NAME]-prod --resource-group [RESOURCE_GROUP] --query "{name:name, status:properties.runningStatus, image:properties.template.containers[0].image, url:properties.configuration.ingress.fqdn}" -o table
```

Rapporteer: naam, status, huidige image-tag en URL per omgeving.
