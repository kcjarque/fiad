// FIAD Season 2 "40-Day Email Blast Campaign" — seed content.
//
// 16 visitor + 4 supplier emails (Aug 11 → Sept 19 2026), converted from
// Downloads/FIAD-40-Day-Email-Campaign.docx into on-brand, mobile-first HTML.
//
// Design: elegant / editorial (per the brand's aspirational tone) — ivory
// canvas, plum as the signature band + footer, a single coral CTA, Georgia
// serif display over a clean sans body, generous whitespace.
//
// Merge tokens are left literal in body_html and filled at send/preview time:
//   {{first_name}}       recipient's first name
//   {{register_link}}    campaign.register_link
//   {{from_name}}        campaign.from_name  (email signature)
//   {{fb_page}}          campaign.fb_page    (supplier CTA)
//   {{unsubscribe_url}}  per-send unsubscribe (mailto default)
//
// Program hours, raffle draw times and ingress schedule are intentionally kept
// as visible [PLACEHOLDER] text — the FIAD team finalizes these before sending.

export type CampaignTrack = 'visitor' | 'supplier';

export type SeedEmail = {
  /** Stable key — used to derive a deterministic row id so re-seeding is idempotent. */
  key: string;
  track: CampaignTrack;
  seqNo: number;
  label: string;
  subject: string;
  preview: string;
  /** ISO timestamp with Asia/Manila (+08:00) offset. */
  scheduledAt: string;
  bodyHtml: string;
};

// ── Brand tokens (inline — email clients strip <style>) ──────────────────────
const PLUM = '#3E2A3E';
const CORAL = '#E63F75';
const GOLD = '#D4AF7A';
const BODY = '#453a45';
const MUTED = '#7a6b75';

const SANS = 'Helvetica,Arial,sans-serif';
const SERIF = "Georgia,'Times New Roman',serif";

// ── HTML helpers ─────────────────────────────────────────────────────────────
const eyebrow = (t: string) =>
  `<p style="margin:0 0 12px;color:${GOLD};font-family:${SANS};font-size:12px;letter-spacing:2px;text-transform:uppercase;">${t}</p>`;

const h2 = (t: string) =>
  `<h1 style="margin:0 0 18px;color:${PLUM};font-family:${SERIF};font-size:25px;line-height:1.25;font-weight:normal;">${t}</h1>`;

const p = (t: string) =>
  `<p style="margin:0 0 16px;color:${BODY};font-family:${SANS};font-size:16px;line-height:1.65;">${t}</p>`;

const bullets = (items: string[]) =>
  `<ul style="margin:0 0 18px;padding-left:22px;color:${BODY};font-family:${SANS};font-size:16px;line-height:1.6;">` +
  items.map((i) => `<li style="margin:0 0 9px;">${i}</li>`).join('') +
  `</ul>`;

