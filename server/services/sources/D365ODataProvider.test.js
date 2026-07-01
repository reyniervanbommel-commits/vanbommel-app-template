'use strict';

// DB-/netwerk-vrije unit-tests voor de D365ODataProvider (#139): $metadata-parser, EDM->dataType-mapping
// en de capability-shape. Geen echte fetch/DB-calls; we voeren een XML-fixture door de exposed parsers.

const {
  D365ODataProvider,
  edmToDataType,
  humanizeFieldName,
  parseEntityProperties,
  parseEntitySets,
  indexEntityTypes,
  resolveNavTargetType,
  entitySetName,
  findEntityType,
  normalizeSample,
} = require('./D365ODataProvider');

// Verkorte, representatieve $metadata-fixture (master + detail via NavigationProperty).
const METADATA_FIXTURE = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
 <edmx:DataServices>
  <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Microsoft.Dynamics.DataEntities">
    <EntityType Name="PurchaseOrderHeaderV2">
      <Key><PropertyRef Name="dataAreaId"/><PropertyRef Name="PurchaseOrderNumber"/></Key>
      <Property Name="dataAreaId" Type="Edm.String" Nullable="false"/>
      <Property Name="PurchaseOrderNumber" Type="Edm.String" Nullable="false"/>
      <Property Name="OrderVendorAccountNumber" Type="Edm.String"/>
      <Property Name="RequestedDeliveryDate" Type="Edm.Date" Nullable="true"/>
      <Property Name="CreatedDateTime" Type="Edm.DateTimeOffset"/>
      <Property Name="IsChangeManagementActive" Type="Microsoft.Dynamics.DataEntities.NoYes"/>
      <Property Name="TotalDiscountPercentage" Type="Edm.Decimal"/>
      <NavigationProperty Name="PurchaseOrderLines" Type="Collection(Microsoft.Dynamics.DataEntities.PurchaseOrderLineV2)"/>
    </EntityType>
    <EntityType Name="PurchaseOrderLineV2">
      <Key><PropertyRef Name="dataAreaId"/><PropertyRef Name="LineNumber"/></Key>
      <Property Name="LineNumber" Type="Edm.Int64" Nullable="false"/>
      <Property Name="ItemNumber" Type="Edm.String"/>
      <Property Name="OrderedPurchaseQuantity" Type="Edm.Decimal"/>
      <Property Name="LineDeliveryConfirmed" Type="Edm.Boolean"/>
    </EntityType>
  </Schema>
 </edmx:DataServices>
</edmx:Edmx>`;

// $metadata-fixture met EntitySets (voor de entiteit-discovery-parser).
const ENTITYSETS_FIXTURE = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0"><edmx:DataServices>
  <Schema Namespace="Microsoft.Dynamics.DataEntities">
    <EntityContainer Name="Resources">
      <EntitySet Name="PurchaseOrderHeadersV2" EntityType="Microsoft.Dynamics.DataEntities.PurchaseOrderHeaderV2" />
      <EntitySet Name="VendorsV2" EntityType="Microsoft.Dynamics.DataEntities.VendorV2" />
      <EntitySet Name="Customers" EntityType="Microsoft.Dynamics.DataEntities.Customer" />
      <EntitySet Name="PurchaseOrderHeadersV2" EntityType="Microsoft.Dynamics.DataEntities.PurchaseOrderHeaderV2" />
    </EntityContainer>
  </Schema>
</edmx:DataServices></edmx:Edmx>`;

describe('D365ODataProvider capabilities', () => {
  it('rapporteert de verwachte capability-shape (allemaal true voor D365)', () => {
    const provider = new D365ODataProvider();
    const caps = provider.capabilities();
    expect(caps).toEqual({
      discoverFields: true,
      discoverEntities: true,
      serverFilter: true,
      serverPaging: true,
      masterDetail: true,
      writeBack: true,
      needsCache: true,
    });
    // Alle capability-vlaggen zijn booleans.
    for (const value of Object.values(caps)) expect(typeof value).toBe('boolean');
  });
});

describe('parseEntitySets — entiteit-discovery uit $metadata', () => {
  it('parseert EntitySets naar { name, sourceEntity, entityType } en sorteert op naam', () => {
    const sets = parseEntitySets(ENTITYSETS_FIXTURE);
    expect(sets.map((s) => s.name)).toEqual(['Customers', 'PurchaseOrderHeadersV2', 'VendorsV2']);
    const po = sets.find((s) => s.name === 'PurchaseOrderHeadersV2');
    expect(po).toEqual({
      name: 'PurchaseOrderHeadersV2',
      sourceEntity: '/data/PurchaseOrderHeadersV2',
      entityType: 'Microsoft.Dynamics.DataEntities.PurchaseOrderHeaderV2',
    });
  });

  it('ontdubbelt EntitySets met dezelfde naam', () => {
    const sets = parseEntitySets(ENTITYSETS_FIXTURE);
    expect(sets.filter((s) => s.name === 'PurchaseOrderHeadersV2')).toHaveLength(1);
  });

  it('geeft een lege lijst bij metadata zonder EntitySets', () => {
    expect(parseEntitySets('<edmx:Edmx></edmx:Edmx>')).toEqual([]);
  });
});

