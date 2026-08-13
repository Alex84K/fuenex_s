import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  apiFetch,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "./api"

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

describe("apiFetch — session refresh (regression for the session-freeze bug)", () => {
  const originalLocation = window.location
  let fetchMock: ReturnType<typeof vi.fn>
  let assignMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setTokens("stale-access-token", "some-refresh-token")
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    assignMock = vi.fn()
    // jsdom's window.location.assign is a read-only property (even on a
    // prototype-chained copy, plain assignment would throw), so it has to
    // be replaced with defineProperty on a stand-in object.
    const locationStub = Object.create(originalLocation) as Location
    Object.defineProperty(locationStub, "assign", {
      configurable: true,
      writable: true,
      value: assignMock,
    })
    Object.defineProperty(window, "location", {
      configurable: true,
      value: locationStub,
    })
  })

  afterEach(() => {
    clearTokens()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    })
  })

  it("resolves the sole in-flight request once the refresh succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(401, { error: { code: "TOKEN_EXPIRED" } }),
      ) // original /me
      .mockResolvedValueOnce(
        jsonResponse(200, {
          accessToken: "fresh-access-token",
          refreshToken: "fresh-refresh-token",
        }),
      ) // refresh
      .mockResolvedValueOnce(jsonResponse(200, { id: "u1" })) // retried /me

    const result = await apiFetch("/api/v1/me")

    expect(result).toEqual({ id: "u1" })
    expect(getAccessToken()).toBe("fresh-access-token")
    expect(getRefreshToken()).toBe("fresh-refresh-token")
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("rejects the sole in-flight request when the refresh itself gets a 401", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(401, { error: { code: "TOKEN_EXPIRED" } }),
      ) // original /me
      .mockResolvedValueOnce(
        jsonResponse(401, { error: { code: "INVALID_REFRESH" } }),
      ) // refresh fails

    await expect(apiFetch("/api/v1/me")).rejects.toThrow()

    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
    expect(assignMock).toHaveBeenCalledWith("/login")
  })

  it("rejects every queued request when a concurrent refresh fails", async () => {
    let resolveRefresh: (res: Response) => void = () => undefined
    const refreshPromise = new Promise<Response>(resolve => {
      resolveRefresh = resolve
    })

    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/auth/refresh")) return refreshPromise
      return Promise.resolve(
        jsonResponse(401, { error: { code: "TOKEN_EXPIRED" } }),
      )
    })

    const leader = apiFetch("/api/v1/me")
    // Let the leader's initial 401 + refresh call fire before the follower starts.
    await Promise.resolve()
    await Promise.resolve()
    const follower = apiFetch("/api/v1/projects")

    resolveRefresh(jsonResponse(401, { error: { code: "INVALID_REFRESH" } }))

    await expect(leader).rejects.toThrow()
    await expect(follower).rejects.toThrow()
    expect(assignMock).toHaveBeenCalledWith("/login")
  })
})
