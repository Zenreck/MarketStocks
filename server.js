// server.js
// Node 18+ or Node with fetch support. Uses express + cheerio to rewrite links.
import express from "express";
import fetch from "node-fetch";
import cheerio from "cheerio";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_BASE = "https://www.rolimons.com";

// serve static (index.html) from public
app.use(express.static(path.join(__dirname, "public")));

/**
 * Helper: returns true if the href points to an allowed itemsale path.
 * Accepts:
 *  - /itemsale/<digits>
 *  - https://www.rolimons.com/itemsale/<digits>
 */
function allowedItemSaleHref(href) {
  if (!href) return false;
  const m1 = href.match(/^\/itemsale\/(\d+)\/?$/);
  if (m1) return true;
  const m2 = href.match(/^https?:\/\/(www\.)?rolimons\.com\/itemsale\/(\d+)\/?$/i);
  return !!m2;
}

/**
 * Rewrites all <a> anchors:
 *  - If allowedItemSaleHref -> convert to /itemsale/:id on our server (same origin)
 *  - Else -> point to /error (on our server)
 *
 * Also rewrites forms and base href to keep same-origin navigation.
 */
function rewriteHtml(html) {
  const $ = cheerio.load(html);

  // Remove any base tag or set it to our origin (so relative links go through us)
  $("base").remove();

  $("a").each((i, el) => {
    const $el = $(el);
    const href = $el.attr("href");

    if (allowedItemSaleHref(href)) {
      // extract digits
      const m = href.match(/itemsale\/(\d+)/i);
      const id = m ? m[1] : null;
      if (id) {
        $el.attr("href", `/itemsale/${id}`);
        // keep link in same iframe by default; users clicking will navigate the iframe
        $el.attr("target", "_self");
      } else {
        $el.attr("href", "/error");
        $el.attr("target", "_self");
      }
    } else {
      // anything else is blocked
      $el.attr("href", "/error");
      $el.attr("target", "_self");
    }
  });

  // disable forms that post to external origins
  $("form").each((i, form) => {
    const $f = $(form);
    const action = $f.attr("action") || "";
    if (!allowedItemSaleHref(action) && !action.startsWith("/") && action.trim() !== "") {
      // neutralize
      $f.attr("action", "/error");
      $f.attr("method", "get");
    } else if (allowedItemSaleHref(action)) {
      const m = action.match(/itemsale\/(\d+)/i);
      const id = m ? m[1] : null;
      if (id) $f.attr("action", `/itemsale/${id}`);
      else $f.attr("action", "/error");
    }
  });

  // Remove any script tags that would navigate outside or try to break our rewrite (basic sanity)
  $("script").each((i, s) => {
    const src = $(s).attr("src");
    // keep inline small scripts; but remove external scripts to be safe
    if (src && !src.startsWith("/")) $(s).remove();
  });

  return $.html();
}

app.get("/marketactivity", async (req, res) => {
  try {
    const r = await fetch(`${TARGET_BASE}/marketactivity`);
    const txt = await r.text();
    const out = rewriteHtml(txt);
    res.set("Content-Type", "text/html; charset=utf-8").send(out);
  } catch (err) {
    console.error("fetch error:", err);
    res.status(500).send("Error fetching remote page");
  }
});

// Serve allowed itemsale pages only if the id is digits; otherwise show error
app.get("/itemsale/:id", async (req, res) => {
  const id = req.params.id;
  if (!/^\d+$/.test(id)) {
    return res.redirect("/error");
  }
  try {
    const r = await fetch(`${TARGET_BASE}/itemsale/${id}`);
    const txt = await r.text();
    const out = rewriteHtml(txt);
    res.set("Content-Type", "text/html; charset=utf-8").send(out);
  } catch (err) {
    console.error("fetch itemsale error:", err);
    res.status(500).send("Error fetching item page");
  }
});

// Generic error page
app.get("/error", (req, res) => {
  res.set("Content-Type", "text/html; charset=utf-8").send(`
    <!doctype html>
    <html>
      <head><meta charset="utf-8"><title>Error</title></head>
      <body style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
        <div style="text-align:center;">
          <h1>Error</h1>
          <p>Contact support</p>
        </div>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT}/ (index.html) in your browser`);
});
