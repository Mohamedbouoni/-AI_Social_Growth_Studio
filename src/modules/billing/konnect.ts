// =============================================================================
// Konnect Payment Gateway Client (Tunisia — cards, e-Dinar, Flouci wallet)
// =============================================================================
// Docs: https://docs.konnect.network/docs/en/api-integration/endpoints/initiate-payment
//   POST /payments/init-payment   (x-api-key)  -> { payUrl, paymentRef }
//   GET  /payments/:paymentRef                  -> { payment: { status, amount, ... } }
// Amounts are in millimes (1 TND = 1000). Only payment.status === "completed"
// means paid; the webhook is an unauthenticated GET, so always re-fetch.
// =============================================================================

import { z } from "zod";

const SANDBOX_API_URL = "https://api.preprod.konnect.network/api/v2";

function getConfig() {
  const apiKey = process.env.KONNECT_API_KEY;
  const walletId = process.env.KONNECT_WALLET_ID;
  if (!apiKey || !walletId) {
    throw new Error("Konnect is not configured: KONNECT_API_KEY and KONNECT_WALLET_ID are required.");
  }
  return {
    apiKey,
    walletId,
    apiUrl: (process.env.KONNECT_API_URL || SANDBOX_API_URL).replace(/\/$/, ""),
  };
}

const initResponseSchema = z.object({
  payUrl: z.string().url(),
  paymentRef: z.string().min(1),
});

const paymentSchema = z.object({
  id: z.string().optional(),
  status: z.string(),
  amount: z.number(),
  reachedAmount: z.number().optional(),
  token: z.string().optional(),
  orderId: z.string().optional(),
  expirationDate: z.string().optional(),
});

export type KonnectPayment = z.infer<typeof paymentSchema>;

export interface InitPaymentParams {
  amountMillimes: number;
  orderId: string;
  description: string;
  webhookUrl: string;
  successUrl: string;
  failUrl: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

async function konnectFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const { apiKey, apiUrl } = getConfig();
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, ...init.headers },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Konnect API error (${response.status}) on ${path}: ${body.slice(0, 300)}`);
  }
  return response.json();
}

export async function initKonnectPayment(params: InitPaymentParams) {
  const { walletId } = getConfig();
  const data = await konnectFetch("/payments/init-payment", {
    method: "POST",
    body: JSON.stringify({
      receiverWalletId: walletId,
      token: "TND",
      amount: params.amountMillimes,
      type: "immediate",
      description: params.description,
      acceptedPaymentMethods: ["wallet", "bank_card", "e-DINAR"],
      lifespan: 30,
      checkoutForm: false,
      addPaymentFeesToAmount: false,
      orderId: params.orderId,
      webhook: params.webhookUrl,
      successUrl: params.successUrl,
      failUrl: params.failUrl,
      theme: "light",
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
    }),
  });
  return initResponseSchema.parse(data);
}

export async function getKonnectPayment(paymentRef: string): Promise<KonnectPayment> {
  const data = await konnectFetch(`/payments/${encodeURIComponent(paymentRef)}`);
  return z.object({ payment: paymentSchema }).parse(data).payment;
}
