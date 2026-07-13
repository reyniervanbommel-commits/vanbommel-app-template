'use strict';

const {
  CACHE_TTL_MS,
  MAX_IMAGE_BYTES,
  PRODUCT_IMAGE_ENTITY_PATH,
  PRODUCT_IMAGE_SELECT_FIELDS,
  ProductImageServiceError,
  buildCacheKey,
  createProductImageService,
  selectDefaultProductImage,
  validateProductImageInput,
} = require('./ProductImageService');

const validInput = { dataAreaId: 'USMF', itemNumber: 'ITEM-001' };
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const webp = Buffer.from('RIFF0000WEBPdata', 'ascii');

function imageRecord({
  attachment = jpeg.toString('base64'),
  fileType = 'jpg',
  isProductImage = true,
  isDefaultProductImage = true,
  attachedDateTime = '2026-07-13T12:00:00Z',
} = {}) {
  return {
    ItemNumber: validInput.itemNumber,
    dataAreaId: validInput.dataAreaId,
    Attachment: attachment,
    FileType: fileType,
    IsProductImage: isProductImage,
    IsDefaultProductImage: isDefaultProductImage,
    AttachedDateTime: attachedDateTime,
  };
}

function createService(items) {
  const fetchEntityRecordsFn = vi.fn().mockResolvedValue({ items });
  return {
    fetchEntityRecordsFn,
    service: createProductImageService({ fetchEntityRecordsFn }),
  };
}

