/**
 * SHES Tests – API Client (tokenStorage)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { tokenStorage } from '@/api/client'

describe('tokenStorage', () => {
  beforeEach(() => {
    tokenStorage.clear()
  })

  it('getAccess returns null when empty', () => {
    expect(tokenStorage.getAccess()).toBeNull()
  })

  it('setAccess stores a value', () => {
    tokenStorage.setAccess('my-access-token')
    expect(tokenStorage.getAccess()).toBe('my-access-token')
  })

  it('getRefresh returns null when empty', () => {
    expect(tokenStorage.getRefresh()).toBeNull()
  })

  it('setRefresh stores a value', () => {
    tokenStorage.setRefresh('my-refresh-token')
    expect(tokenStorage.getRefresh()).toBe('my-refresh-token')
  })

  it('setTokens stores both tokens', () => {
    tokenStorage.setTokens('acc', 'ref')
    expect(tokenStorage.getAccess()).toBe('acc')
    expect(tokenStorage.getRefresh()).toBe('ref')
  })

  it('clear removes all tokens', () => {
    tokenStorage.setTokens('acc', 'ref')
    tokenStorage.clear()
    expect(tokenStorage.getAccess()).toBeNull()
    expect(tokenStorage.getRefresh()).toBeNull()
  })
})
