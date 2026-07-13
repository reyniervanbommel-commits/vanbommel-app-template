'use strict';

const {
  MAX_IMAGE_BYTES,
  ProductImageServiceError,
  buildCacheKey,
  createProductImageService,
  resolveTrustedServiceUrl,
  validateProductImageInput,
} = require('./ProductImageService');

const validInput = { dataAreaId: 'USMF', itemNumber: 'ITEM-001' };
const imageBase64 = Buffer.from('image-data').toString('base64');
const originalTrustedOrigin = process.env.D365_PRODUCT_IMAGE_TRUSTED_ORIGIN;

function createSettings({
  baseUrl = 'https://d365.example',
  serviceUrl = 'https://d365.example/api/services/VBProductImageService/getProductImage',
} = {}) {
  return {
    getAsync: vi.fn((key, fallback = '') => {
      if (key === 'D365_ODATA_BASE_URL') return baseUrl;
      if (key === 'D365_PRODUCT_IMAGE_SERVICE_URL') return serviceUrl;
      if (key === 'D365_PRODUCT_IMAGE_TIMEOUT_MS') return '1000';
      return fallback;
    }),
  };
}

describe('ProductImageService', () => {
  beforeEach(() => {
    process.env.D365_PRODUCT_IMAGE_TRUSTED_ORIGIN = 'https://d365.example';
  });

  afterAll(() => {
    if (originalTrustedOrigin === undefined) {
      delete process.env.D365_PRODUCT_IMAGE_TRUSTED_ORIGIN;
    } else {
      process.env.D365_PRODUCT_IMAGE_TRUSTED_ORIGIN = originalTrustedOrigin;
    }
  });

  it('valideert uitsluitend verwachte dataAreaId- en itemNumber-waarden', () => {
    expect(validateProductImageInput(validInput)).toEqual(validInput);
    expect(validateProductImageInput({ dataAreaId: 'USMF', itemNumber: '../secret' })).toBeNull();
    expect(validateProductImageInput({ dataAreaId: 'USMF;', itemNumber: 'ITEM-001' })).toBeNull();
  });

  it('maakt ondubbelzinnige cache-sleutels', () => {
    expect(buildCacheKey({ dataAreaId: 'AB', itemNumber: 'C' }))
      .not.toBe(buildCacheKey({ dataAreaId: 'A', itemNumber: 'BC' }));
  });

  it('leidt een relatieve productimage-servicepath af vanaf de D365-origin', () => {
    expect(resolveTrustedServiceUrl(
      'https://d365.example',
      'https://d365.example/finance',
      '/api/services/VBProductImageService/getProductImage'
    )).toBe('https://d365.example/api/services/VBProductImageService/getProductImage');
  });

  it('haalt de custom service aan met OAuth-token en cachet een geldige afbeelding', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ found: true, contentType: 'image/jpeg', contentBase64: imageBase64 }),
    });
    const getAccessTokenFn = vi.fn().mockResolvedValue('d365-token');
    const service = createProductImageService({
      settings: createSettings(),
      getAccessTokenFn,
      fetchFn,
    });

    const first = await service.getProductImage(validInput);
    first.content.fill(0);
    const second = await service.getProductImage(validInput);

    expect(first.contentType).toBe('image/jpeg');
    expect(second.contentType).toBe('image/jpeg');
    expect(second.content.equals(Buffer.from('image-data'))).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(getAccessTokenFn).toHaveBeenCalledTimes(1);
    const [url, options] = fetchFn.mock.calls[0];
    expect(url).toBe('https://d365.example/api/services/VBProductImageService/getProductImage');
    expect(options.headers.Authorization).toBe('Bearer d365-token');
    expect(JSON.parse(options.body)).toEqual(validInput);
  });

  it('retourneert null voor een ontbrekende afbeelding zonder die te cachen', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ found: false }),
    });
    const service = createProductImageService({
      settings: createSettings(),
      getAccessTokenFn: vi.fn().mockResolvedValue('token'),
      fetchFn,
    });

    await expect(service.getProductImage(validInput)).resolves.toBeNull();
    await expect(service.getProductImage(validInput)).resolves.toBeNull();

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['image/svg+xml', imageBase64],
    ['image/png', 'not valid base64!'],
  ])('weigert onveilige response %s', async (contentType, contentBase64) => {
    const service = createProductImageService({
      settings: createSettings(),
      getAccessTokenFn: vi.fn().mockResolvedValue('token'),
      fetchFn: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ found: true, contentType, contentBase64 }),
      }),
    });

    await expect(service.getProductImage(validInput)).rejects.toBeInstanceOf(ProductImageServiceError);
  });

  it('weigert een payload groter dan 5 MB vóór Base64-decodering', async () => {
    const tooLargeBase64 = 'A'.repeat(Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 4);
    const service = createProductImageService({
      settings: createSettings(),
      getAccessTokenFn: vi.fn().mockResolvedValue('token'),
      fetchFn: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ found: true, contentType: 'image/jpeg', contentBase64: tooLargeBase64 }),
      }),
    });

    await expect(service.getProductImage(validInput)).rejects.toBeInstanceOf(ProductImageServiceError);
  });

  it('maskert fouten van de D365 custom service', async () => {
    const service = createProductImageService({
      settings: createSettings(),
      getAccessTokenFn: vi.fn().mockResolvedValue('token'),
      fetchFn: vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    });

    await expect(service.getProductImage(validInput)).rejects.toMatchObject({ status: 502 });
  });

  it.each([
    ['afwijkende host', 'https://untrusted.example/api/services/VBProductImageService/getProductImage'],
    ['afwijkende poort', 'https://d365.example:444/api/services/VBProductImageService/getProductImage'],
    ['afwijkend protocol', 'http://d365.example/api/services/VBProductImageService/getProductImage'],
  ])('verzendt nooit een bearer-token naar een %s', async (_label, serviceUrl) => {
    const fetchFn = vi.fn();
    const getAccessTokenFn = vi.fn().mockResolvedValue('d365-token');
    const service = createProductImageService({
      settings: createSettings({ serviceUrl }),
      getAccessTokenFn,
      fetchFn,
    });

    await expect(service.getProductImage(validInput)).rejects.toBeInstanceOf(ProductImageServiceError);

    expect(getAccessTokenFn).not.toHaveBeenCalled();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('faalt veilig als de deployment trust anchor ontbreekt', async () => {
    const getAccessTokenFn = vi.fn().mockResolvedValue('cached-d365-token');
    const fetchFn = vi.fn();
    const service = createProductImageService({
      settings: createSettings(),
      getAccessTokenFn,
      fetchFn,
      trustedOrigin: '',
    });

    await expect(service.getProductImage(validInput)).rejects.toBeInstanceOf(ProductImageServiceError);

    expect(getAccessTokenFn).not.toHaveBeenCalled();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('weigert extern gewijzigde base- en service-URLs vóór gebruik van een gecachet token', async () => {
    const getAccessTokenFn = vi.fn().mockResolvedValue('cached-d365-token');
    const fetchFn = vi.fn();
    const service = createProductImageService({
      settings: createSettings({
        baseUrl: 'https://external.example/odata',
        serviceUrl: 'https://external.example/api/services/VBProductImageService/getProductImage',
      }),
      getAccessTokenFn,
      fetchFn,
    });

    await expect(service.getProductImage(validInput)).rejects.toBeInstanceOf(ProductImageServiceError);

    expect(getAccessTokenFn).not.toHaveBeenCalled();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
