// claude-proxy.ts
import http from "node:http";
import https from "node:https";

const LISTEN_PORT = 8787;
const UPSTREAM_HOST = "api.anthropic.com";

// ---------- 1. Compressor: how to shrink a tool_result ----------
// Claude Code tool results are either:
//   - a plain string (Bash, Read, Grep output)
//   - an array of content blocks (usually [{type:"text", text:"..."}])
function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((b: any) => (b?.type === "text" ? b.text : ""))
      .join("\n");
  }
  return "";
}

function compressToolText(raw: string): string {
  const lines = raw.split("\n");
  const MAX_LINES = 120;

  // If small enough, don't touch it.
  if (lines.length <= MAX_LINES) return raw;

  // Preserve: first N lines, last N lines, and anything that looks like
  // an error / stack trace / match line for grep-style output.
  const HEAD = 60;
  const TAIL = 40;
  const head = lines.slice(0, HEAD);
  const tail = lines.slice(-TAIL);
  const middle = lines.slice(HEAD, lines.length - TAIL);

  const interesting = middle.filter((l) =>
    /error|exception|fail|panic|traceback|:\d+:/i.test(l)
  );

  const dropped = middle.length - interesting.length;

  return [
    ...head,
    "",
    `[... headroom: ${dropped} lines omitted; ${interesting.length} notable lines kept ...]`,
    ...interesting.slice(0, 40),
    "",
    ...tail,
  ].join("\n");
}

// ---------- 2. Walk messages and rewrite tool_result blocks ----------
function compressRequestBody(body: any): {
  body: any;
  bytesSaved: number;
  blocksTouched: number;
} {
  let bytesSaved = 0;
  let blocksTouched = 0;

  for (const msg of body.messages ?? []) {
    if (!Array.isArray(msg.content)) continue;

    for (const block of msg.content) {
      // Anthropic marks tool results like this:
      //   { type: "tool_result", tool_use_id: "...", content: "..." | [...] }
      if (block?.type !== "tool_result") continue;

      const original = extractText(block.content);
      const compressed = compressToolText(original);

      if (compressed.length < original.length) {
        bytesSaved += original.length - compressed.length;
        blocksTouched++;

        // Replace with a simple string content. Anthropic accepts either
        // string or array-of-blocks for tool_result.content.
        block.content = compressed;
      }
    }
  }

  return { body, bytesSaved, blocksTouched };
}

// ---------- 3. HTTP proxy ----------
const server = http.createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on("data", (c) => chunks.push(c));

  req.on("end", () => {
    const rawBody = Buffer.concat(chunks).toString("utf8");

    // Only try to rewrite /v1/messages (chat) — let everything else pass.
    const isMessagesEndpoint =
      req.method === "POST" && (req.url ?? "").startsWith("/v1/messages");

    let payloadToSend = rawBody;

    if (isMessagesEndpoint && rawBody.length > 0) {
      try {
        const parsed = JSON.parse(rawBody);
        const { body: out, bytesSaved, blocksTouched } =
          compressRequestBody(parsed);

        if (blocksTouched > 0) {
          console.log(
            `[headroom] compressed ${blocksTouched} tool_result block(s), ` +
              `saved ${bytesSaved} bytes (~${Math.round(bytesSaved / 4)} tokens)`
          );
          payloadToSend = JSON.stringify(out);
        }
      } catch (err) {
        console.warn("[headroom] could not parse body, forwarding raw:", err);
      }
    }

    // Forward upstream, streaming response back untouched.
    const upstreamReq = https.request(
      {
        hostname: UPSTREAM_HOST,
        path: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          host: UPSTREAM_HOST,
          "content-length": Buffer.byteLength(payloadToSend),
        },
      },
      (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode ?? 200, upstreamRes.headers);
        upstreamRes.pipe(res);
      }
    );

    upstreamReq.on("error", (err) => {
      console.error("[headroom] upstream error:", err.message);
      if (!res.headersSent) res.writeHead(502);
      res.end(`Upstream error: ${err.message}`);
    });

    upstreamReq.write(payloadToSend);
    upstreamReq.end();
  });
});

// ---------- 4. Also handle CONNECT (rarely needed for api.anthropic.com) ----
// Not required here since Anthropic uses plain HTTPS on 443.

server.listen(LISTEN_PORT, () => {
  console.log(`headroom-style proxy on http://localhost:${LISTEN_PORT}`);
  console.log(`Export ANTHROPIC_BASE_URL=http://localhost:${LISTEN_PORT}`);
});
