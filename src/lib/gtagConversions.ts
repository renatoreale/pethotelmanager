declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const CONVERSION_LABELS = {
  trialStart: "AW-18341070139/xszDCIrrqt0cELuK2qlE",
  demoRequest: "AW-18341070139/AKFeCIiXrd0cELuK2qlE",
  purchase: "AW-18341070139/C-4zCJOYq90cELuK2qlE",
} as const;

function fireConversion(sendTo: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "conversion", { send_to: sendTo, ...params });
}

export function trackTrialStart() {
  fireConversion(CONVERSION_LABELS.trialStart);
}

export function trackDemoRequest() {
  fireConversion(CONVERSION_LABELS.demoRequest, { value: 1.0, currency: "EUR" });
}

export function trackPurchase(value: number, transactionId: string) {
  fireConversion(CONVERSION_LABELS.purchase, { value, currency: "EUR", transaction_id: transactionId });
}
