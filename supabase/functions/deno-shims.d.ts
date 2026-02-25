declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(url: string, key: string): any;
}

declare module "https://deno.land/x/zod@v3.22.4/mod.ts" {
  export const z: any;
}

declare module "https://esm.sh/pdf-lib@1.17.1" {
  export const PDFDocument: any;
  export const StandardFonts: any;
  export const rgb: any;
  export const degrees: any;
}

declare const Deno: any;
