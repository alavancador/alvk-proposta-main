import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outputDirectory = path.join(projectRoot, "vercel-dist");

async function read(relativePath) {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

test("o projeto não mantém dependências de runtime ou build", async () => {
  const packageJson = JSON.parse(await read("package.json"));

  assert.deepEqual(packageJson.dependencies, undefined);
  assert.deepEqual(packageJson.devDependencies, undefined);
  assert.equal(packageJson.scripts.build, "node scripts/build.mjs");
});

test("a saída publicada reproduz a home e todas as propostas", async () => {
  const proposalFiles = (await readdir(
    path.join(projectRoot, "app", "proposals"),
  ))
    .filter((filename) => filename.endsWith(".html"))
    .sort();

  assert.equal(
    await read("vercel-dist/index.html"),
    await read("app/home.html"),
  );
  assert.ok(proposalFiles.length > 0);

  for (const filename of proposalFiles) {
    assert.equal(
      await read(`vercel-dist/${filename}`),
      await read(`app/proposals/${filename}`),
    );
  }
});

test("o pacote visual ALVK é publicado com seus recursos reutilizáveis", async () => {
  const requiredFiles = [
    "alvk/tokens/tokens.css",
    "alvk/tokens/tokens.json",
    "alvk/styles/components.css",
    "alvk/assets/fonts/urbanist/Urbanist-Variable.ttf",
    "alvk/assets/fonts/urbanist/Urbanist-Italic-VariableFont_wght.ttf",
    "alvk/assets/fonts/urbanist/OFL.txt",
    "alvk/assets/logo/alvk-logo-dark.svg",
    "alvk/assets/logo/alvk-logo-light.svg",
    "alvk/assets/logo/alvk-logo-white.svg",
    "alvk/assets/patterns/noise.svg",
    "alvk/assets/patterns/gradient-line.svg",
    "alvk/assets/patterns/dot-pattern.svg",
  ];

  for (const relativePath of requiredFiles) {
    await access(path.join(outputDirectory, relativePath));
  }

  const tokens = await read("vercel-dist/alvk/tokens/tokens.css");
  const components = await read("vercel-dist/alvk/styles/components.css");

  assert.match(tokens, /@font-face/);
  assert.match(tokens, /Urbanist-Variable\.ttf/);
  assert.match(components, /@layer alvk\.base, alvk\.components/);
});

test("as páginas migradas usam a fonte ALVK local e a Blue Balance usa o pacote compartilhado", async () => {
  const documents = [
    "app/home.html",
    "app/proposals/aniscloset.html",
    "app/proposals/birdstyle.html",
    "app/proposals/bluebalance.html",
    "app/proposals/curso.html",
  ];

  for (const document of documents) {
    const html = await read(document);
    assert.match(html, /href=["']\/alvk\/tokens\/tokens\.css["']/);
    assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  }

  const blueBalance = await read("app/proposals/bluebalance.html");
  assert.match(
    blueBalance,
    /href=["']\/alvk\/styles\/components\.css["']/,
  );
  assert.match(
    blueBalance,
    /url\(["']?\/alvk\/assets\/patterns\/noise\.svg["']?\)/,
  );
});

test("todos os documentos publicados bloqueiam indexação", async () => {
  const htmlFiles = (await readdir(outputDirectory)).filter((filename) =>
    filename.endsWith(".html"),
  );

  for (const filename of htmlFiles) {
    const html = await read(`vercel-dist/${filename}`);
    assert.match(html, /<meta\s+name=["']robots["'][^>]*noindex/i);
    assert.match(html, /nofollow/i);
    assert.match(html, /noarchive/i);
  }

  assert.equal(
    await read("vercel-dist/robots.txt"),
    "User-agent: *\nDisallow: /\n",
  );
});

test("a Vercel usa rotas limpas e cabeçalhos de proteção", async () => {
  const config = JSON.parse(await read("vercel.json"));
  const headers = Object.fromEntries(
    config.headers[0].headers.map(({ key, value }) => [key, value]),
  );

  assert.equal(config.buildCommand, "npm run build");
  assert.equal(config.outputDirectory, "vercel-dist");
  assert.equal(config.cleanUrls, true);
  assert.equal(headers["Cache-Control"], "private, no-store");
  assert.match(headers["X-Robots-Tag"], /noindex/);
  assert.match(headers["Content-Security-Policy"], /frame-ancestors/);
  assert.equal(
    headers["Permissions-Policy"],
    "camera=(), geolocation=(), microphone=()",
  );
});

test("o legado do Sites e Cloudflare não existe mais", async () => {
  const legacyPaths = [
    ".openai",
    ".vinext",
    "build",
    "db",
    "examples",
    "worker",
    "vite.config.ts",
    "next.config.ts",
    "drizzle.config.ts",
  ];

  for (const legacyPath of legacyPaths) {
    await assert.rejects(access(path.join(projectRoot, legacyPath)));
  }
});
