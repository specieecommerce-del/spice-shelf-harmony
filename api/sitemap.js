export default async function handler(req, res) {
  const baseUrl = process.env.SITE_URL || "https://speciesalimentos.com.br";
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const urls = new Set([
    `${baseUrl}/`,
    `${baseUrl}/produtos`,
    `${baseUrl}/receitas`,
    `${baseUrl}/kits-presentes`,
    `${baseUrl}/promocoes`,
    `${baseUrl}/privacidade`,
    `${baseUrl}/termos`,
    `${baseUrl}/entregas`,
    `${baseUrl}/pagamento`,
  ]);

  const fetchList = async (path, select) => {
    if (!supabaseUrl || !anonKey) return [];
    try {
      const url = `${supabaseUrl}/rest/v1/${path}?${select}`;
      const resp = await fetch(url, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          Accept: "application/json",
        },
      });
      if (!resp.ok) return [];
      return await resp.json();
    } catch {
      return [];
    }
  };

  // Categories (slug)
  const categories = await fetchList(
    "product_categories",
    "select=slug,name&is_active=eq.true"
  );
  categories.forEach((c) => {
    if (c?.slug) urls.add(`${baseUrl}/categoria/${c.slug}`);
  });

  // Products (id)
  const products = await fetchList(
    "products_public",
    "select=id,updated_at&is_active=eq.true"
  );

  const now = new Date().toISOString();
  const xmlItems = [];
  urls.forEach((u) => {
    xmlItems.push(
      `<url><loc>${u}</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`
    );
  });
  products.forEach((p) => {
    xmlItems.push(
      `<url><loc>${baseUrl}/produto/${p.id}</loc><lastmod>${p.updated_at ||
        now}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`
    );
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlItems.join("\n")}
</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  res.status(200).send(xml);
}
