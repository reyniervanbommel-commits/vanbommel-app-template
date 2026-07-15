'use strict';

const { MARK_COUNT, buildMarkPattern } = require('../utils/trackChangeMarks');

describe('buildMarkPattern', () => {
  it('has eight slots and a fully active window by default', () => {
    // activeOffset = max → alle afgeronde buckets zijn geel, huidige (rechts) grijs
    expect(buildMarkPattern([], MARK_COUNT - 1)).toBe('yyyyyyyg');
  });

  it('marks the current bucket red on the rightmost slot', () => {
    // offset 0 = meest rechtse slot
    expect(buildMarkPattern([0], MARK_COUNT - 1)).toBe('yyyyyyyr');
  });

  it('shifts red to the left as a new session/week starts', () => {
    // wijziging in vorige bucket (offset 1) staat één slot naar links
    expect(buildMarkPattern([1], MARK_COUNT - 1)).toBe('yyyyyyrg');
  });

  it('paints completed buckets without change yellow and the running bucket grey', () => {
    expect(buildMarkPattern([2], MARK_COUNT - 1)).toBe('yyyyyryg');
  });

  it('slides the window: only the newest eight buckets fit', () => {
    // offset 7 = oudste zichtbare bucket (meest links)
    expect(buildMarkPattern([7], MARK_COUNT - 1)).toBe('ryyyyyyg');
  });

  it('supports multiple red offsets', () => {
    expect(buildMarkPattern([0, 3], MARK_COUNT - 1)).toBe('yyyyryyr');
  });

  it('fresh start: buckets before activation stay grey instead of yellow', () => {
    // activeOffset 1 → alleen offset 1 mag geel; oudere buckets (2..7) grijs
    expect(buildMarkPattern([], 1)).toBe('ggggggyg');
  });

  it('fresh start still shows red for a change even before activation window', () => {
    // rood heeft voorrang op grijs
    expect(buildMarkPattern([3], 1)).toBe('ggggrgyg');
  });

  it('activeOffset 0 keeps everything grey except reds', () => {
    expect(buildMarkPattern([], 0)).toBe('gggggggg');
    expect(buildMarkPattern([2], 0)).toBe('gggggrgg');
  });
});
