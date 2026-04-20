#!/usr/bin/env node
/**
 * CaptureYourWork Blog Agent
 * Picks the next unpublished topic, generates an SEO article via the Claude Code CLI,
 * builds a static HTML page, and publishes it to S3.
 *
 * Usage:
 *   node blog-agent.js            # publish next topic
 *   node blog-agent.js --dry-run  # generate HTML but skip S3 upload
 *   node blog-agent.js --slug best-companycam-alternatives  # force a specific topic
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { TOPICS } from './topics.js';

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE_SLUG = (() => {
  const i = process.argv.indexOf('--slug');
  return i !== -1 ? process.argv[i + 1] : null;
})();

const BUCKET = 'captureyourwork.com';
const SITE_URL = 'https://captureyourwork.com';
const MANIFEST_KEY = 'blog/published.json';
const CLAUDE_BIN = '/usr/local/bin/claude';

const s3 = new S3Client({ region: 'us-west-1' });

// ─── helpers ─────────────────────────────────────────────────────────────────

async function getManifest() {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: MANIFEST_KEY }));
    const body = await res.Body.transformToString();
    return JSON.parse(body);
  } catch {
    return { published: [] };
  }
}

async function putObject(key, body, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

function claude(prompt) {
  const escaped = prompt.replace(/'/g, `'\\''`);
  const result = execSync(`${CLAUDE_BIN} -p '${escaped}'`, {
    timeout: 120_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  return result.toString().trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ─── article generation ───────────────────────────────────────────────────────

function buildPrompt(topic) {
  return `Write a comprehensive, SEO-optimized blog article for CaptureYourWork, a job site photo documentation app for contractors that competes with CompanyCam.

Topic: ${topic.title}
Target keyword: "${topic.keyword}"
Meta description: ${topic.description}

Requirements:
- 1200–1800 words
- Use the target keyword naturally in the first 100 words, in at least one H2, and in the conclusion
- Structure: intro → 4–6 H2 sections with practical content → conclusion with CTA
- Tone: practical, plain-spoken, written for independent contractors and small crews (not enterprise)
- Include specific, actionable advice (not filler)
- CTA at the end: encourage readers to try CaptureYourWork free for 14 days at ${SITE_URL}
- Do NOT mention competitor brand names in a negative way — focus on what good documentation looks like
- Output ONLY the article body as clean HTML: use <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>
- Do NOT include <html>, <head>, <body>, or any wrapper tags — just the inner content
- Do NOT include a top-level <h1> (the page template provides that)`;
}

// ─── page template ────────────────────────────────────────────────────────────

function buildPage(topic, articleHtml, publishedDate) {
  const canonicalUrl = `${SITE_URL}/blog/${topic.slug}/`;
  const formattedDate = formatDate(publishedDate);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${topic.title} | CaptureYourWork Blog</title>
  <meta name="description" content="${topic.description}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${canonicalUrl}" />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${topic.title}" />
  <meta property="og:description" content="${topic.description}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="CaptureYourWork" />
  <meta property="article:published_time" content="${publishedDate}" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${topic.title}" />
  <meta name="twitter:description" content="${topic.description}" />

  <!-- JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "${topic.title.replace(/"/g, '\\"')}",
    "description": "${topic.description.replace(/"/g, '\\"')}",
    "datePublished": "${publishedDate}",
    "dateModified": "${publishedDate}",
    "author": {
      "@type": "Organization",
      "name": "CaptureYourWork",
      "url": "${SITE_URL}"
    },
    "publisher": {
      "@type": "Organization",
      "name": "CaptureYourWork",
      "url": "${SITE_URL}"
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "${canonicalUrl}"
    }
  }
  </script>

  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #1a1a1a; line-height: 1.7; }
    a { color: #f59e0b; }
    a:hover { color: #d97706; }
    .site-header { background: #0f172a; padding: 0 1.5rem; display: flex; align-items: center; justify-content: space-between; height: 56px; }
    .site-header a.logo { color: #f59e0b; font-weight: 700; font-size: 1.2rem; text-decoration: none; }
    .site-header nav a { color: #94a3b8; font-size: 0.875rem; margin-left: 1.5rem; text-decoration: none; }
    .site-header nav a:hover { color: #fff; }
    .hero { background: #0f172a; padding: 3rem 1.5rem 2.5rem; text-align: center; }
    .hero .breadcrumb { font-size: 0.8rem; color: #64748b; margin-bottom: 1rem; }
    .hero .breadcrumb a { color: #64748b; }
    .hero h1 { color: #f1f5f9; font-size: clamp(1.5rem, 4vw, 2.4rem); font-weight: 800; margin: 0 auto; max-width: 800px; line-height: 1.25; }
    .hero .meta { margin-top: 1rem; font-size: 0.85rem; color: #64748b; }
    .article-wrap { max-width: 740px; margin: 3rem auto; padding: 0 1.5rem 4rem; }
    .article-wrap h2 { font-size: 1.5rem; font-weight: 700; margin-top: 2.5rem; margin-bottom: 0.75rem; color: #0f172a; }
    .article-wrap h3 { font-size: 1.15rem; font-weight: 600; margin-top: 1.75rem; color: #1e293b; }
    .article-wrap p { margin: 0 0 1.2rem; }
    .article-wrap ul, .article-wrap ol { padding-left: 1.5rem; margin: 0 0 1.2rem; }
    .article-wrap li { margin-bottom: 0.4rem; }
    .cta-box { background: #fef9ec; border: 2px solid #f59e0b; border-radius: 12px; padding: 2rem; text-align: center; margin-top: 3rem; }
    .cta-box h3 { margin: 0 0 0.5rem; font-size: 1.2rem; color: #0f172a; }
    .cta-box p { margin: 0 0 1.2rem; color: #475569; font-size: 0.95rem; }
    .cta-btn { display: inline-block; background: #f59e0b; color: #0f172a; font-weight: 700; padding: 0.75rem 2rem; border-radius: 8px; text-decoration: none; font-size: 1rem; }
    .cta-btn:hover { background: #d97706; color: #0f172a; }
    .site-footer { background: #0f172a; color: #64748b; padding: 2rem 1.5rem; text-align: center; font-size: 0.85rem; }
    .site-footer a { color: #64748b; margin: 0 0.75rem; }
    @media (max-width: 600px) { .site-header nav { display: none; } }
  </style>
</head>
<body>

<header class="site-header">
  <a href="${SITE_URL}" class="logo">CaptureYourWork</a>
  <nav>
    <a href="${SITE_URL}/#features">Features</a>
    <a href="${SITE_URL}/#pricing">Pricing</a>
    <a href="${SITE_URL}/blog/">Blog</a>
    <a href="${SITE_URL}/#download">Download</a>
  </nav>
</header>

<div class="hero">
  <p class="breadcrumb"><a href="${SITE_URL}/">Home</a> › <a href="${SITE_URL}/blog/">Blog</a> › ${topic.title}</p>
  <h1>${topic.title}</h1>
  <p class="meta">Published ${formattedDate} &nbsp;·&nbsp; CaptureYourWork Team</p>
</div>

<div class="article-wrap">
  ${articleHtml}

  <div class="cta-box">
    <h3>Ready to document your jobs like a pro?</h3>
    <p>CaptureYourWork gives contractors GPS-tagged photos, organized projects, and client-ready PDF reports — free for 14 days, no credit card required.</p>
    <a href="${SITE_URL}/#download" class="cta-btn">Try CaptureYourWork Free</a>
  </div>
</div>

<footer class="site-footer">
  <p>
    <a href="${SITE_URL}/">Home</a>
    <a href="${SITE_URL}/blog/">Blog</a>
    <a href="${SITE_URL}/#pricing">Pricing</a>
    <a href="mailto:hello@captureyourwork.com">Contact</a>
  </p>
  <p style="margin-top:0.75rem">&copy; ${new Date().getFullYear()} CaptureYourWork. All rights reserved.</p>
</footer>

<!-- Crisp Chat -->
<script type="text/javascript">window.$crisp=[];window.CRISP_WEBSITE_ID="51fc2e33-c7e4-4f06-8e74-937fab1f1b1b";(function(){var d=document;var s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();</script>

</body>
</html>`;
}

// ─── blog index page ──────────────────────────────────────────────────────────

function buildBlogIndex(publishedTopics) {
  const cards = publishedTopics.map(t => `
    <article class="card">
      <a href="${SITE_URL}/blog/${t.slug}/">
        <h2>${t.title}</h2>
        <p>${t.description}</p>
        <span class="read-more">Read article →</span>
      </a>
    </article>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Blog | CaptureYourWork — Tips for Contractors</title>
  <meta name="description" content="Practical guides on job site photo documentation, contractor apps, and protecting your work — from the CaptureYourWork team." />
  <link rel="canonical" href="${SITE_URL}/blog/" />
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #1a1a1a; line-height: 1.6; }
    a { text-decoration: none; color: inherit; }
    .site-header { background: #0f172a; padding: 0 1.5rem; display: flex; align-items: center; justify-content: space-between; height: 56px; }
    .site-header a.logo { color: #f59e0b; font-weight: 700; font-size: 1.2rem; }
    .site-header nav a { color: #94a3b8; font-size: 0.875rem; margin-left: 1.5rem; }
    .site-header nav a:hover { color: #fff; }
    .hero { background: #0f172a; padding: 3rem 1.5rem; text-align: center; }
    .hero h1 { color: #f1f5f9; font-size: clamp(1.75rem, 5vw, 2.75rem); font-weight: 800; margin: 0; }
    .hero p { color: #94a3b8; margin-top: 0.75rem; font-size: 1.05rem; }
    .grid { max-width: 900px; margin: 3rem auto; padding: 0 1.5rem 4rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
    .card { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; transition: box-shadow 0.2s; }
    .card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .card a { display: block; padding: 1.5rem; height: 100%; }
    .card h2 { font-size: 1.05rem; font-weight: 700; margin: 0 0 0.5rem; color: #0f172a; line-height: 1.35; }
    .card p { font-size: 0.9rem; color: #64748b; margin: 0 0 1rem; }
    .read-more { font-size: 0.85rem; color: #f59e0b; font-weight: 600; }
    .empty { text-align: center; padding: 4rem 1.5rem; color: #64748b; }
    .site-footer { background: #0f172a; color: #64748b; padding: 2rem 1.5rem; text-align: center; font-size: 0.85rem; }
    .site-footer a { color: #64748b; margin: 0 0.75rem; }
  </style>
</head>
<body>
<header class="site-header">
  <a href="${SITE_URL}" class="logo">CaptureYourWork</a>
  <nav>
    <a href="${SITE_URL}/#features">Features</a>
    <a href="${SITE_URL}/#pricing">Pricing</a>
    <a href="${SITE_URL}/blog/">Blog</a>
    <a href="${SITE_URL}/#download">Download</a>
  </nav>
</header>
<div class="hero">
  <h1>The CaptureYourWork Blog</h1>
  <p>Practical guides for contractors who document their work</p>
</div>
${publishedTopics.length > 0
  ? `<div class="grid">${cards}</div>`
  : '<div class="empty"><p>Articles coming soon — check back shortly.</p></div>'}
<footer class="site-footer">
  <p><a href="${SITE_URL}/">Home</a><a href="${SITE_URL}/blog/">Blog</a><a href="${SITE_URL}/#pricing">Pricing</a><a href="mailto:hello@captureyourwork.com">Contact</a></p>
  <p style="margin-top:0.75rem">&copy; ${new Date().getFullYear()} CaptureYourWork. All rights reserved.</p>
</footer>
<!-- Crisp Chat -->
<script type="text/javascript">window.$crisp=[];window.CRISP_WEBSITE_ID="51fc2e33-c7e4-4f06-8e74-937fab1f1b1b";(function(){var d=document;var s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();</script>
</body>
</html>`;
}

// ─── sitemap ──────────────────────────────────────────────────────────────────

function buildSitemap(publishedTopics) {
  const today2 = today();
  const staticUrls = [
    { loc: `${SITE_URL}/`, priority: '1.0' },
    { loc: `${SITE_URL}/blog/`, priority: '0.8' },
  ];
  const blogUrls = publishedTopics.map(t => ({
    loc: `${SITE_URL}/blog/${t.slug}/`,
    priority: '0.7',
    lastmod: t.publishedDate,
  }));

  const entries = [...staticUrls, ...blogUrls].map(u => `
  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod ?? today2}</lastmod>
    <changefreq>${u.priority === '1.0' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📋 Loading published manifest from S3…');
  const manifest = await getManifest();
  const publishedSlugs = new Set(manifest.published.map(p => p.slug));

  // Pick topic
  let topic;
  if (FORCE_SLUG) {
    topic = TOPICS.find(t => t.slug === FORCE_SLUG);
    if (!topic) { console.error(`No topic found with slug: ${FORCE_SLUG}`); process.exit(1); }
    console.log(`🎯 Forced topic: ${topic.title}`);
  } else {
    topic = TOPICS.find(t => !publishedSlugs.has(t.slug));
    if (!topic) { console.log('✅ All topics have been published — nothing to do.'); return; }
    console.log(`📝 Next topic: ${topic.title}`);
  }

  // Generate article via Claude Code CLI
  console.log('🤖 Generating article with Claude…');
  const prompt = buildPrompt(topic);
  let articleHtml;
  try {
    articleHtml = claude(prompt);
    // Strip markdown code fences if Claude wrapped the output
    articleHtml = articleHtml.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
  } catch (err) {
    console.error('Claude CLI failed:', err.message);
    process.exit(1);
  }
  console.log(`   Generated ${articleHtml.length} characters`);

  const publishedDate = new Date().toISOString().slice(0, 10);
  const pageHtml = buildPage(topic, articleHtml, publishedDate);

  if (DRY_RUN) {
    console.log('\n─── DRY RUN — HTML preview (first 500 chars) ───');
    console.log(pageHtml.slice(0, 500));
    console.log('────────────────────────────────────────────────\n');
    console.log('Dry run complete. Pass --slug or remove --dry-run to publish.');
    return;
  }

  // Save local draft
  mkdirSync('./drafts', { recursive: true });
  writeFileSync(`./drafts/${topic.slug}.html`, pageHtml);
  console.log(`💾 Saved draft: drafts/${topic.slug}.html`);

  // Upload article
  const articleKey = `blog/${topic.slug}/index.html`;
  console.log(`⬆️  Uploading ${articleKey}…`);
  await putObject(articleKey, pageHtml, 'text/html; charset=utf-8');

  // Update manifest
  const updatedPublished = [
    ...manifest.published.filter(p => p.slug !== topic.slug),
    { slug: topic.slug, title: topic.title, description: topic.description, publishedDate },
  ];
  // Keep same order as TOPICS
  updatedPublished.sort((a, b) => {
    const ai = TOPICS.findIndex(t => t.slug === a.slug);
    const bi = TOPICS.findIndex(t => t.slug === b.slug);
    return ai - bi;
  });
  await putObject(MANIFEST_KEY, JSON.stringify({ published: updatedPublished }, null, 2), 'application/json');

  // Rebuild blog index
  console.log('📄 Rebuilding blog/index.html…');
  const blogIndex = buildBlogIndex(updatedPublished);
  await putObject('blog/index.html', blogIndex, 'text/html; charset=utf-8');

  // Rebuild sitemap
  console.log('🗺️  Updating sitemap.xml…');
  const sitemap = buildSitemap(updatedPublished);
  await putObject('sitemap.xml', sitemap, 'application/xml');

  console.log(`\n✅ Published: ${SITE_URL}/blog/${topic.slug}/`);
  console.log(`   Total published: ${updatedPublished.length} / ${TOPICS.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
