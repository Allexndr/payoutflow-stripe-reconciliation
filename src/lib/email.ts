/**
 * Resend API (https://resend.com). Optional: if RESEND_API_KEY is unset, emails are skipped.
 */
export async function sendDiscrepancyAlertEmail(
  to: string,
  payoutId: string,
  discrepancyPercent: number,
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "PayoutFlow <onboarding@resend.dev>";
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set; skipping alert");
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Payout ${payoutId}: ${discrepancyPercent.toFixed(1)}% discrepancy`,
      html: `<p><strong>PayoutFlow</strong> detected a bank match discrepancy of <strong>${discrepancyPercent.toFixed(2)}%</strong> for payout <code>${payoutId}</code>.</p><p>Open your dashboard to review.</p>`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[email] Resend error:", res.status, text);
    return false;
  }
  return true;
}
