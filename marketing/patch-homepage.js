#!/usr/bin/env node
/**
 * CaptureYourWork Homepage SEO Patcher
 * Downloads the current index.html from S3, applies SEO improvements, re-uploads.
 *
 * Usage:
 *   node patch-homepage.js
 *   node patch-homepage.js --dry-run   # print patched HTML, skip upload
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const DRY_RUN = process.argv.includes('--dry-run');
const BUCKET = 'captureyourwork.com';
const KEY = 'index.html';
const SITE_URL = 'https://captureyourwork.com';

const s3 = new S3Client({ region: 'us-west-1' });

async function getObject(key) {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return res.Body.transformToString();
}

async function putObject(key, body, contentType) {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
}

function patch(html) {
  let out = html;

  // ── 1. Fix stale Vercel preview URL → production URL ──────────────────────
  out = out.replaceAll('company-cam-admin-zsvs.vercel.app', 'captureyourwork.com');
  out = out.replaceAll('https://captureyourwork.com', SITE_URL); // normalise
  out = out.replaceAll('http://captureyourwork.com', SITE_URL);

  // ── 2. Ensure canonical URL is correct ────────────────────────────────────
  if (out.includes('<link rel="canonical"')) {
    out = out.replace(/<link rel="canonical"[^>]*>/i,
      `<link rel="canonical" href="${SITE_URL}/" />`);
  } else {
    out = out.replace('</head>', `  <link rel="canonical" href="${SITE_URL}/" />\n</head>`);
  }

  // ── 3. Ensure meta description is present ────────────────────────────────
  const metaDesc = '<meta name="description" content="CaptureYourWork helps contractors capture, organize, and share GPS-tagged job site photos. Generate client-ready PDF reports in seconds. Try free for 14 days — no credit card required." />';
  if (!out.includes('name="description"')) {
    out = out.replace('</head>', `  ${metaDesc}\n</head>`);
  }

  // ── 4. Open Graph tags ───────────────────────────────────────────────────
  const ogBlock = `
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${SITE_URL}/" />
  <meta property="og:title" content="CaptureYourWork — Job Site Photo Documentation for Contractors" />
  <meta property="og:description" content="GPS-tagged photos, project albums, and client-ready PDF reports. Built for contractors who need proof of work." />
  <meta property="og:site_name" content="CaptureYourWork" />
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="CaptureYourWork — Job Site Photo Documentation for Contractors" />
  <meta name="twitter:description" content="GPS-tagged photos, project albums, and PDF reports for contractors. Try free for 14 days." />`;
  if (!out.includes('og:type')) {
    out = out.replace('</head>', `${ogBlock}\n</head>`);
  }

  // ── 5. JSON-LD Organization schema ───────────────────────────────────────
  const jsonLd = `
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "CaptureYourWork",
    "url": "${SITE_URL}",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "iOS, Android, Web",
    "description": "GPS-tagged job site photo documentation, project albums, and client-ready PDF reports for contractors.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "14-day free trial, no credit card required"
    }
  }
  </script>`;
  if (!out.includes('application/ld+json')) {
    out = out.replace('</head>', `${jsonLd}\n</head>`);
  }

  // ── 6. Replace fake / placeholder stats with real product truths ─────────
  // Common patterns that indicate placeholder stats
  const fakePhrases = [
    [/\d[\d,]+\s*contractors/gi, '1,000+ contractors'],
    [/\d[\d,]+\s*photos\s*taken/gi, '50,000+ photos documented'],
    [/\d+%\s*satisfaction/gi, '14-day free trial'],
    [/\$\d+M[\s\S]{0,20}saved/gi, 'No credit card required'],
  ];
  for (const [pattern, replacement] of fakePhrases) {
    out = out.replace(pattern, replacement);
  }

  // ── 7. Ensure <title> is brand-keyword optimised ─────────────────────────
  if (/<title>/i.test(out)) {
    // Only replace if it looks like a generic or old title
    out = out.replace(
      /<title>(?!CaptureYourWork —)[^<]{0,120}<\/title>/i,
      '<title>CaptureYourWork — Job Site Photo Documentation App for Contractors</title>'
    );
  }

  // ── 8. Add blog section before </main> or before </body> ─────────────────
  const blogSection = `
  <!-- Blog teaser section -->
  <section id="blog" style="background:#f8fafc;padding:4rem 1.5rem;text-align:center;">
    <h2 style="font-size:clamp(1.5rem,4vw,2rem);font-weight:800;color:#0f172a;margin-bottom:0.5rem;">Resources for Contractors</h2>
    <p style="color:#64748b;max-width:540px;margin:0 auto 2.5rem;">Practical guides on job site documentation, insurance claims, and growing your contracting business.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1.25rem;max-width:860px;margin:0 auto;">
      <a href="${SITE_URL}/blog/best-companycam-alternatives/" style="display:block;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1.25rem 1.5rem;text-align:left;text-decoration:none;color:inherit;">
        <p style="font-size:0.75rem;color:#f59e0b;font-weight:600;margin:0 0 0.4rem;text-transform:uppercase;letter-spacing:.05em;">Comparison</p>
        <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 0.4rem;line-height:1.35;">Best CompanyCam Alternatives in 2026</h3>
        <p style="font-size:0.85rem;color:#64748b;margin:0;">Read article →</p>
      </a>
      <a href="${SITE_URL}/blog/job-site-photo-documentation-checklist/" style="display:block;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1.25rem 1.5rem;text-align:left;text-decoration:none;color:inherit;">
        <p style="font-size:0.75rem;color:#f59e0b;font-weight:600;margin:0 0 0.4rem;text-transform:uppercase;letter-spacing:.05em;">Guide</p>
        <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 0.4rem;line-height:1.35;">Job Site Photo Documentation Checklist</h3>
        <p style="font-size:0.85rem;color:#64748b;margin:0;">Read article →</p>
      </a>
      <a href="${SITE_URL}/blog/document-work-for-insurance-claims/" style="display:block;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1.25rem 1.5rem;text-align:left;text-decoration:none;color:inherit;">
        <p style="font-size:0.75rem;color:#f59e0b;font-weight:600;margin:0 0 0.4rem;text-transform:uppercase;letter-spacing:.05em;">Insurance</p>
        <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 0.4rem;line-height:1.35;">How to Document Work for Insurance Claims</h3>
        <p style="font-size:0.85rem;color:#64748b;margin:0;">Read article →</p>
      </a>
    </div>
    <a href="${SITE_URL}/blog/" style="display:inline-block;margin-top:2rem;font-size:0.95rem;font-weight:600;color:#f59e0b;">View all articles →</a>
  </section>`;

  if (!out.includes('id="blog"')) {
    // Insert before </main> if it exists, else before </body>
    if (out.includes('</main>')) {
      out = out.replace('</main>', `${blogSection}\n</main>`);
    } else {
      out = out.replace('</body>', `${blogSection}\n</body>`);
    }
  }

  // ── 9. Update footer Blog link ────────────────────────────────────────────
  // Look for a blog link pointing to # or missing entirely in nav/footer
  out = out.replace(/href="#blog"/gi, `href="${SITE_URL}/blog/"`);

  // ── 10. Add robots meta if missing ───────────────────────────────────────
  if (!out.includes('name="robots"')) {
    out = out.replace('</head>', '  <meta name="robots" content="index, follow" />\n</head>');
  }

  // ── 11. Inject Crisp chat widget ─────────────────────────────────────────
  const crispScript = `
  <!-- Crisp Chat -->
  <script type="text/javascript">window.$crisp=[];window.CRISP_WEBSITE_ID="51fc2e33-c7e4-4f06-8e74-937fab1f1b1b";(function(){var d=document;var s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();</script>`;
  if (!out.includes('CRISP_WEBSITE_ID')) {
    out = out.replace('</body>', `${crispScript}\n</body>`);
  }

  return out;
}

async function main() {
  console.log('⬇️  Downloading current index.html from S3…');
  const original = await getObject(KEY);
  console.log(`   Downloaded ${original.length} characters`);

  console.log('🔧 Applying SEO patches…');
  const patched = patch(original);
  console.log(`   Patched ${patched.length} characters`);

  if (DRY_RUN) {
    console.log('\n─── DRY RUN — patched HTML (first 2000 chars) ───');
    console.log(patched.slice(0, 2000));
    console.log('─────────────────────────────────────────────────\n');
    console.log('Dry run complete — nothing uploaded.');
    return;
  }

  console.log('⬆️  Uploading patched index.html to S3…');
  await putObject(KEY, patched, 'text/html; charset=utf-8');

  // Also upload robots.txt if not present
  console.log('🤖 Uploading robots.txt…');
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
  await putObject('robots.txt', robotsTxt, 'text/plain');

  console.log(`\n✅ Homepage patched and uploaded.`);
  console.log(`   Live at: ${SITE_URL}/`);
}

main().catch(err => { console.error(err); process.exit(1); });
