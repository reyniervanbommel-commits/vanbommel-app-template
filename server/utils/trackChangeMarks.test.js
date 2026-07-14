'use strict';

const { MARK_COUNT, buildMarkPattern } = require('../utils/trackChangeMarks');

describe('buildMarkPattern', () => {
  it('has five slots and a fully active window by default', () => {
    // activeOffset = max → alle afgeronde buckets zijn geel, huidige (rechts) grijs
    expect(buildMarkPattern([], MARK_COUNT - 1)).toBe('yyyyg');
  });

  it('marks the current bucket red on the rightmost slot', () => {
    // offset 0 = meest rechtse slot
    expect(buildMarkPattern([0], MARK_COUNT - 1)).toBe('yyyyr');
  });

  it('shifts red to the left as a new session/week starts', () => {
    // wijziging in vorige bucket (offset 1) staat één slot naar links
    expect(buildMarkPattern([1], MARK_COUNT - 1)).toBe('yyyrg');
  });

  it('paints completed buckets without change yellow and the running bucket grey', () => {
    expect(buildMarkPattern([2], MARK_COUNT - 1)).toBe('yyryg');
  });

  it('slides the window: only the newest five buckets fit', () => {
    // offset 4 = oudste zichtbare bucket (meest links)
    expect(buildMarkPattern([4], MARK_COUNT - 1)).toBe('ryyyg');
  });

  it('supports multiple red offsets', () => {
    expect(buildMarkPattern([0, 3], MARK_COUNT - 1)).toBe('yryyr');
  });

  it('fresh start: buckets before activation stay grey instead of yellow', () => {
    // activeOffset 1 → alleen offset 1 mag geel; oudere buckets (2..4) grijs
    expect(buildMarkPattern([], 1)).toBe('gggyg');
  });

  it('fresh start still shows red for a change even before activation window', () => {
    // rood heeft voorrang op grijs
    expect(buildMarkPattern([3], 1)).toBe('grgyg');
  });

  it('activeOffset 0 keeps everything grey except reds', () => {
    expect(buildMarkPattern([], 0)).toBe('ggggg');
    expect(buildMarkPattern([2], 0)).toBe('ggrgg');
  });
});
