// netlify/functions/gs.js
// Proxy hacia Google Apps Script.
// Convierte DELETE → POST con { action: "delete", month } porque
// Apps Script solo acepta doGet y doPost.

exports.handler = async function(event, context) {
  const ORIGIN = event.headers.origin || "*";
  const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyVSxYkRRa4WeSmx-MGuBMqg6JDNMrH_EyP7-x1tDWPtk_rT3K0wmUrWezapY7vrIsy/exec";

  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": ORIGIN,
        "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
      body: "",
    };
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  };

  try {
    let res;

    if (event.httpMethod === "GET") {
      res = await fetch(APP_SCRIPT_URL + "?action=getAll", {
        method: "GET",
        redirect: "follow",
      });

    } else if (event.httpMethod === "DELETE") {
      const month = event.queryStringParameters?.month || "";
      res = await fetch(APP_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", month }),
        redirect: "follow",
      });

    } else if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      res = await fetch(APP_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upsert", ...body }),
        redirect: "follow",
      });

    } else {
      return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    const text = await res.text();
    const ct = res.headers.get("content-type") || "";
    const isJSON = ct.includes("application/json") || /^\s*[\{\[]/.test(text);

    return {
      statusCode: res.status,
      headers: {
        ...corsHeaders,
        "Content-Type": isJSON ? "application/json" : "text/plain; charset=utf-8",
      },
      body: text,
    };

  } catch (err) {
    return {
      statusCode: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Proxy fetch failed", detail: String(err) }),
    };
  }
};
