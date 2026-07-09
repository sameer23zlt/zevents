import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authMiddleware";

/**
 * GET /api/payment-config
 * Returns the UPI details the user needs to initiate a payment:
 *   - upiId:      the receiver's UPI ID (from env UPI_ID)
 *   - payeeName: the receiver's display name (UPI_NAME, else ADMIN_USERNAME)
 *
 * The client combines these with the per-event amount to build a
 * `upi://pay?...` deep link.
 */
export async function GET(request: NextRequest) {
  const authError = await requireUser(request);
  if (authError) return authError;

  const upiId = process.env.UPI_ID;
  if (!upiId) {
    return NextResponse.json(
      { error: "UPI payments are not configured" },
      { status: 503 }
    );
  }

  const payeeName = "Zevents";

  return NextResponse.json({ upiId, payeeName }, { status: 200 });
}
