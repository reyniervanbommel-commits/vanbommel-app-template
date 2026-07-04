import { describe, it, expect } from 'vitest';
import { resolveImageUrl } from './imageColumnUrl';

function imageColumn(options) {
  return { label: 'Plaatje', dataType: 'image', source: 'custom', options };
}

describe('resolveImageUrl', () => {
  it('substitueert de bronwaarde in {xxx} en encodeert met encodeURIComponent', () => {
    const column = imageColumn({
      urlTemplate: 'https://cdn.example.com/img/{xxx}.jpg',
      sourceColumnKey: 'itemId',
    });
    const url = resolveImageUrl(column, { itemId: 'AB 12&34' });
    // Spatie -> %20, & -> %26
    expect(url).toBe('https://cdn.example.com/img/AB%2012%2634.jpg');
  });

  it('vervangt alle voorkomens van {xxx}', () => {
    const column = imageColumn({
      urlTemplate: 'https://x.io/{xxx}/thumb/{xxx}.png',
      sourceColumnKey: 'code',
    });
    expect(resolveImageUrl(column, { code: 'A1' })).toBe('https://x.io/A1/thumb/A1.png');
  });

  it('geeft lege string bij ontbrekende bronwaarde', () => {
    const column = imageColumn({
      urlTemplate: 'https://x.io/{xxx}.jpg',
      sourceColumnKey: 'itemId',
    });
    expect(resolveImageUrl(column, {})).toBe('');
    expect(resolveImageUrl(column, { itemId: null })).toBe('');
    expect(resolveImageUrl(column, { itemId: '' })).toBe('');
    expect(resolveImageUrl(column, undefined)).toBe('');
  });

  it('geeft lege string bij ontbrekende options-velden', () => {
    expect(resolveImageUrl({ dataType: 'image' }, { itemId: 'x' })).toBe('');
    expect(resolveImageUrl(imageColumn({ urlTemplate: 'https://x.io/{xxx}' }), { itemId: 'x' })).toBe('');
    expect(resolveImageUrl(imageColumn({ sourceColumnKey: 'itemId' }), { itemId: 'x' })).toBe('');
  });

  it('geeft lege string bij een niet-http(s) template', () => {
    expect(resolveImageUrl(imageColumn({
      urlTemplate: 'javascript:alert(1)//{xxx}',
      sourceColumnKey: 'itemId',
    }), { itemId: 'x' })).toBe('');
    expect(resolveImageUrl(imageColumn({
      urlTemplate: '/relatief/{xxx}.jpg',
      sourceColumnKey: 'itemId',
    }), { itemId: 'x' })).toBe('');
    expect(resolveImageUrl(imageColumn({
      urlTemplate: 'data:image/png;base64,{xxx}',
      sourceColumnKey: 'itemId',
    }), { itemId: 'x' })).toBe('');
  });

  it('past transform trim toe', () => {
    const column = imageColumn({
      urlTemplate: 'https://x.io/{xxx}.jpg',
      sourceColumnKey: 'itemId',
      transforms: [{ type: 'trim' }],
    });
    expect(resolveImageUrl(column, { itemId: '  A1  ' })).toBe('https://x.io/A1.jpg');
  });

  it('past transform remove toe (alle voorkomens)', () => {
    const column = imageColumn({
      urlTemplate: 'https://x.io/{xxx}.jpg',
      sourceColumnKey: 'itemId',
      transforms: [{ type: 'remove', value: '-' }],
    });
    expect(resolveImageUrl(column, { itemId: 'A-1-2-3' })).toBe('https://x.io/A123.jpg');
  });

  it('past transform replace toe (alle voorkomens)', () => {
    const column = imageColumn({
      urlTemplate: 'https://x.io/{xxx}.jpg',
      sourceColumnKey: 'itemId',
      transforms: [{ type: 'replace', from: ' ', to: '_' }],
    });
    expect(resolveImageUrl(column, { itemId: 'a b c' })).toBe('https://x.io/a_b_c.jpg');
  });

  it('past transform substring toe met start en end', () => {
    const column = imageColumn({
      urlTemplate: 'https://x.io/{xxx}.jpg',
      sourceColumnKey: 'itemId',
      transforms: [{ type: 'substring', start: 3, end: 7 }],
    });
    // 'PO-123456'.substring(3, 7) === '1234'
    expect(resolveImageUrl(column, { itemId: 'PO-123456' })).toBe('https://x.io/1234.jpg');
  });

  it('past transform substring toe met alleen start', () => {
    const column = imageColumn({
      urlTemplate: 'https://x.io/{xxx}.jpg',
      sourceColumnKey: 'itemId',
      transforms: [{ type: 'substring', start: 3 }],
    });
    expect(resolveImageUrl(column, { itemId: 'PO-123' })).toBe('https://x.io/123.jpg');
  });

  it('past meerdere transforms in volgorde toe', () => {
    const column = imageColumn({
      urlTemplate: 'https://x.io/{xxx}.jpg',
      sourceColumnKey: 'itemId',
      // trim -> remove 'PO' -> replace '-' door '' -> substring vanaf 0
      transforms: [
        { type: 'trim' },
        { type: 'remove', value: 'PO' },
        { type: 'replace', from: '-', to: '' },
      ],
    });
    expect(resolveImageUrl(column, { itemId: '  PO-12-34  ' })).toBe('https://x.io/1234.jpg');
  });

  it('slaat ongeldige/onbekende transforms veilig over zonder te crashen', () => {
    const column = imageColumn({
      urlTemplate: 'https://x.io/{xxx}.jpg',
      sourceColumnKey: 'itemId',
      transforms: [
        null,
        { type: 'onbekend' },
        { type: 'remove' }, // ontbrekende value
        { type: 'substring' }, // ontbrekende start
        { type: 'trim' },
      ],
    });
    expect(resolveImageUrl(column, { itemId: ' A1 ' })).toBe('https://x.io/A1.jpg');
  });

  it('converteert niet-string bronwaarden naar string', () => {
    const column = imageColumn({
      urlTemplate: 'https://x.io/{xxx}.jpg',
      sourceColumnKey: 'nr',
    });
    expect(resolveImageUrl(column, { nr: 12345 })).toBe('https://x.io/12345.jpg');
  });
});