describe('ProductImageService', () => {
  it('valideert uitsluitend verwachte dataAreaId- en itemNumber-waarden', () => {
    expect(validateProductImageInput(validInput)).toEqual(validInput);
    expect(validateProductImageInput({ dataAreaId: 'USMF', itemNumber: '../secret' })).toBeNull();
    expect(validateProductImageInput({ dataAreaId: 'USMF;', itemNumber: 'ITEM-001' })).toBeNull();
  });

  it('maakt ondubbelzinnige cache-sleutels', () => {
    expect(buildCacheKey({ dataAreaId: 'AB', itemNumber: 'C' }))
      .not.toBe(buildCacheKey({ dataAreaId: 'A', itemNumber: 'BC' }));
  });

  it('kiest uitsluitend de nieuwste standaard productafbeelding', () => {
    const newestDefault = imageRecord({ fileType: 'png', attachedDateTime: '2026-07-13T13:00:00Z' });
    expect(selectDefaultProductImage([
      imageRecord({ isDefaultProductImage: false, attachedDateTime: '2026-07-13T14:00:00Z' }),
      imageRecord({ attachedDateTime: '2026-07-13T11:00:00Z' }),
      newestDefault,
      imageRecord({ isProductImage: false, attachedDateTime: '2026-07-13T15:00:00Z' }),
    ])).toBe(newestDefault);
  });

  it('herkent D365 NoYes-enumwaarden als productafbeeldingsvlaggen', () => {
    const record = imageRecord({ isProductImage: 'Yes', isDefaultProductImage: 'Yes' });
    expect(selectDefaultProductImage([record])).toBe(record);
  });

  it('gebruikt het vaste standaard entity path, ItemNumber en bestaande company-scope', async () => {
    const { fetchEntityRecordsFn, service } = createService([imageRecord()]);

    await service.getProductImage(validInput);

    expect(fetchEntityRecordsFn).toHaveBeenCalledWith({
      sourceEntity: PRODUCT_IMAGE_ENTITY_PATH,
      top: 100,
      skip: 0,
      fetchAll: true,
      maxItems: 100,
      extraFilter: "dataAreaId eq 'USMF' and ItemNumber eq 'ITEM-001'",
      selectFields: PRODUCT_IMAGE_SELECT_FIELDS,
    });
    expect(PRODUCT_IMAGE_ENTITY_PATH).toBe('/data/ReleasedProductDocumentAttachments');
  });

  it.each([
    ['jpeg', 'jpeg', jpeg],
    ['png', '.PNG', png],
    ['webp', 'image/webp', webp],
  ])('decodeert en serveert een geldige %s', async (_label, fileType, bytes) => {
    const { service } = createService([
      imageRecord({ fileType, attachment: bytes.toString('base64') }),
    ]);

    await expect(service.getProductImage(validInput)).resolves.toMatchObject({
      contentType: fileType.toLowerCase().includes('png')
        ? 'image/png'
        : fileType.toLowerCase().includes('webp') ? 'image/webp' : 'image/jpeg',
      content: bytes,
    });
  });

  it.each([
    ['geen records', []],
    ['geen default', [imageRecord({ isDefaultProductImage: false })]],
    ['geen Attachment', [imageRecord({ attachment: '' })]],
  ])('retourneert null bij %s', async (_label, items) => {
    const { service } = createService(items);
    await expect(service.getProductImage(validInput)).resolves.toBeNull();
  });

  it('cachet alleen succesvolle afbeeldingen en beschermt de gecachete buffer', async () => {
    const { fetchEntityRecordsFn, service } = createService([imageRecord()]);
    const first = await service.getProductImage(validInput);
    first.content.fill(0);
    const second = await service.getProductImage(validInput);

    expect(fetchEntityRecordsFn).toHaveBeenCalledTimes(1);
    expect(second.content.equals(jpeg)).toBe(true);
  });

  it('cachet ontbrekende afbeeldingen niet', async () => {
    const { fetchEntityRecordsFn, service } = createService([]);
    await service.getProductImage(validInput);
    await service.getProductImage(validInput);
    expect(fetchEntityRecordsFn).toHaveBeenCalledTimes(2);
  });

  it('haalt een afbeelding na het verlopen van de TTL opnieuw op', async () => {
    let currentTime = 1_000;
    const fetchEntityRecordsFn = vi.fn().mockResolvedValue({ items: [imageRecord()] });
    const service = createProductImageService({
      fetchEntityRecordsFn,
      now: () => currentTime,
    });

    await service.getProductImage(validInput);
    currentTime += CACHE_TTL_MS + 1;
    await service.getProductImage(validInput);

    expect(fetchEntityRecordsFn).toHaveBeenCalledTimes(2);
  });

  it('begrensd de cache en verwijdert het oudste item', async () => {
    const fetchEntityRecordsFn = vi.fn().mockResolvedValue({ items: [imageRecord()] });
    const service = createProductImageService({ fetchEntityRecordsFn });

    for (let index = 0; index <= 500; index += 1) {
      await service.getProductImage({ dataAreaId: 'USMF', itemNumber: `ITEM-${index}` });
    }
    expect(service.cacheSize()).toBe(500);

    await service.getProductImage({ dataAreaId: 'USMF', itemNumber: 'ITEM-0' });
    expect(fetchEntityRecordsFn).toHaveBeenCalledTimes(502);
  });

  it.each([
    ['niet-toegestaan bestandstype', imageRecord({ fileType: 'svg' })],
    ['onjuiste JPEG-signatuur', imageRecord({ attachment: png.toString('base64'), fileType: 'jpg' })],
    ['ongeldige Base64', imageRecord({ attachment: 'not valid base64!' })],
  ])('weigert %s', async (_label, record) => {
    const { service } = createService([record]);
    await expect(service.getProductImage(validInput)).rejects.toBeInstanceOf(ProductImageServiceError);
  });

  it('weigert een payload groter dan 5 MB vóór Base64-decodering', async () => {
    const tooLargeBase64 = 'A'.repeat(Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 4);
    const { service } = createService([imageRecord({ attachment: tooLargeBase64 })]);
    await expect(service.getProductImage(validInput)).rejects.toBeInstanceOf(ProductImageServiceError);
  });

  it('accepteert een geldige afbeelding van exact 5 MB', async () => {
    const exactLimit = Buffer.alloc(MAX_IMAGE_BYTES);
    jpeg.copy(exactLimit, 0);
    const { service } = createService([
      imageRecord({ attachment: exactLimit.toString('base64') }),
    ]);

    const image = await service.getProductImage(validInput);
    expect(image.content).toHaveLength(MAX_IMAGE_BYTES);
  });

  it('vertaalt een ontbrekende standaardentiteit veilig naar een 502-servicefout', async () => {
    const fetchEntityRecordsFn = vi.fn().mockRejectedValue(new Error('entity does not exist'));
    const service = createProductImageService({ fetchEntityRecordsFn });

    await expect(service.getProductImage(validInput)).rejects.toMatchObject({ status: 502 });
  });
});
