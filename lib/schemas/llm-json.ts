/** Extrait le premier objet JSON d'une réponse modèle (fences ```json`, bruit avant/après). */

export function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(trimmed);
  if (fence) {
    return fence[1].trim();
  }
  const inlineFence = /```(?:json)?\s*([\s\S]*?)```/im.exec(trimmed);
  if (inlineFence) {
    return inlineFence[1].trim();
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  throw new Error("Aucun objet JSON trouvé dans la réponse du modèle.");
}
