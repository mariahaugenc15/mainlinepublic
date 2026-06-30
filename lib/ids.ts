export function id(prefix: string, n: number | string) {
  return `${prefix}_${n}`;
}

let counter = 0;
export function rid(prefix: string) {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}
