import {
  access,
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const proposalsDirectory = path.join(projectRoot, "app", "proposals");
const publicDirectory = path.join(projectRoot, "public");
const outputDirectory = path.join(projectRoot, "vercel-dist");
const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const reservedSlugs = new Set(["404", "index", "robots"]);

const notFoundHtml = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow,noarchive">
    <meta name="color-scheme" content="dark">
    <meta name="theme-color" content="#050d1c">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <title>Proposta não encontrada | ALVK</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, "Segoe UI", Arial, sans-serif;
        background: #050d1c;
        color: #fff;
      }
      * { box-sizing: border-box; }
      body {
        min-width: 320px;
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(circle at 80% 12%, rgba(18, 91, 255, 0.24), transparent 35%),
          linear-gradient(145deg, #050d1c 0%, #07152b 58%, #0d2140 100%);
      }
      main {
        width: min(620px, 100%);
        padding: clamp(32px, 7vw, 64px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 28px;
        background: rgba(7, 21, 43, 0.72);
      }
      .brand {
        display: inline-grid;
        width: 38px;
        height: 38px;
        place-items: center;
        border-radius: 11px;
        background: #125bff;
        font-size: 12px;
        font-weight: 800;
      }
      p {
        margin: 32px 0 10px;
        color: #7fa8ff;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        font-size: clamp(34px, 7vw, 58px);
        line-height: 1;
        letter-spacing: -0.05em;
      }
    </style>
  </head>
  <body>
    <main>
      <span class="brand" aria-label="ALVK">AΛ</span>
      <p>Erro 404</p>
      <h1>Proposta não encontrada.</h1>
    </main>
  </body>
</html>
`;

function validateHtml(html, source) {
  const robotsContent =
    html.match(
      /<meta\s+[^>]*name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/i,
    )?.[1] ??
    html.match(
      /<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']robots["'][^>]*>/i,
    )?.[1] ??
    "";
  const robotsDirectives = new Set(
    robotsContent
      .toLowerCase()
      .split(",")
      .map((directive) => directive.trim()),
  );

  const checks = [
    [/^\s*<!doctype html>/i.test(html), "doctype HTML"],
    [/<html\s+[^>]*lang=["']pt-BR["']/i.test(html), 'lang="pt-BR"'],
    [/<meta\s+[^>]*charset=["']?utf-8/i.test(html), "charset UTF-8"],
    [/<meta\s+[^>]*name=["']viewport["']/i.test(html), "meta viewport"],
    [/<title>[^<]+<\/title>/i.test(html), "título"],
    [robotsDirectives.has("noindex"), "robots noindex"],
    [robotsDirectives.has("nofollow"), "robots nofollow"],
    [robotsDirectives.has("noarchive"), "robots noarchive"],
  ];

  const missing = checks
    .filter(([isValid]) => !isValid)
    .map(([, label]) => label);

  if (missing.length > 0) {
    throw new Error(`${source}: faltando ${missing.join(", ")}.`);
  }
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

await rm(outputDirectory, { force: true, recursive: true });
await mkdir(outputDirectory, { recursive: true });

const homeSource = path.join(projectRoot, "app", "home.html");
const homeHtml = await readFile(homeSource, "utf8");
validateHtml(homeHtml, "app/home.html");
await writeFile(path.join(outputDirectory, "index.html"), homeHtml, "utf8");

const proposalFiles = (await readdir(proposalsDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
  .map((entry) => entry.name)
  .sort();

if (proposalFiles.length === 0) {
  throw new Error("Nenhuma proposta HTML foi encontrada em app/proposals.");
}

for (const filename of proposalFiles) {
  const slug = filename.slice(0, -".html".length);

  if (!validSlug.test(slug)) {
    throw new Error(
      `${filename}: use somente letras minúsculas, números e hífens no slug.`,
    );
  }
  if (reservedSlugs.has(slug)) {
    throw new Error(`${filename}: o slug "${slug}" é reservado.`);
  }

  const html = await readFile(path.join(proposalsDirectory, filename), "utf8");
  validateHtml(html, `app/proposals/${filename}`);
  await writeFile(path.join(outputDirectory, filename), html, "utf8");
}

if (await exists(publicDirectory)) {
  await cp(publicDirectory, outputDirectory, { recursive: true });
}

await writeFile(
  path.join(outputDirectory, "robots.txt"),
  "User-agent: *\nDisallow: /\n",
  "utf8",
);
await writeFile(path.join(outputDirectory, "404.html"), notFoundHtml, "utf8");

console.log(
  `Build concluído: home e ${proposalFiles.length} proposta(s) em vercel-dist/.`,
);
