// Strip any HTML from an untrusted string and return plain text. Uses an inert
// DOMParser document, which never executes scripts or loads resources, so it is
// safe to feed attacker-controlled HTML (e.g. rich-text "reason" fields) — the
// result must be rendered as text ({plainText(x)}), never via
// dangerouslySetInnerHTML.
export function plainText(value = ""): string {
  try {
    const doc = new DOMParser().parseFromString(value ?? "", "text/html");
    return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  } catch {
    return (value ?? "").replace(/<[^>]*>/g, "").trim();
  }
}
