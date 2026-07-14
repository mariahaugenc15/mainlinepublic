import { neon } from "@neondatabase/serverless";

let _client: ReturnType<typeof neon> | null = null;
function getClient() {
  if (!_client) _client = neon(process.env.DATABASE_URL!);
  return _client;
}

export const sql: {
  (strings: TemplateStringsArray, ...values: any[]): Promise<any[]>;
  (query: string, params?: any[]): Promise<any[]>;
} = ((strings: any, ...values: any[]) => (getClient() as any)(strings, ...values)) as any;
