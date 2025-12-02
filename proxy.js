export default async function handler(req, res) {
  const path = req.query.path || "marketactivity";
  const target = `https://www.rolimons.com/${path}`;

  try {
    const r = await fetch(target);
    let html = await r.text();

    // Remove iframe protections
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Frame-Options", ""); 
    res.setHeader("Content-Security-Policy", ""); 

    // Rewrite all links
    html = html.replace(/href="([^"]+)"/g, (match, link) => {
      const allowed = /^\/?itemsale\/\d+\/?$/.test(link)
        || /^https?:\/\/www\.rolimons\.com\/itemsale\/\d+/.test(link);

      if (allowed) {
        const id = link.match(/(\d+)/)?.[1];
        return `href="/api/proxy?path=itemsale/${id}"`;
      } else {
        return `href="/error.html"`;
      }
    });

    return res.status(200).send(html);

  } catch (e) {
    return res.status(500).send("Error contact support");
  }
}
