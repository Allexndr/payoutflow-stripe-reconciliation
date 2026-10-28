/** Demo payouts when Stripe is not connected — realistic structure for UI dev */

export type DemoLine = {
  id: string;
  type: "charge" | "fee" | "refund";
  customer: string;
  amountCents: number;
  feeCents: number;
  netCents: number;
};

export type DemoPayout = {
  id: string;
  amountCents: number;
  currency: string;
  arrivalDate: string;
  expectedArrivalDate: string;
  status: "paid" | "pending";
  lines: DemoLine[];
  expectedNetCents: number;
  txnCount: number;
};

export const DEMO_PAYOUTS: DemoPayout[] = [
  {
    id: "po_demo_1",
    amountCents: 482391,
    currency: "USD",
    arrivalDate: "2026-04-05",
    expectedArrivalDate: "2026-04-04",
    status: "paid",
    txnCount: 24,
    expectedNetCents: 482391,
    lines: [
      {
        id: "ch_1",
        type: "charge",
        customer: "Acme Co",
        amountCents: 120000,
        feeCents: 3480,
        netCents: 116520,
      },
      {
        id: "ch_2",
        type: "charge",
        customer: "Globex",
        amountCents: 89000,
        feeCents: 2581,
        netCents: 86419,
      },
      {
        id: "fee_1",
        type: "fee",
        customer: "Stripe processing",
        amountCents: -500,
        feeCents: 0,
        netCents: -500,
      },
      {
        id: "re_1",
        type: "refund",
        customer: "Initech",
        amountCents: -15000,
        feeCents: -435,
        netCents: -15435,
      },
    ],
  },
  {
    id: "po_demo_2",
    amountCents: 128900,
    currency: "USD",
    arrivalDate: "2026-04-02",
    expectedArrivalDate: "2026-04-02",
    status: "paid",
    txnCount: 9,
    expectedNetCents: 128900,
    lines: [
      {
        id: "ch_3",
        type: "charge",
        customer: "Umbrella LLC",
        amountCents: 132000,
        feeCents: 3828,
        netCents: 128172,
      },
      {
        id: "fee_2",
        type: "fee",
        customer: "Currency conversion",
        amountCents: -728,
        feeCents: 0,
        netCents: -728,
      },
    ],
  },
  {
    id: "po_demo_3",
    amountCents: 210045,
    currency: "USD",
    arrivalDate: "2026-03-28",
    expectedArrivalDate: "2026-03-28",
    status: "paid",
    txnCount: 41,
    expectedNetCents: 209800,
    lines: [],
  },
];

export const DEMO_BANK_TXNS = [
  {
    id: "plaid_txn_1",
    amountCents: 482391,
    date: "2026-04-05",
    name: "STRIPE TRANSFER",
  },
  {
    id: "plaid_txn_2",
    amountCents: 128900,
    date: "2026-04-02",
    name: "STRIPE; PAYOUT",
  },
  {
    id: "plaid_txn_3",
    amountCents: 205000,
    date: "2026-03-29",
    name: "STRIPE",
  },
];
