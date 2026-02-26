export default async function handler(req, res) {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathParam = urlObj.pathname.replace(/^\/api\/_functions\//, "");
  const query = urlObj.search || "";
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const apikey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !apikey) {
    res.status(500).json({ error: "SUPABASE env not configured" });
    return;
  }
  const dest = `${supabaseUrl}/functions/v1/${pathParam}${query}`;
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  await new Promise((resolve) => req.on("end", resolve));
  const body = Buffer.concat(chunks);
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (!["host", "content-length"].includes(k)) headers[k] = v;
  }
  headers["apikey"] = apikey;
  const resp = await fetch(dest, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
  });
  const respHeaders = {};
  resp.headers.forEach((v, k) => (respHeaders[k] = v));
  const buf = Buffer.from(await resp.arrayBuffer());
  res.writeHead(resp.status, respHeaders);
  res.end(buf);
}