describe('normalizeSample — veld-voorbeeldwaarden', () => {
  it('geeft null voor lege/ontbrekende waarden', () => {
    expect(normalizeSample(null)).toBeNull();
    expect(normalizeSample(undefined)).toBeNull();
    expect(normalizeSample('')).toBeNull();
    expect(normalizeSample('   ')).toBeNull();
  });
  it('kapt ISO-datumtijd af tot alleen de datum', () => {
    expect(normalizeSample('2026-07-01T00:00:00Z')).toBe('2026-07-01');
  });
  it('serialiseert getallen en booleans naar string', () => {
    expect(normalizeSample(42)).toBe('42');
    expect(normalizeSample(0)).toBe('0');
    expect(normalizeSample(true)).toBe('true');
    expect(normalizeSample(false)).toBe('false');
  });
  it('kapt lange strings af op ~60 tekens met ellipsis', () => {
    const long = 'x'.repeat(120);
    const out = normalizeSample(long);
    expect(out.length).toBeLessThanOrEqual(60);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('edmToDataType — EDM -> app datatype', () => {
  it('mapt string en guid op text', () => {
    expect(edmToDataType('Edm.String')).toBe('text');
    expect(edmToDataType('Edm.Guid')).toBe('text');
  });
  it('mapt numerieke EDM-types op number', () => {
    for (const t of ['Edm.Int16', 'Edm.Int32', 'Edm.Int64', 'Edm.Decimal', 'Edm.Double', 'Edm.Single']) {
      expect(edmToDataType(t)).toBe('number');
    }
  });
  it('mapt datum/tijd-types op date', () => {
    for (const t of ['Edm.Date', 'Edm.DateTimeOffset', 'Edm.DateTime', 'Edm.Time']) {
      expect(edmToDataType(t)).toBe('date');
    }
  });
  it('mapt Edm.Boolean op boolean', () => {
    expect(edmToDataType('Edm.Boolean')).toBe('boolean');
  });
  it('mapt niet-Edm (enum) types op select', () => {
    expect(edmToDataType('Microsoft.Dynamics.DataEntities.NoYes')).toBe('select');
  });
  it('valt terug op text bij onbekend/leeg', () => {
    expect(edmToDataType('')).toBe('text');
    expect(edmToDataType(undefined)).toBe('text');
  });
});

describe('humanizeFieldName', () => {
  it('splitst PascalCase in leesbare woorden', () => {
    expect(humanizeFieldName('PurchaseOrderNumber')).toBe('Purchase Order Number');
    expect(humanizeFieldName('LineNumber')).toBe('Line Number');
  });
});

describe('$metadata-parser', () => {
  it('indexeert EntityTypes op naam (hoofdletterongevoelig)', () => {
    const byName = indexEntityTypes(METADATA_FIXTURE);
    expect(byName.has('purchaseorderheaderv2')).toBe(true);
    expect(byName.has('purchaseorderlinev2')).toBe(true);
  });

  it('parseert scalar Properties met datatype + nullable en negeert NavigationProperty', () => {
    const byName = indexEntityTypes(METADATA_FIXTURE);
    const master = byName.get('purchaseorderheaderv2');
    const props = parseEntityProperties(master.block, 'master');

    // De NavigationProperty mag niet als veld verschijnen.
    expect(props.find((p) => p.field === 'PurchaseOrderLines')).toBeUndefined();

    const byField = Object.fromEntries(props.map((p) => [p.field, p]));
    expect(byField.PurchaseOrderNumber).toMatchObject({ dataType: 'text', scope: 'master', nullable: false });
    expect(byField.RequestedDeliveryDate).toMatchObject({ dataType: 'date', nullable: true });
    expect(byField.CreatedDateTime.dataType).toBe('date');
    expect(byField.TotalDiscountPercentage.dataType).toBe('number');
    expect(byField.IsChangeManagementActive.dataType).toBe('select');
    // Nullable ontbreekt op OrderVendorAccountNumber -> default true.
    expect(byField.OrderVendorAccountNumber.nullable).toBe(true);
  });

  it('resolvet de detail-EntityType uit een NavigationProperty', () => {
    const byName = indexEntityTypes(METADATA_FIXTURE);
    const master = byName.get('purchaseorderheaderv2');
    const target = resolveNavTargetType(master.block, 'PurchaseOrderLines');
    expect(target).toBe('PurchaseOrderLineV2');
    expect(findEntityType(byName, target)).toBeTruthy();
  });
});

describe('entitySetName', () => {
  it('str+ipt het /data/-pad', () => {
    expect(entitySetName('/data/PurchaseOrderHeadersV2')).toBe('PurchaseOrderHeadersV2');
    expect(entitySetName('PurchaseOrderHeadersV2')).toBe('PurchaseOrderHeadersV2');
  });
});

describe('findEntityType — tolerante resolutie', () => {
  const byName = new Map([
    ['purchaseorderheaderv2', { name: 'PurchaseOrderHeaderV2', block: '' }],
  ]);
  it('matcht exact', () => {
    expect(findEntityType(byName, 'PurchaseOrderHeaderV2')).toBeTruthy();
  });
  it('matcht een meervoudige entity-set-naam met V-suffix op de enkelvoudige EntityType', () => {
    // Entity-set "PurchaseOrderHeadersV2" -> EntityType "PurchaseOrderHeaderV2".
    expect(findEntityType(byName, 'PurchaseOrderHeadersV2')).toBeTruthy();
  });
  it('geeft null voor een onbekende entiteit', () => {
    expect(findEntityType(byName, 'GeenBestaandeEntiteit')).toBeNull();
  });
});
