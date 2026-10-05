/** Join truthy class names. Display-only helper; no financial logic. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
