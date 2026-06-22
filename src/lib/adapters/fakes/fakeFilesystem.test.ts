import { describe, it, expect } from 'vitest';
import { createFakeFilesystem } from './fakeFilesystem';

describe('fakeFilesystem', () => {
  it('download stores a file and reports progress', async () => {
    const { adapter, state } = createFakeFilesystem();
    const ticks: number[] = [];
    const uri = await adapter.download('http://x/rain.wav', 'sounds/rain.wav', (p) => ticks.push(p.loaded));
    expect(uri).toMatch(/rain\.wav$/);
    expect(state.files['sounds/rain.wav']).toBeGreaterThan(0);
    expect(ticks.length).toBeGreaterThan(0);
  });
  it('download rejects when the url is configured to fail, leaving no file', async () => {
    const { adapter } = createFakeFilesystem({ failUrls: ['http://x/bad.wav'] });
    await expect(adapter.download('http://x/bad.wav', 'sounds/bad.wav')).rejects.toThrow();
    expect(await adapter.sizeOf('sounds/bad.wav')).toBeNull();
  });
  it('move renames, remove deletes, dirSize sums', async () => {
    const { adapter } = createFakeFilesystem();
    await adapter.download('http://x/a.wav', 'sounds/.tmp-a.wav');
    await adapter.move('sounds/.tmp-a.wav', 'sounds/a.wav');
    expect(await adapter.uriOf('sounds/a.wav')).toMatch(/a\.wav$/);
    expect(await adapter.uriOf('sounds/.tmp-a.wav')).toBeNull();
    expect(await adapter.dirSize('sounds')).toBeGreaterThan(0);
    await adapter.remove('sounds/a.wav');
    expect(await adapter.sizeOf('sounds/a.wav')).toBeNull();
  });
});
