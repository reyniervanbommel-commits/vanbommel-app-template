'use strict';

const express = require('express');
const { createMediaRouter } = require('./media');

const validQuery = 'dataAreaId=USMF&itemNumber=ITEM-001';

async function requestMedia({ role = 'employee', serviceResult, query = validQuery }) {
  const productImageService = {
    getProductImage: vi.fn().mockImplementation(async () => {
      if (serviceResult instanceof Error) throw serviceResult;
      return serviceResult;
    }),
  };
  const timeFn = vi.fn(async (_label, callback) => callback());
  const app = express();
  app.use((req, _res, next) => {
    req.session = { userId: 1, user: { id: 1, role } };
    next();
  });
  app.use('/api/media', createMediaRouter({
    productImageService,
    rateLimiter: (_req, _res, next) => next(),
    timeFn,
  }));

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/media/product-image?${query}`);
    return {
      status: response.status,
      cacheControl: response.headers.get('cache-control'),
      contentType: response.headers.get('content-type'),
      body: Buffer.from(await response.arrayBuffer()),
      productImageService,
      timeFn,
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

describe('GET /api/media/product-image', () => {
  it('stuurt een toegestane afbeelding met private cache-control naar een medewerker', async () => {
    const result = await requestMedia({
      serviceResult: { contentType: 'image/webp', content: Buffer.from('webp-data') },
    });

    expect(result.status).toBe(200);
    expect(result.contentType).toContain('image/webp');
    expect(result.cacheControl).toBe('private, max-age=900');
    expect(result.body.equals(Buffer.from('webp-data'))).toBe(true);
    expect(result.productImageService.getProductImage).toHaveBeenCalledWith({
      dataAreaId: 'USMF',
      itemNumber: 'ITEM-001',
    });
    expect(result.timeFn).toHaveBeenCalledWith('product_image_d365', expect.any(Function));
  });

  it('weigert ongeldige en niet-ondersteunde queryparameters met 400', async () => {
    const result = await requestMedia({
      serviceResult: null,
      query: `${validQuery}&url=https://untrusted.example/image.png`,
    });

    expect(result.status).toBe(400);
    expect(result.cacheControl).toBe('no-store');
    expect(result.productImageService.getProductImage).not.toHaveBeenCalled();
  });

  it('geeft 204 terug voor een ontbrekende afbeelding', async () => {
    const result = await requestMedia({ serviceResult: null });

    expect(result.status).toBe(204);
    expect(result.cacheControl).toBe('no-store');
    expect(result.body).toHaveLength(0);
  });

  it('weigert suppliers met 403 voordat de image-service wordt aangeroepen', async () => {
    const result = await requestMedia({ role: 'supplier', serviceResult: null });

    expect(result.status).toBe(403);
    expect(result.productImageService.getProductImage).not.toHaveBeenCalled();
  });

  it('maskeert D365-fouten als 502 zonder externe details', async () => {
    const result = await requestMedia({
      serviceResult: new Error('D365 token abc123 or Blob path'),
    });

    expect(result.status).toBe(502);
    expect(result.cacheControl).toBe('no-store');
    expect(result.body.toString()).toContain('Productafbeelding is tijdelijk niet beschikbaar');
    expect(result.body.toString()).not.toContain('abc123');
  });
});
