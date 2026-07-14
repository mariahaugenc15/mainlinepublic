import { neon } from "@neondatabase/serverless";

let _client: ReturnType<typeof neon> | null = null;
function getClient() {
  if (!_client) {
    const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_URL_NON_POOLING;
    if (!url) throw new Error("No database URL found. Set DATABASE_URL or POSTGRES_URL.");
    _client = neon(url);
  }
  return _client;
}

export const sql: {
  (strings: TemplateStringsArray, ...values: any[]): Promise<any[]>;
  (query: string, params?: any[]): Promise<any[]>;
} = ((strings: any, ...values: any[]) => (getClient() as any)(strings, ...values)) as any;
