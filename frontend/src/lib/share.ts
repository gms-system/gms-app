import api from "@/lib/api";
import { openExternal } from "@/lib/native";

export type ShareDoc = "invoice" | "job_card";

/** Indian mobile → WhatsApp international format (digits only, 91 prefix for 10-digit numbers). */
export function toWhatsAppNumber(mobile?: string | null): string {
  const digits = (mobile || "").replace(/\D/g, "").replace(/^0+/, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

/**
 * Creates a secure customer link for the document and opens WhatsApp addressed to
 * the customer (or the contact picker when the customer has no mobile number).
 * `buildMessage` receives the public link so callers control the wording.
 */
/** Opens the printable customer page in the system browser (Android WebView has no window.print). */
export async function openPrintableCopy(doc: ShareDoc, id: string) {
  const { data } = await api.post(`/share/${doc}/${id}`);
  await openExternal(data.data.path);
}

export async function shareOnWhatsApp(
  doc: ShareDoc,
  id: string,
  buildMessage: (link: string, info: { garageName: string; customerName: string }) => string,
) {
  const { data } = await api.post(`/share/${doc}/${id}`);
  const d = data.data;
  const link = new URL(d.path, window.location.origin).toString();
  const phone = toWhatsAppNumber(d.customer_mobile);
  const text = encodeURIComponent(buildMessage(link, { garageName: d.garage_name || "Garage", customerName: d.customer_name || "" }));
  await openExternal(phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`);
}
