import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { tripOptionUrlSchema, type TripOptionPreview } from "@shared/tripOptionSchemas";

// A small metadata preview, not a provider inventory integration.
// DNS is resolved and pinned to one validated public IPv4 address for each hop.
const blocked = new net.BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10],
  ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(network, prefix, "ipv4");

export function isPublicPreviewIpv4(address: string): boolean {
  return net.isIP(address) === 4 && !blocked.check(address, "ipv4");
}

function validTarget(input: string): URL {
  const url = tripOptionUrlSchema.parse(input);
  const parsed = new URL(url);
  if (net.isIP(parsed.hostname) !== 0 || !parsed.hostname.includes(".") ||
      /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(parsed.hostname.toLowerCase())) {
    throw new Error("Unsupported host");
  }
  if ((parsed.protocol === "https:" && parsed.port && parsed.port !== "443") ||
      (parsed.protocol === "http:" && parsed.port && parsed.port !== "80")) {
    throw new Error("Unsupported port");
  }
  return parsed;
}

function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|quot|apos|lt|gt|nbsp);/gi, (entity, value: string) => {
    const key = value.toLowerCase();
    if (key.startsWith("#")) {
      const number = key.startsWith("#x") ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
      return number > 0 && number <= 0x10ffff && !(number >= 0xd800 && number <= 0xdfff)
        ? String.fromCodePoint(number) : "";
    }
    return ({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " } as Record<string, string>)[key] ?? entity;
  });
}

function clean(input: string, maxLength: number): string {
  return decodeEntities(input.replace(/<[^>]*>/g, " ")).replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function extractTags(html: string): Record<string, string> {
  const properties: Record<string, string> = {};
  for (const match of html.matchAll(/<meta\s+[^>]*>/gi)) {
    const attributes: Record<string, string> = {};
    for (const attribute of match[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attributes[attribute[1].toLowerCase()] = attribute[2] ?? attribute[3] ?? attribute[4] ?? "";
    }
    const key = (attributes.property ?? attributes.name ?? "").toLowerCase();
    if (key && attributes.content && !properties[key]) properties[key] = attributes.content;
  }
  return properties;
}

export function parseTripLinkHtml(html: string, inputUrl: string): TripOptionPreview {
  const url = new URL(inputUrl);
  const tags = extractTags(html.slice(0, 262144));
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title\s*>/i);
  const title = clean(tags["og:title"] || tags["twitter:title"] || titleMatch?.[1] || "", 160);
  const description = clean(tags["og:description"] || tags.description || tags["twitter:description"] || "", 500);
  let imageUrl: string | null = null;
  const image = tags["og:image:secure_url"] || tags["og:image"] || tags["twitter:image"];
  if (image) {
    try {
      const value = new URL(decodeEntities(image), url);
      validTarget(value.toString()); // Exclude local/IP-literal metadata image targets as well.
      imageUrl = value.toString();
    } catch { /* No usable preview image */ }
  }
  return {
    url: url.toString(),
    source: url.hostname.replace(/^www\./i, "").slice(0, 100),
    title: title || url.hostname,
    description: description || null,
    imageUrl,
    available: Boolean(title || description || imageUrl),
  };
}

async function requestPage(url: URL): Promise<{ body?: string; redirect?: string }> {
  const records = await dns.lookup(url.hostname, { all: true, verbatim: true });
  const ipv4 = records.filter((record) => record.family === 4);
  if (!ipv4.length || ipv4.some((record) => !isPublicPreviewIpv4(record.address))) {
    throw new Error("Blocked DNS destination");
  }
  const address = ipv4[0].address;
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? https : http;
    const request = transport.request(url, {
      method: "GET",
      lookup: (_hostname, _options, callback) => callback(null, address, 4),
      headers: { Accept: "text/html,application/xhtml+xml", "Accept-Encoding": "identity", "User-Agent": "ByeBiLinkPreview/1.0" },
    }, (response) => {
      const status = response.statusCode ?? 0;
      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
        response.resume();
        resolve({ redirect: new URL(response.headers.location, url).toString() });
        return;
      }
      if (status < 200 || status >= 300 || !/^(text\/html|application\/xhtml\+xml)/i.test(String(response.headers["content-type"] ?? ""))) {
        response.resume();
        reject(new Error("No HTML preview"));
        return;
      }
      let size = 0;
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => {
        const remaining = 262144 - size;
        if (remaining <= 0) return;
        const portion = chunk.subarray(0, remaining);
        chunks.push(portion);
        size += portion.length;
        if (chunk.length > remaining || size === 262144) {
          // Metadata normally lives in <head>; larger commercial pages are common.
          // Keep the bounded prefix rather than discarding a valid partial preview.
          resolve({ body: Buffer.concat(chunks).toString("utf8") });
          response.destroy();
        }
      });
      response.on("end", () => resolve({ body: Buffer.concat(chunks).toString("utf8") }));
      response.on("error", reject);
    });
    const timer = setTimeout(() => request.destroy(new Error("Preview timeout")), 5000);
    request.once("close", () => clearTimeout(timer));
    request.on("error", reject);
    request.end();
  });
}

export async function previewTripLink(input: string): Promise<TripOptionPreview> {
  const initial = validTarget(input);
  const fallback: TripOptionPreview = {
    url: initial.toString(), source: initial.hostname.replace(/^www\./i, "").slice(0, 100),
    title: initial.hostname, description: null, imageUrl: null, available: false,
  };
  let current = initial;
  try {
    for (let hop = 0; hop < 3; hop += 1) {
      const response = await requestPage(current);
      if (response.redirect) {
        current = validTarget(response.redirect);
        continue;
      }
      if (response.body) return parseTripLinkHtml(response.body, current.toString());
      break;
    }
  } catch { /* Sites may reject preview bots; keep manual fallback. */ }
  return fallback;
}
