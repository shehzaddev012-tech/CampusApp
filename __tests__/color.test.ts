import { hexToRgb, luminance, mix, readableOn, rgbToHex, withAlpha } from '../src/theme/color';

describe('color helpers', () => {
  it('converts hex <-> rgb', () => {
    expect(hexToRgb('#4F46E5')).toEqual([79, 70, 229]);
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
    expect(rgbToHex(79, 70, 229)).toBe('#4f46e5');
  });

  it('applies alpha', () => {
    expect(withAlpha('#000000', 0.5)).toBe('rgba(0,0,0,0.5)');
  });

  it('mixes colours linearly', () => {
    expect(mix('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(mix('#000000', '#FFFFFF', 1)).toBe('#ffffff');
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
  });

  it('picks readable text colour', () => {
    expect(readableOn('#FFFFFF')).toBe('#0E1330');
    expect(readableOn('#000000')).toBe('#FFFFFF');
    expect(luminance('#FFFFFF')).toBeGreaterThan(luminance('#000000'));
  });
});
