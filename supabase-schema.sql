-- ============================================================
-- ONEWORLD clone site — Supabase (Postgres) schema
-- Run this in Supabase SQL Editor (Project Settings -> SQL Editor).
-- All text/image content is editable from the admin CMS.
--
-- NOTE: this DROPs and recreates the tables so the primary keys are plain
-- TEXT (matches the server code which uses string ids). Any existing test
-- data in messages/products will be cleared — safe for a fresh site.
-- ============================================================

drop table if exists messages cascade;
drop table if exists products cascade;

-- 留言（contact messages）
create table if not exists messages (
  id text primary key,
  created_at timestamptz default now(),
  name text, email text, phone text, message text,
  company text, country text, product text, budget text
);

-- 产品
create table if not exists products (
  id text primary key,
  name text,
  description text,
  price text,
  image text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 通用内容块（页眉/页脚/各板块图文）
create table if not exists content_blocks (
  key text primary key,
  title text default '',
  body text default '',
  image_url text default '',
  link_url text default '',
  updated_at timestamptz default now()
);

-- 广告 banner
create table if not exists banners (
  id text primary key,
  title text default '',
  image_url text default '',
  link_url text default '',
  sort_order int default 0,
  active boolean default true,
  created_at timestamptz default now()
);

-- 博客 / 新闻
create table if not exists blog_posts (
  id text primary key,
  slug text unique,
  title text,
  excerpt text default '',
  body text default '',
  cover_image text default '',
  published_at timestamptz default now(),
  active boolean default true
);

-- 买家询盘（quote / RFQ）
create table if not exists quotes (
  id text primary key,
  created_at timestamptz default now(),
  name text, email text, phone text, company text,
  country text, product text, message text, budget text
);

-- ============================================================
-- Seed default content (idempotent — safe to re-run)
-- ============================================================

-- --- content_blocks ---
insert into content_blocks (key, title, body, image_url, link_url) values
  ('site_name', 'ONEWORLD', '', '', ''),
  ('header_phone', '+86 21 5088 7788', 'Need help? Call us', '', ''),
  ('header_email', 'info@oneworldltd.com.cn', 'Email us', '', ''),
  ('hero_title', 'High-Performance Self-Adhesive Labels & Thermal Materials',
   'Empowering global businesses with stable supply chains and premium-grade coating technologies.',
   'https://picsum.photos/seed/oneworld-hero/1600/700', '/#/products'),
  ('hero_cta', 'View Products', '', '', '/#/products'),
  ('about_title', 'About Us',
   'Founded in 2017, ONEWORLD Group is a leading B2B manufacturer specializing in high-performance self-adhesive labels and thermal materials. With over 20 years of industry expertise and advanced manufacturing bases across China, we provide one-stop, customized material solutions—from R&D to final product—for global retail, logistics, and catering sectors. Committed to international quality standards (FDA/FSC/SGS), we deliver reliable, efficient, and professional foreign trade services to partners worldwide.',
   'https://picsum.photos/seed/oneworld-about/800/600', '/#/about'),
  ('about_stat1_num', '20+', 'Years of Industry Experience', '', ''),
  ('about_stat2_num', '24h', 'Quick Response', '', ''),
  ('about_stat3_num', '100%', 'Scan-Safe Certified Quality', '', ''),
  ('factory_title', 'Factory Introduction',
   'Our manufacturing bases are equipped with advanced coating, slitting and printing lines, supported by an in-house R&D team and a full-quality laboratory. Every roll and label goes through strict QC before shipment.',
   'https://picsum.photos/seed/oneworld-factory/800/600', ''),
  ('contact_title', 'Get In Touch',
   'Request a quote or send us a message — our team responds within 24 hours.', '', ''),
  ('footer_about', 'ONEWORLD Group',
   'Leading B2B manufacturer of self-adhesive labels and thermal materials. OEM/ODM services with international compliance.', '', ''),
  ('footer_copyright', '© 2026 ONEWORLD Group. All rights reserved.', '', '', ''),
  ('footer_address', 'Add: No. 1 Industrial Park, Shanghai, China', 'Reach us', '', '')
on conflict (key) do nothing;

-- --- banners ---
insert into banners (id, title, image_url, link_url, sort_order, active) values
  ('b1', 'Premium Thermal Materials', 'https://picsum.photos/seed/ow-banner1/1600/500', '/#/products', 1, true),
  ('b2', 'Custom OEM/ODM Label Solutions', 'https://picsum.photos/seed/ow-banner2/1600/500', '/#/about', 2, true)
on conflict (id) do nothing;

-- --- blog_posts ---
insert into blog_posts (id, slug, title, excerpt, body, cover_image, published_at, active) values
  ('p1', 'cold-chain-thermal-composite-labels',
   'Defeating Frost and Condensation: The Advanced Chemistry Behind Cold Chain Thermal Composite Labels.',
   'How low-temperature adhesives achieve instant bonding on frosted or condensing surfaces down to -40°C.',
   'Cold chain logistics demand labels that stay bonded and scannable even on frosted, condensing surfaces. Our composite labels use advanced low-temperature adhesives formulated to achieve instant bonding down to -40°C, preventing edge curl and data loss throughout the cold chain.

Combined with a protective top coat, the barcode remains 100% scan-safe during strenuous international freight handling.',
   'https://picsum.photos/seed/ow-blog1/800/450', '2026-07-08', true),
  ('p2', 'integrated-b2b-material-manufacturer',
   'Strategic Supply Security: The Value of Partnering with an Integrated B2B Material Manufacturer.',
   'Why an integrated manufacturer de-risks your supply chain from raw coating to finished label.',
   'Partnering with an integrated manufacturer means your supply chain is controlled end-to-end — from base paper and coating chemistry to slitting and printing. This reduces lead times, improves traceability, and protects you from single-source disruptions.

ONEWORLD''s vertically integrated production gives global partners stable, compliant supply at scale.',
   'https://picsum.photos/seed/ow-blog2/800/450', '2026-07-08', true),
  ('p3', 'medical-grade-thermal-paper',
   'Precision When It Matters Most: The Critical Quality Standards of Medical-Grade Thermal Paper.',
   'Medical-grade thermal papers must meet strict legibility and safety standards for patient safety.',
   'In healthcare, a misread label can be life-critical. Our medical-grade thermal papers deliver high-contrast, long-stable imaging and meet food-contact and pharmaceutical-grade safety standards for strict market entry.',
   'https://picsum.photos/seed/ow-blog3/800/450', '2026-07-08', true),
  ('p4', 'oem-odm-label-solutions',
   'Engineered for Customization: ONEWORLD''s Advanced R&D and Tailored OEM/ODM Label Solutions.',
   'From face stock to finish, our R&D tailors labels to your exact application.',
   'Every application is different. Our R&D team engineers face stock, adhesive and top coating to your exact requirement — luxury embellishments, chemical shielding, heat resistance or non-conductive films — delivered as turnkey OEM/ODM programs.',
   'https://picsum.photos/seed/ow-blog4/800/450', '2026-07-08', true)
on conflict (id) do nothing;

-- --- products (representative subset; add more from admin) ---
insert into products (id, name, description, price, image, sort_order) values
  ('pr1', 'Food, pharmaceuticals, blank labels, stickers, alcohol labels',
   'Highly versatile face stock widely used for high-volume warehousing outer cartons, blank thermal transfer printing, and generalized product identification.', '', 'https://picsum.photos/seed/ow-p1/600/400', 1),
  ('pr2', 'Remium decorative printed drug labels',
   'Receptive surface optimized for luxury embellishments like hot stamping and spot UV to significantly reinforce brand tiering.', '', 'https://picsum.photos/seed/ow-p2/600/400', 2),
  ('pr3', 'Medicine bottle & box marking labels',
   'Supporting micro-text definition and high-contrast batch code overprinting, fully in line with international pharmaceutical guidelines.', '', 'https://picsum.photos/seed/ow-p3/600/400', 3),
  ('pr4', 'Tire label',
   'Heavy-gauge, chemically shielded labels with high-tack backing engineered for ultra-aggressive bonding to rough, rubberized tire treads.', '', 'https://picsum.photos/seed/ow-p4/600/400', 4),
  ('pr5', 'Electronic component nameplate labels',
   'High-precision, heat-resistant, and non-conductive technical film perfectly suited for PCBs, batteries, and premium consumer appliance markings.', '', 'https://picsum.photos/seed/ow-p5/600/400', 5),
  ('pr6', 'Food & beverage bottle self-adhesive labels',
   'Non-toxic, vibrant branding carriers designed for glass and plastic beverage packaging to enhance on-shelf presence and visual appeal.', '', 'https://picsum.photos/seed/ow-p6/600/400', 6),
  ('pr7', 'Daily chemical bottle labels',
   'Outstanding moisture, chemical, and squeeze resistance, keeping labels flawless and bubble-free through frequent container deformation.', '', 'https://picsum.photos/seed/ow-p7/600/400', 7),
  ('pr8', 'Cold chain transportation labels',
   'Formulated with innovative low-temperature adhesives that achieve instant bonding on frosted or condensing surfaces down to -40°C.', '', 'https://picsum.photos/seed/ow-p8/600/400', 8),
  ('pr9', 'Air Logistics Label',
   'Ultra-tough, tear-proof thermal film ensures 100% scanning safety of critical barcodes during strenuous international freight handling.', '', 'https://picsum.photos/seed/ow-p9/600/400', 9),
  ('pr10', 'Supermarket Retail Label',
   'Delivering excellent, uniform print density for supermarket scales, dynamic shelf pricing, and localized inventory barcode scanning.', '', 'https://picsum.photos/seed/ow-p10/600/400', 10),
  ('pr11', '3-ply thermal courier waybill',
   'Traditional multi-part integrated label sheets engineered for smooth peeling and synchronous, high-definition tracking across all plies.', '', 'https://picsum.photos/seed/ow-p11/600/400', 11),
  ('pr12', 'Medical three-proof label',
   'Formulated with outstanding chemical solvent and friction resistance to ensure zero loss of critical tracking data on blood samples, test tubes, and medical equipment.', '', 'https://picsum.photos/seed/ow-p12/600/400', 12),
  ('pr13', 'Thermal cash register paper',
   'Premium, BPA-free commercial cash register rolls with long-lasting image stability, extensively trusted by global retail and catering giants.', '', 'https://picsum.photos/seed/ow-p13/600/400', 13),
  ('pr14', 'Thermal label paper',
   'Professional-grade direct thermal face stock engineered with an advanced protective layer, optimized for ribbon-free barcode printing and automated waybills.', '', 'https://picsum.photos/seed/ow-p14/600/400', 14),
  ('pr15', 'Thermal receipt paper',
   'Lightweight, high-sensitivity thermal paper designed for mobile and portable receipt terminals, offering uniform color density and lower printhead wear.', '', 'https://picsum.photos/seed/ow-p15/600/400', 15)
on conflict (id) do nothing;
