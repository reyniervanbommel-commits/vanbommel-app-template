import { describe, expect, it } from 'vitest';
import { resolveImageUrl } from './imageColumnUrl';

function imageColumn(options) {
  return { label: 'Plaatje', dataType: 'image', source: 'custom', options };
}

describe('resolveImageUrl', () => {
  it('vervangt {xxx} en encodeert de bronwaarde', () => {
    const column = imageColumn({
      urlTemplate: 'https://cdn.example.com/img/{xxx}.jpg',
      sourceColumnKey: 'itemId',
    });
    const url = resolveImageUrl(column, { itemId: 'AB 12&34' });
    expect(url).toBe('https://cdn.example.com/img/AB%2012%2634.jpg');
  });

  it('vervangt alle voorkomens van {xxx}', () => {
    const column = imageColumn({
      urlTemplate: 'https://x.io/{xxx}/thumb/{xxx}.png',
      sourceColumnKey: 'code',
    });
    expect(resolveImageUrl(column, { code: 'A1' })).toBe('https://x.io/A1/thumb/A1.png');
  });

  it('geeft lege string bij ontbrekende of onveilige configuratie', () => {
    expect(resolveImageUrl({ dataType: 'image' }, { itemId: 'x' })).toBe('');
    expect(resolveImageUrl(imageColumn({ urlTemplate: 'https://x.io/{xxx}' }), { itemId: 'x' })).toBe('');
    expect(resolveImageUrl(imageColumn({ sourceColumnKey: 'itemId' }), { itemId: 'x' })).toBe('');
    expect(resolveImageUrl(imageColumn({
      urlTemplate: 'javascript:alert(1)',
      sourceColumnKey: 'itemId',
    }), { itemId: 'x' })).toBe('');
  });

  it('past transforms in volgorde toe', () => {
    const column = imageColumn({
      urlTemplate: 'https://x.io/{xxx}.jpg',
      sourceColumnKey: 'itemId',
      transforms: [
        { type: 'trim' },
        { type: 'remove', value: 'PO' },
        { type: 'replace', from: '-', to: '' },
      ],
    });
    expect(resolveImageUrl(column, { itemId: '  PO-12-34  ' })).toBe('https://x.io/1234.jpg');
  });

  it('slaat ongeldige transforms over zonder crash', () => {
    const column = imageColumn({
      urlTemplate: 'https://x.io/{xxx}.jpg',
      sourceColumnKey: 'itemId',
      transforms: [
        { type: 'substring' },
        { type: 'onbekend' },
        { type: 'trim' },
      ],
    });
    expect(resolveImageUrl(column, { itemId: ' A1 ' })).toBe('https://x.io/A1.jpg');
  });
});
