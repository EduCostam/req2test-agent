import { beforeEach, afterEach, vi } from 'vitest';
import net from 'node:net';
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('External HTTP forbidden in tests'); }));
  vi.spyOn(net.Socket.prototype, 'connect').mockImplementation(() => { throw new Error('Network forbidden in tests'); });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
