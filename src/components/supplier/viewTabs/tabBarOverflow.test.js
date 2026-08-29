import { describe, expect, it } from 'vitest';
import { measureTabBarOverflow, nextTabBarScrollLeft, tabBarWheelDelta, nextTabBarDragScrollLeft, createTabBarDragSession } from './tabBarOverflow';

describe('measureTabBarOverflow', () => {
  it('geeft geen overflow zonder element of wanneer alles past', () => {
    expect(measureTabBarOverflow(null)).toEqual({
      overflow: false,
      canScrollLeft: false,
      canScrollRight: false,
    });
    expect(measureTabBarOverflow({ scrollLeft: 0, clientWidth: 400, scrollWidth: 400 })).toEqual({
      overflow: false,
      canScrollLeft: false,
      canScrollRight: false,
    });
  });

  it('toont rechts-scroll aan het begin en links-scroll aan het eind', () => {
    expect(measureTabBarOverflow({ scrollLeft: 0, clientWidth: 200, scrollWidth: 500 })).toEqual({
      overflow: true,
      canScrollLeft: false,
      canScrollRight: true,
    });
    expect(measureTabBarOverflow({ scrollLeft: 300, clientWidth: 200, scrollWidth: 500 })).toEqual({
      overflow: true,
      canScrollLeft: true,
      canScrollRight: false,
    });
  });

  it('toont beide richtingen in het midden', () => {
    expect(measureTabBarOverflow({ scrollLeft: 80, clientWidth: 200, scrollWidth: 500 })).toEqual({
      overflow: true,
      canScrollLeft: true,
      canScrollRight: true,
    });
  });
});

describe('tabBarWheelDelta', () => {
  it('kiest de dominante as', () => {
    expect(tabBarWheelDelta(40, 8)).toBe(40);
    expect(tabBarWheelDelta(4, 30)).toBe(30);
  });
});

describe('nextTabBarScrollLeft', () => {
  it('stapt een pagina en klemt binnen de range', () => {
    const el = { scrollLeft: 0, clientWidth: 200, scrollWidth: 500 };
    expect(nextTabBarScrollLeft(el, 1)).toBe(140);
    expect(nextTabBarScrollLeft({ ...el, scrollLeft: 280 }, 1)).toBe(300);
    expect(nextTabBarScrollLeft({ ...el, scrollLeft: 40 }, -1)).toBe(0);
  });
});

describe('nextTabBarDragScrollLeft', () => {
  it('schuift tegen de sleeprichting in en klemt', () => {
    const el = { scrollLeft: 100, clientWidth: 200, scrollWidth: 500 };
    expect(nextTabBarDragScrollLeft(el, 40)).toBe(60);
    expect(nextTabBarDragScrollLeft(el, -80)).toBe(180);
    expect(nextTabBarDragScrollLeft({ ...el, scrollLeft: 10 }, 40)).toBe(0);
    expect(nextTabBarDragScrollLeft({ ...el, scrollLeft: 280 }, -80)).toBe(300);
  });
});

describe('createTabBarDragSession', () => {
  it('negeert kleine beweging en start daarna met slepen', () => {
    const session = createTabBarDragSession();
    session.start(50, 80);
    expect(session.move(53)).toBeNull();
    expect(session.isDragging()).toBe(false);
    expect(session.move(60)).toBe(70);
    expect(session.isDragging()).toBe(true);
  });
});