const cta = (label: string, href: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;"><tr>` +
  `<td style="border-radius:999px;background:${CORAL};">` +
  `<a href="${href}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-family:${SANS};font-size:15px;font-weight:bold;letter-spacing:.3px;text-decoration:none;border-radius:999px;">${label}</a>` +
  `</td></tr></table>`;

/** Champagne-tinted callout for prizes / highlights. */
const callout = (t: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;"><tr>` +
  `<td style="background:#FBF3E8;border:1px solid #EBD9BE;border-radius:12px;padding:16px 20px;">` +
  `<p style="margin:0;color:${PLUM};font-family:${SERIF};font-size:17px;line-height:1.5;">${t}</p></td></tr></table>`;

/** Small muted line for dates / venue. */
const meta = (t: string) =>
  `<p style="margin:20px 0 0;color:${MUTED};font-family:${SANS};font-size:13px;line-height:1.55;">${t}</p>`;

const signoff = (closer: string) =>
  `<p style="margin:22px 0 2px;color:${BODY};font-family:${SANS};font-size:16px;line-height:1.6;">${closer}</p>` +
  `<p style="margin:0;color:${PLUM};font-family:${SERIF};font-size:17px;">{{from_name}}</p>`;

const ps = (t: string) =>
  `<p style="margin:20px 0 0;color:${MUTED};font-family:${SANS};font-size:14px;line-height:1.6;">${t}</p>`;

/** Wrap an email body in the branded shell. */
const wrap = (preview: string, inner: string) =>
  `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>` +
  `<meta name="viewport" content="width=device-width,initial-scale=1"/>` +
  `<meta name="color-scheme" content="light"/><title>Forever in a Day</title></head>` +
  `<body style="margin:0;padding:0;background:#FFF2F6;">` +
  `<span style="display:none!important;max-height:0;overflow:hidden;opacity:0;color:#FFF2F6;">${preview}</span>` +
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF2F6;padding:28px 14px;"><tr><td align="center">` +
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(62,42,62,.08);">` +
  // Header band
  `<tr><td style="background:${PLUM};padding:26px 40px;text-align:center;">` +
  `<p style="margin:0;color:${GOLD};font-family:${SERIF};font-size:13px;letter-spacing:5px;text-transform:uppercase;">Forever in a Day</p>` +
  `<p style="margin:9px 0 0;color:rgba(255,242,246,.55);font-family:${SANS};font-size:10px;letter-spacing:3px;text-transform:uppercase;">Season 2 &nbsp;·&nbsp; Japan Concept &nbsp;·&nbsp; Sept 18–20</p>` +
  `</td></tr>` +
  // Body
  `<tr><td style="padding:38px 40px 14px;">${inner}</td></tr>` +
  // Footer
  `<tr><td style="padding:6px 40px 34px;">` +
  `<hr style="border:none;border-top:1px solid #efe6ec;margin:0 0 16px;"/>` +
  `<p style="margin:0 0 6px;color:#9a8b95;font-family:${SANS};font-size:12px;line-height:1.55;">Forever in a Day · September 18–20, 2026<br/>Brittany Hotel, BGC (10AM–10PM) · Mella Hotel, Las Piñas (10AM–8PM)</p>` +
  `<p style="margin:0;color:#b3a6b0;font-family:${SANS};font-size:11px;line-height:1.55;">You're receiving this as a guest of Forever in a Day. <a href="{{unsubscribe_url}}" style="color:#9a8b95;text-decoration:underline;">Unsubscribe</a></p>` +
  `</td></tr>` +
  `</table></td></tr></table></body></html>`;

const greet = (name = '{{first_name}}') => p(`Dear ${name},`);

// ── Visitor track (16) ───────────────────────────────────────────────────────
const visitor: SeedEmail[] = [
  {
    key: 'v1',
    track: 'visitor',
    seqNo: 1,
    label: 'Email 1 — The Big Reveal',
    subject: 'something beautiful is coming',
    preview: 'September 18–20. Save the dates.',
    scheduledAt: '2026-08-11T19:00:00+08:00',
    bodyHtml: wrap(
      'September 18–20. Save the dates.',
      eyebrow('The Reveal') +
        h2('Something beautiful is coming.') +
        greet() +
        p('We’ve missed you.') +
        p('It’s been a while since you last joined us at ForeverInADay — and we’re delighted to share that we’re returning this <strong>September 18–20</strong> with our most elegant fair yet.') +
        p('This year, we’re at two beautiful venues:') +
        bullets([
          '<strong>Brittany Hotel, BGC</strong> — 10AM to 10PM',
          '<strong>Mella Hotel, Las Piñas</strong> — 10AM to 8PM',
        ]) +
        p('Whether you’re planning a wedding, a debut, or a corporate celebration, everything you need will be under one roof — curated suppliers, exclusive food tastings, and one extraordinary grand prize we can’t wait to tell you about.') +
        p('For now: mark the dates. <em>Ito na ’yun.</em>') +
        cta('Reserve your complimentary slot', '{{register_link}}') +
        signoff('With love,'),
    ),
  },
  {
    key: 'v2',
    track: 'visitor',
    seqNo: 2,
    label: 'Email 2 — Japan Theme Reveal',
    subject: 'konnichiwa 🎌',
    preview: 'This year’s theme is unlike anything we’ve done.',
    scheduledAt: '2026-08-14T08:00:00+08:00',
    bodyHtml: wrap(
      'This year’s theme is unlike anything we’ve done.',
      eyebrow('Japan Concept') +
        h2('Konnichiwa.') +
        greet() +
        p('The reveal you’ve been waiting for…') +
        p('This year, ForeverInADay is inspired by <strong>Japan</strong>.') +
        p('Picture this: cherry blossom installations, kimono photo sessions, and supplier booths transformed into Japanese-inspired showcases — each one competing for our <strong>Best Booth</strong> award, so expect them to go all out.') +
        p('This isn’t your typical bridal fair. This is an experience, promise.') +
        cta('Reserve your slot', '{{register_link}}') +
        p('In our next letter: a grand prize announcement that might just take your breath away.') +
        meta('September 18–20 &nbsp;|&nbsp; Brittany Hotel, BGC / Mella Hotel, Las Piñas') +
        signoff('Warmly,'),
    ),
  },
  {
    key: 'v3',
    track: 'visitor',
    seqNo: 3,
    label: 'Email 3 — Wedding Ring Grand Raffle',
    subject: 'one couple will win a wedding ring',
    preview: 'The Couple Grand Prize, by Vaella.',
    scheduledAt: '2026-08-18T08:00:00+08:00',
    bodyHtml: wrap(
      'The Couple Grand Prize, by Vaella.',
      eyebrow('Couple Grand Prize') +
        h2('One couple will win a wedding ring.') +
        greet() +
        p('Yes, you read that right.') +
        callout('At this September’s fair, one lucky couple will take home a <strong>wedding ring</strong> — courtesy of <strong>Vaella</strong>.') +
        p('No purchase required. Simply attend, enter the raffle, and you’re in the running.') +
        p('Imagine spending the day discovering your dream suppliers… and leaving with a ring. <em>Kilig, di ba?</em>') +
        cta('Register for free', '{{register_link}}') +
        meta('Sept 18–20 &nbsp;|&nbsp; Brittany BGC / Mella Las Piñas') +
        p('Next up: how to secure your seat at our most exclusive experience — the Grand Food Tasting.') +
        signoff('Warmly,'),
    ),
  },
  {
    key: 'v4',
    track: 'visitor',
    seqNo: 4,
    label: 'Email 4 — Why Past Guests Should Return',
    subject: 'you’ve seen FIAD — but not like this',
    preview: 'As a past guest, you get first access.',
    scheduledAt: '2026-08-21T08:00:00+08:00',
    bodyHtml: wrap(
      'As a past guest, you get first access.',
      eyebrow('Past-Guest Priority') +
        h2('You’ve seen FIAD — but not like this.') +
        greet() +
        p('Since you’ve been part of the FIAD family before, we’ll be direct:') +
        p('This year is bigger, more curated, and far more rewarding.') +
        p('<strong>What’s new:</strong>') +
        bullets([
          'A fully realized Japan concept across both venues',
          'Exclusive Grand Food Tastings — by invitation',
          'Kimono on-site photo sessions',
          'The Wedding Ring Grand Raffle, by Vaella',
          '₱5,000 cash raffles (yes, more than one)',
        ]) +
        p('And because you’re a past guest, you’re receiving this invitation ahead of the public. <em>First access sa inyo, syempre.</em>') +
        cta('Claim your priority slot', '{{register_link}}') +
        signoff('With love,'),
    ),
  },
  {
    key: 'v5',
    track: 'visitor',
    seqNo: 5,
    label: 'Email 5 — Grand Food Tasting (Weddings & Debut)',
    subject: 'an invitation to taste',
    preview: 'The Grand Food Tasting. Limited seats.',
    scheduledAt: '2026-08-25T08:00:00+08:00',
    bodyHtml: wrap(
      'The Grand Food Tasting. Limited seats.',
      eyebrow('Grand Food Tasting') +
        h2('An invitation to taste.') +
        greet() +
        p('There’s one part of event planning everyone secretly looks forward to: the food tasting.') +
        p('At this year’s fair, we’re hosting an <strong>Exclusive Grand Food Tasting with Jhossa Events Management</strong> — created for those planning a wedding or debut.') +
        p('Sample actual menus. Meet the caterer behind them. And if you fall in love with what you taste, book on the spot with fair-exclusive rates.') +
        callout('One caveat: this is <strong>invite-only</strong>, and seats are limited. Registered guests receive priority invitations.') +
        cta('Register to secure yours', '{{register_link}}') +
        meta('Sept 18–20 &nbsp;|&nbsp; Brittany BGC / Mella Las Piñas') +
        signoff('Bon appétit,'),
    ),
  },
  {
    key: 'v6',
    track: 'visitor',
    seqNo: 6,
    label: 'Email 6 — Grand Food Tasting (Corporate)',
    subject: 'for your company’s next celebration',
    preview: 'ZUS Catering + Gallery of Food. Taste before you book.',
    scheduledAt: '2026-08-27T08:00:00+08:00',
    bodyHtml: wrap(
      'ZUS Catering + Gallery of Food. Taste before you book.',
      eyebrow('Corporate Food Tasting') +
        h2('For your company’s next celebration.') +
        greet() +
        p('ForeverInADay isn’t only for weddings.') +
        p('If you’re the one organizing your company’s Christmas party, team building, year-end celebration, or product launch — this is for you:') +
        callout('An <strong>Exclusive Grand Food Tasting for Corporate</strong>, featuring <strong>ZUS Catering</strong> and <strong>Gallery of Food</strong>, at our BGC venue.') +
        p('Taste the actual menus. Compare premier caterers side by side. Book at fair-only rates.') +
        p('One elegant afternoon, and your Q4 catering is settled. <em>Tapos na agad.</em>') +
        cta('Register for free', '{{register_link}}') +
        meta('Brittany Hotel, BGC — Sept 18–19, 10AM–10PM') +
        signoff('Best,'),
    ),
  },
  {
    key: 'v7',
    track: 'visitor',
    seqNo: 7,
    label: 'Email 7 — Bring a Friend = ₱5,000',
    subject: 'bring someone lovely, win ₱5,000',
    preview: 'A raffle entry for you and your plus-one.',
    scheduledAt: '2026-08-29T08:00:00+08:00',
    bodyHtml: wrap(
      'A raffle entry for you and your plus-one.',
      eyebrow('Bring a Friend') +
        h2('Bring someone lovely, win ₱5,000.') +
        greet() +
        p('Here’s a delightful little arrangement:') +
        callout('Bring a friend to the fair → earn an entry to our <strong>₱5,000 raffle</strong>.') +
        p('That’s it. You get a companion for the gown fittings and cake tastings, and a chance at ₱5,000 on top.') +
        p('Invite your maid of honor, your sister, your best friend — <em>basta may kasama ka.</em>') +
        cta('Register together', '{{register_link}}') +
        meta('Sept 18–20 &nbsp;|&nbsp; Brittany BGC / Mella Las Piñas') +
        ps('<strong>P.S.</strong> Know a supplier — a caterer, photographer, or stylist — who’d love a booth? Refer them and win ₱5,000 as well. Simply reply to this email.') +
        signoff('Warmly,'),
    ),
  },
  {
    key: 'v8',
    track: 'visitor',
    seqNo: 8,
    label: 'Email 8 — Activities Rundown',
    subject: 'five experiences awaiting you',
    preview: 'Kimono portraits, cake tasting, gown fittings…',
    scheduledAt: '2026-09-01T08:00:00+08:00',
    bodyHtml: wrap(
      'Kimono portraits, cake tasting, gown fittings…',
      eyebrow('At the Fair') +
        h2('Five experiences awaiting you.') +
        greet() +
        p('Allow us to walk you through your day at the fair — even a single visit will be worth it:') +
        bullets([
          '<strong>Kimono On-Site Photo</strong> — a Japan-inspired portrait session, on the spot',
          '<strong>Know Your Ring Size</strong> — with Nathan King (so no one has to guess)',
          '<strong>Cake Tasting</strong> — with From Paulyn',
          '<strong>Film Showing</strong> — real wedding films by our photo &amp; video artists',
          '<strong>Wedding &amp; Debut Gown Fittings</strong> — yes, actual try-ons, right at the fair',
        ]) +
        p('All of it included with your complimentary registration.') +
        cta('Register now', '{{register_link}}') +
        meta('Sept 18–20 &nbsp;|&nbsp; Brittany BGC (10AM–10PM) / Mella Las Piñas (10AM–8PM)') +
        signoff('With love,'),
    ),
  },
  {
    key: 'v9',
    track: 'visitor',
    seqNo: 9,
    label: 'Email 9 — Gown Try-On Spotlight',
    subject: 'the moment you first wear it',
    preview: 'Try on your dream gown — at the fair itself.',
    scheduledAt: '2026-09-03T08:00:00+08:00',
    bodyHtml: wrap(
      'Try on your dream gown — at the fair itself.',
      eyebrow('Gown Fittings') +
        h2('The moment you first wear it.') +
        greet() +
        p('There’s a moment in every planning journey you never forget:') +
        p('The first time you wear the gown and just <em>know</em>.') +
        p('At ForeverInADay, you won’t need appointments at ten different ateliers. Our gown designers will be fitting wedding and debut gowns <strong>on-site</strong>.') +
        p('Feel the fabric. See yourself in the mirror. Let the moment happen — <em>dun mo malalaman na “ito na.”</em>') +
        p('And if you find the one? Reserve it at fair-exclusive rates.') +
        cta('Complimentary registration', '{{register_link}}') +
        meta('September 18–20, 2026') +
        signoff('Warmly,'),
    ),
  },
  {
    key: 'v10',
    track: 'visitor',
    seqNo: 10,
    label: 'Email 10 — Social Proof / FOMO',
    subject: 'seats are filling quickly',
    preview: 'Especially the Grand Food Tasting.',
    scheduledAt: '2026-09-05T08:00:00+08:00',
    bodyHtml: wrap(
      'Especially the Grand Food Tasting.',
      eyebrow('Almost Full') +
        h2('Seats are filling quickly.') +
        greet() +
        p('A gentle heads-up:') +
        p('Registrations for the fair are moving quickly — particularly for the <strong>Grand Food Tasting</strong>, which is genuinely limited.') +
        p('A reminder of everything reserved for you once registered:') +
        bullets([
          'Complimentary entry, both venues',
          'Priority invitation to the Exclusive Grand Food Tasting',
          'Entry to the Wedding Ring Grand Raffle, by Vaella',
          'The bring-a-friend ₱5,000 raffle',
          'Full access to every experience — kimono portraits, cake tasting, gown fittings, and more',
        ]) +
        p('It costs nothing. But once it’s full, it’s full. <em>Sayang naman.</em>') +
        cta('Reserve your slot', '{{register_link}}') +
        signoff('Best,'),
    ),
  },
  {
    key: 'v11',
    track: 'visitor',
    seqNo: 11,
    label: 'Email 11 — Program / Event Flow',
    subject: 'your itinerary awaits',
    preview: 'Plan your perfect FIAD day.',
    scheduledAt: '2026-09-07T08:00:00+08:00',
    bodyHtml: wrap(
      'Plan your perfect FIAD day.',
      eyebrow('Program') +
        h2('Your itinerary awaits.') +
        greet() +
        p('To help you plan your visit beautifully, here’s the flow of the fair:') +
        callout('<strong>Brittany Hotel, BGC</strong> — 10AM to 10PM<br/><span style="font-family:' +
          SANS +
          ';font-size:14px;color:' +
          MUTED +
          ';">[INSERT FINAL PROGRAM: opening, supplier showcase, food tasting schedules, film showing, raffle draws, awarding]</span>') +
        callout('<strong>Mella Hotel, Las Piñas</strong> — 10AM to 8PM<br/><span style="font-family:' +
          SANS +
          ';font-size:14px;color:' +
          MUTED +
          ';">[INSERT FINAL PROGRAM]</span>') +
        p('A few insider tips:') +
        bullets([
          'Arrive in the morning for unhurried supplier browsing',
          'Raffle draws happen at <strong>[TIME]</strong> — you must be present to win',
          'Wear comfortable shoes; you’ll want to see everything',
        ]) +
        cta('Not yet registered?', '{{register_link}}') +
        meta('Ten days to go!') +
        signoff('Warmly,'),
    ),
  },
  {
    key: 'v12',
    track: 'visitor',
    seqNo: 12,
    label: 'Email 12 — One Week Warning',
    subject: 'one week from today',
    preview: 'Seven days until the fair opens.',
    scheduledAt: '2026-09-10T08:00:00+08:00',
    bodyHtml: wrap(
      'Seven days until the fair opens.',
      eyebrow('One Week to Go') +
        h2('One week from today.') +
        greet() +
        p('One week to go.') +
        p('If you’ve been telling yourself you’d finally sort out your supplier list — this is the weekend to do it.') +
        p('One trip. Every supplier you need. Plus food tastings, raffles, and a wedding ring waiting to be won.') +
        cta('Final call for slots', '{{register_link}}') +
        meta('September 18–20 &nbsp;|&nbsp; Brittany Hotel BGC (10AM–10PM) / Mella Hotel Las Piñas (10AM–8PM)') +
        ps('And remember: bringing a friend earns you a ₱5,000 raffle entry. Forward this email to her <em>na.</em>') +
        signoff('Best,'),
    ),
  },
  {
    key: 'v13',
    track: 'visitor',
    seqNo: 13,
    label: 'Email 13 — Raffle Recap / Last Push for Referrals',
    subject: 'everything you could take home',
    preview: 'A ring. Cash. Exclusive experiences.',
    scheduledAt: '2026-09-12T08:00:00+08:00',
    bodyHtml: wrap(
      'A ring. Cash. Exclusive experiences.',
      eyebrow('What’s at Stake') +
        h2('Everything you could take home.') +
        greet() +
        p('The complete list of what’s at stake at this year’s fair:') +
        bullets([
          '<strong>A Wedding Ring</strong> — the Couple Grand Prize, by Vaella',
          '<strong>₱5,000</strong> — the Bring-a-Friend visitor raffle',
          '<strong>₱5,000</strong> — the Refer-a-Supplier prize (know a caterer, photographer, or stylist? Reply to this email before Sept 15)',
          '<strong>The Exclusive Grand Food Tasting</strong> — complimentary for registered guests',
        ]) +
        p('All on top of free entry and every activity at the fair. <em>Ang dami, di ba?</em>') +
        cta('Register now', '{{register_link}}') +
        meta('Five days to go.') +
        signoff('Warmly,'),
    ),
  },
  {
    key: 'v14',
    track: 'visitor',
    seqNo: 14,
    label: 'Email 14 — Final Logistics',
    subject: 'see you Wednesday',
    preview: 'Venues, hours, and what to bring.',
    scheduledAt: '2026-09-15T08:00:00+08:00',
    bodyHtml: wrap(
      'Venues, hours, and what to bring.',
      eyebrow('Final Details') +
        h2('See you Wednesday.') +
        greet() +
        p('Two days to go! Everything you need to know:') +
        p('<strong>VENUES &amp; HOURS</strong>') +
        bullets([
          'Brittany Hotel, BGC — Sept 18–19, 10AM–10PM',
          'Mella Hotel, Las Piñas — Sept 19–20, 10AM–8PM',
        ]) +
        p('<strong>ENTRY</strong><br/>Complimentary — simply present your registration confirmation at the entrance. Not yet registered? Last chance below.') +
        p('<strong>YOUR CHECKLIST</strong>') +
        bullets([
          'Registration confirmation (a screenshot is fine)',
          'A friend (the ₱5,000 raffle, remember?)',
          'Your phone or a notebook for supplier notes',
          'An appetite — there’s a food tasting and cake tasting with your name on it',
        ]) +
        cta('Last-chance registration', '{{register_link}}') +
        p('We can’t wait to see you. <em>Kitakits!</em>') +
        signoff('See you soon,'),
    ),
  },
  {
    key: 'v15',
    track: 'visitor',
    seqNo: 15,
    label: 'Email 15 — Day Before',
    subject: 'tomorrow, finally',
    preview: 'Doors open at 10AM.',
    scheduledAt: '2026-09-16T08:00:00+08:00',
    bodyHtml: wrap(
      'Doors open at 10AM.',
      eyebrow('Tomorrow') +
        h2('Tomorrow, finally.') +
        greet() +
        p('Tomorrow is the day.') +
        p('Doors open at <strong>10AM</strong> at both Brittany Hotel BGC and Mella Hotel Las Piñas.') +
        p('Early guests get first pick of food tasting slots, first access to gown fittings, and first in line for kimono portraits. <em>Unahan na ’to.</em>') +
        p('We’ll see you there.') +
        cta('Last-minute registration', '{{register_link}}') +
        signoff('With love,'),
    ),
  },
  {
    key: 'v16',
    track: 'visitor',
    seqNo: 16,
    label: 'Email 16 — Last Day Push',
    subject: 'today is the final day',
    preview: 'The grand raffle draw happens today.',
    scheduledAt: '2026-09-19T08:00:00+08:00',
    bodyHtml: wrap(
      'The grand raffle draw happens today.',
      eyebrow('Final Day') +
        h2('Today is the final day.') +
        greet() +
        p('If you haven’t made it to the fair yet — today is your last chance.') +
        p('It’s the final day of ForeverInADay, and today we hold:') +
        bullets([
          'The <strong>Wedding Ring Grand Raffle</strong> draw, by Vaella',
          'The <strong>₱5,000 raffle</strong> draws',
          'The awarding of <strong>Best Booth</strong>, <strong>Highest Booker</strong>, and <strong>Best Supplier</strong>',
        ]) +
        p('Food tastings, gown fittings, cake tasting, and kimono portraits remain open until closing.') +
        callout('Brittany BGC until <strong>10PM</strong> &nbsp;·&nbsp; Mella Las Piñas until <strong>8PM</strong>') +
        p('Come as you are. <em>Punta na!</em>') +
        cta('See you today', '{{register_link}}') +
        signoff('See you there,'),
    ),
  },
];

// ── Supplier track (4) ───────────────────────────────────────────────────────
const supplierCta = 'Message us on Facebook';

const supplier: SeedEmail[] = [
  {
    key: 's1',
    track: 'supplier',
    seqNo: 1,
    label: 'Supplier 1 — Booth Invitation',
    subject: 'booth slots for Sept 18–20',
    preview: 'FIAD Fair returns. Two venues.',
    scheduledAt: '2026-08-12T08:00:00+08:00',
    bodyHtml: wrap(
      'FIAD Fair returns. Two venues.',
      eyebrow('Booth Invitation') +
        h2('Booth slots for Sept 18–20.') +
        greet() +
        p('ForeverInADay Fair returns this <strong>September 18–20</strong> — and we’d be honored to have you with us again.') +
        p('Two venues this year:') +
        bullets([
          'Brittany Hotel, BGC (10AM–10PM)',
          'Mella Hotel, Las Piñas (10AM–8PM)',
        ]) +
        p('This year’s theme: <strong>Japan Concept</strong> — with a Best Booth award for the most beautifully executed Japan-inspired setup.') +
        p('<strong>At stake for suppliers:</strong>') +
        bullets([
          'Best Booth (Japan Concept)',
          'Highest Booker',
          'Best Supplier',
          '₱5,000 — for the supplier who brings the most guests',
        ]) +
        p('Interested in a booth? Reply to this email or message us for rates and the floor plan.') +
        cta(supplierCta, '{{fb_page}}') +
        signoff('Best regards,'),
    ),
  },
  {
    key: 's2',
    track: 'supplier',
    seqNo: 2,
    label: 'Supplier 2 — Bring Your Guests, Win ₱5,000',
    subject: '₱5,000 for one supplier',
    preview: 'The supplier with the most guests wins.',
    scheduledAt: '2026-08-25T08:00:00+08:00',
    bodyHtml: wrap(
      'The supplier with the most guests wins.',
      eyebrow('Supplier Incentive') +
        h2('₱5,000 for one supplier.') +
        greet() +
        p('A reminder about one of this year’s supplier incentives:') +
        callout('The supplier who brings the <strong>most guests</strong> to the fair wins <strong>₱5,000 cash</strong>.') +
        p('How it works: invite your clients, followers, and inquiries to visit (entry is complimentary for them), and have them credited to you. Tracking mechanics: <strong>[INSERT MECHANICS]</strong> — or simply reply to this email.') +
        p('It’s a win-win — more foot traffic to your booth, and a chance to take home cash on top. <em>Solb, di ba?</em>') +
        cta(supplierCta, '{{fb_page}}') +
        meta('Sept 18–20 &nbsp;|&nbsp; Brittany BGC / Mella Las Piñas') +
        signoff('Best regards,'),
    ),
  },
  {
    key: 's3',
    track: 'supplier',
    seqNo: 3,
    label: 'Supplier 3 — Best Booth Hype',
    subject: 'Japan concept booth inspiration',
    preview: 'The Best Booth award — are you in?',
    scheduledAt: '2026-09-08T08:00:00+08:00',
    bodyHtml: wrap(
      'The Best Booth award — are you in?',
      eyebrow('Best Booth Award') +
        h2('Japan concept booth inspiration.') +
        greet() +
        p('Ten days to the fair — how’s the booth coming along?') +
        p('A reminder that the <strong>Best Booth Award (Japan Concept)</strong> is up for grabs. Some inspiration:') +
        bullets([
          'A torii gate entrance',
          'Cherry blossom accents',
          'Paper lanterns and noren curtains',
          'Japanese-style packaging or giveaways',
        ]) +
        p('Judging happens during fair days, with the winner announced at the awarding on <strong>Sept 19</strong>.') +
        p('If you need anything from our side — floor plan, setup schedule, ingress details — just reply here.') +
        cta(supplierCta, '{{fb_page}}') +
        signoff('Best regards,'),
    ),
  },
  {
    key: 's4',
    track: 'supplier',
    seqNo: 4,
    label: 'Supplier 4 — Ingress & Final Details',
    subject: 'ingress details for Sept 17',
    preview: 'Setup schedule, floor plan, reminders.',
    scheduledAt: '2026-09-15T08:00:00+08:00',
    bodyHtml: wrap(
      'Setup schedule, floor plan, reminders.',
      eyebrow('Ingress') +
        h2('Ingress details for Sept 17.') +
        greet() +
        p('Two days to go! Final details:') +
        bullets([
          '<strong>INGRESS:</strong> [DATE / TIME — insert final schedule]',
          '<strong>FLOOR PLAN:</strong> [attach or link]',
          '<strong>BOOTH GUIDELINES:</strong> [insert]',
        ]) +
        p('<strong>Reminders:</strong>') +
        bullets([
          'Best Booth (Japan Concept) judging happens during fair days',
          'Guest-count tracking for the ₱5,000 supplier raffle — mechanics: [insert]',
          'Highest Booker and Best Supplier awards — announced Sept 19',
        ]) +
        p('We’re excited to see what you create. <em>Kitakits on Wednesday!</em>') +
        cta(supplierCta, '{{fb_page}}') +
        signoff('Best regards,'),
    ),
  },
];

export const FIAD_CAMPAIGN = {
  id: 'camp_fiad_s2',
  name: 'FIAD Season 2 — 40-Day Blast',
  fromName: 'Team FIAD',
  registerLink: 'https://www.fiad.app/rsvp',
  fbPage: 'https://www.facebook.com/foreverinadayfair',
};

export const CAMPAIGN_EMAILS: SeedEmail[] = [...visitor, ...supplier];

/** Fill merge tokens for a preview or a send. */
export const renderMergeFields = (
  html: string,
  data: { firstName?: string; registerLink?: string; fromName?: string; fbPage?: string; unsubscribeUrl?: string },
): string =>
  html
    .replaceAll('{{first_name}}', data.firstName || 'there')
    .replaceAll('{{register_link}}', data.registerLink || FIAD_CAMPAIGN.registerLink)
    .replaceAll('{{from_name}}', data.fromName || FIAD_CAMPAIGN.fromName)
    .replaceAll('{{fb_page}}', data.fbPage || FIAD_CAMPAIGN.fbPage)
    .replaceAll('{{unsubscribe_url}}', data.unsubscribeUrl || 'mailto:hello@fiad.app?subject=Unsubscribe');
