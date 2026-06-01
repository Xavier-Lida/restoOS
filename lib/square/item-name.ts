/** Normalise un nom d'article (menu ou caisse) pour comparaison. */
export function normalizePosItemName(value: string): string {
  return value.trim().toLocaleLowerCase("fr-CA");
}

/** Correspondance permissive menu ↔ libellé caisse (même logique que SPM / concurrents). */
export function posItemMatchesMenuName(posItemName: string, menuItemName: string): boolean {
  const a = normalizePosItemName(posItemName);
  const b = normalizePosItemName(menuItemName);
  if (a.length === 0 || b.length === 0) {
    return false;
  }
  return a.includes(b) || b.includes(a);
}
