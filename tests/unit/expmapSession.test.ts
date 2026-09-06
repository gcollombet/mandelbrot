import { expect, it, vi } from 'vitest'
import { parkExpmapSession } from '../../src/expmap/session'
it('restores exact camera once and releases the parked renderer even on restoration failure', () => {
  const release = vi.fn(), engine = { suspendForExpmapPlayback: vi.fn(() => release) }
  const nav = { cancel_transition: vi.fn(), origin: vi.fn(), scale: vi.fn(), angle: vi.fn() }
  const controller = { getParams: (): [string, string, string, string] => ['0.1234567890123456789', '2', '1e-1000', '0.3'], getNavigator: () => nav }
  const restore = parkExpmapSession(engine, controller)
  expect(nav.cancel_transition).toHaveBeenCalledOnce()
  restore(); restore()
  expect(nav.origin).toHaveBeenCalledWith('0.1234567890123456789', '2'); expect(nav.scale).toHaveBeenCalledWith('1e-1000'); expect(release).toHaveBeenCalledOnce()
  const failed = parkExpmapSession(engine, controller)
  nav.origin.mockImplementation(() => { throw new Error('Device disposed') })
  expect(failed).toThrow(); expect(release).toHaveBeenCalledTimes(2)
})
