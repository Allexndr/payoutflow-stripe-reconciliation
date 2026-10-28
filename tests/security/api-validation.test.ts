/**
 * Pentest-oriented input validation tests for Route Handlers.
 *
 * Strategy:
 *  - Mock `@/auth` so we control the session (unauthenticated / impersonate user).
 *  - Mock `@/db` so the "database configured" branch runs without network.
 *  - Mock `@/lib/payouts-service` to control whether the payout belongs to the caller.
 *  - Mock `@/lib/overrides` so we can assert *no* write happens on bad input.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db", () => ({
  isDatabaseConfigured: () => true,
  /** not used in this suite, but imported by route modules */
  getDb: () => ({}),
}));
vi.mock("@/lib/payouts-service", () => ({
  getPayoutDetail: vi.fn(),
  getBankTxnInputsForUser: vi.fn().mockResolvedValue([
    { id: "txn-user-a", amountCents: 100_000, date: "2026-04-05", name: "a" },
  ]),
}));
vi.mock("@/lib/overrides", () => ({
  setOverride: vi.fn().mockResolvedValue(undefined),
  clearOverride: vi.fn().mockResolvedValue(undefined),
  addComment: vi
    .fn()
    .mockResolvedValue({ id: "cmt1", body: "x", createdAt: new Date() }),
  listComments: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/demo-data", () => ({ DEMO_BANK_TXNS: [] }));

const USER_A = "00000000-0000-0000-0000-00000000000a";
const USER_B = "00000000-0000-0000-0000-00000000000b";

async function loadRoutes() {
  const match = await import(
    "@/app/api/payouts/[payoutId]/match/route"
  );
  const comments = await import(
    "@/app/api/payouts/[payoutId]/comments/route"
  );
  return { match, comments };
}

function req(body?: unknown): Request {
  return new Request("https://x.test/api/payouts/po_1/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function params(payoutId = "po_1") {
  return { params: Promise.resolve({ payoutId }) };
}

beforeEach(async () => {
  vi.clearAllMocks();
});

describe("POST /api/payouts/[id]/match — authz + validation", () => {
  it("returns 401 when no session", async () => {
    const { auth } = (await import("@/auth")) as unknown as {
      auth: ReturnType<typeof vi.fn>;
    };
    auth.mockResolvedValue(null);
    const { match } = await loadRoutes();
    const r = await match.POST(req({ bankTxnId: "txn-user-a" }), params());
    expect(r.status).toBe(401);
    const { setOverride } = await import("@/lib/overrides");
    expect(setOverride).not.toHaveBeenCalled();
  });

  it("returns 404 when payout is not owned by the caller (IDOR guard)", async () => {
    const { auth } = (await import("@/auth")) as unknown as {
      auth: ReturnType<typeof vi.fn>;
    };
    auth.mockResolvedValue({ user: { id: USER_B } });
    const { getPayoutDetail } = (await import(
      "@/lib/payouts-service"
    )) as unknown as { getPayoutDetail: ReturnType<typeof vi.fn> };
    /** User B tries to confirm a match on User A's payout → service returns null. */
    getPayoutDetail.mockImplementation(async (uid) =>
      uid === USER_A ? { id: "po_1" } : null,
    );
    const { match } = await loadRoutes();
    const r = await match.POST(req({ bankTxnId: "txn-user-a" }), params());
    expect(r.status).toBe(404);
    const { setOverride } = await import("@/lib/overrides");
    expect(setOverride).not.toHaveBeenCalled();
  });

  it("rejects missing bankTxnId with 400 and does not write", async () => {
    const { auth } = (await import("@/auth")) as unknown as {
      auth: ReturnType<typeof vi.fn>;
    };
    auth.mockResolvedValue({ user: { id: USER_A } });
    const { getPayoutDetail } = (await import(
      "@/lib/payouts-service"
    )) as unknown as { getPayoutDetail: ReturnType<typeof vi.fn> };
    getPayoutDetail.mockResolvedValue({ id: "po_1" });
    const { match } = await loadRoutes();
    const r = await match.POST(req({ note: "no txn id" }), params());
    expect(r.status).toBe(400);
    const { setOverride } = await import("@/lib/overrides");
    expect(setOverride).not.toHaveBeenCalled();
  });

  it("rejects absurdly long bankTxnId (>128) to avoid abuse", async () => {
    const { auth } = (await import("@/auth")) as unknown as {
      auth: ReturnType<typeof vi.fn>;
    };
    auth.mockResolvedValue({ user: { id: USER_A } });
    const { getPayoutDetail } = (await import(
      "@/lib/payouts-service"
    )) as unknown as { getPayoutDetail: ReturnType<typeof vi.fn> };
    getPayoutDetail.mockResolvedValue({ id: "po_1" });
    const { match } = await loadRoutes();
    const r = await match.POST(
      req({ bankTxnId: "x".repeat(200) }),
      params(),
    );
    expect(r.status).toBe(400);
  });

  it("rejects bank txn that is not in user's ledger (IDOR)", async () => {
    const { auth } = (await import("@/auth")) as unknown as {
      auth: ReturnType<typeof vi.fn>;
    };
    auth.mockResolvedValue({ user: { id: USER_A } });
    const { getPayoutDetail } = (await import(
      "@/lib/payouts-service"
    )) as unknown as { getPayoutDetail: ReturnType<typeof vi.fn> };
    getPayoutDetail.mockResolvedValue({ id: "po_1" });
    const { match } = await loadRoutes();
    const r = await match.POST(
      req({ bankTxnId: "txn-belongs-to-other-user" }),
      params(),
    );
    expect(r.status).toBe(400);
    const { setOverride } = await import("@/lib/overrides");
    expect(setOverride).not.toHaveBeenCalled();
  });

  it("truncates note to 500 chars (stores a bounded string)", async () => {
    const { auth } = (await import("@/auth")) as unknown as {
      auth: ReturnType<typeof vi.fn>;
    };
    auth.mockResolvedValue({ user: { id: USER_A } });
    const { getPayoutDetail } = (await import(
      "@/lib/payouts-service"
    )) as unknown as { getPayoutDetail: ReturnType<typeof vi.fn> };
    getPayoutDetail.mockResolvedValue({ id: "po_1" });
    const { match } = await loadRoutes();
    const longNote = "a".repeat(2000);
    const r = await match.POST(
      req({ bankTxnId: "txn-user-a", note: longNote }),
      params(),
    );
    expect(r.status).toBe(200);
    const { setOverride } = (await import("@/lib/overrides")) as unknown as {
      setOverride: ReturnType<typeof vi.fn>;
    };
    expect(setOverride).toHaveBeenCalledTimes(1);
    const call = setOverride.mock.calls[0]!;
    const savedNote = call[3] as string;
    expect(savedNote.length).toBeLessThanOrEqual(500);
  });
});

describe("POST /api/payouts/[id]/comments — validation", () => {
  it("rejects empty body", async () => {
    const { auth } = (await import("@/auth")) as unknown as {
      auth: ReturnType<typeof vi.fn>;
    };
    auth.mockResolvedValue({ user: { id: USER_A } });
    const { getPayoutDetail } = (await import(
      "@/lib/payouts-service"
    )) as unknown as { getPayoutDetail: ReturnType<typeof vi.fn> };
    getPayoutDetail.mockResolvedValue({ id: "po_1" });
    const { comments } = await loadRoutes();
    const r = await comments.POST(req({ body: "   " }), params());
    expect(r.status).toBe(400);
  });

  it("rejects too-long body (>2000 chars)", async () => {
    const { auth } = (await import("@/auth")) as unknown as {
      auth: ReturnType<typeof vi.fn>;
    };
    auth.mockResolvedValue({ user: { id: USER_A } });
    const { getPayoutDetail } = (await import(
      "@/lib/payouts-service"
    )) as unknown as { getPayoutDetail: ReturnType<typeof vi.fn> };
    getPayoutDetail.mockResolvedValue({ id: "po_1" });
    const { comments } = await loadRoutes();
    const r = await comments.POST(req({ body: "a".repeat(3000) }), params());
    expect(r.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    const { auth } = (await import("@/auth")) as unknown as {
      auth: ReturnType<typeof vi.fn>;
    };
    auth.mockResolvedValue(null);
    const { comments } = await loadRoutes();
    const r = await comments.POST(req({ body: "hi" }), params());
    expect(r.status).toBe(401);
  });
});
