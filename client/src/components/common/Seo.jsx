import { useEffect } from 'react';

const DEFAULT_TITLE = 'NestFinder — Off-Campus Housing for SIWES Students';
const DEFAULT_DESC =
	'NestFinder — verified off-campus accommodation for students on industrial training (SIWES). Search, compare, and secure housing near your placement.';

function upsertMeta(attr, key, content) {
	if (content == null) return;
	let el = document.head.querySelector(`meta[${attr}="${key}"]`);
	if (!el) {
		el = document.createElement('meta');
		el.setAttribute(attr, key);
		document.head.appendChild(el);
	}
	el.setAttribute('content', content);
}

function upsertLink(rel, href) {
	if (!href) return;
	let el = document.head.querySelector(`link[rel="${rel}"]`);
	if (!el) {
		el = document.createElement('link');
		el.setAttribute('rel', rel);
		document.head.appendChild(el);
	}
	el.setAttribute('href', href);
}

/**
 * Per-page document title + Open Graph / Twitter meta. Updates the tags
 * imperatively so it coexists with the static defaults in index.html and works
 * on React 19 without a helmet library.
 *
 * NOTE: this runs client-side. Google (which renders JS) will pick these up, and
 * browser tab titles are correct — but social-media scrapers (WhatsApp/FB/Twitter)
 * do NOT execute JS, so rich link-previews for shared listing URLs still need
 * SSR / prerendering. See the SEO note in the roadmap memory.
 */
export default function Seo({ title, description, image, url, type = 'website' }) {
	useEffect(() => {
		const fullTitle = title ? `${title} · NestFinder` : DEFAULT_TITLE;
		const desc = description || DEFAULT_DESC;
		const canonical = url || window.location.href;

		const prevTitle = document.title;
		document.title = fullTitle;

		upsertMeta('name', 'description', desc);
		upsertMeta('property', 'og:title', fullTitle);
		upsertMeta('property', 'og:description', desc);
		upsertMeta('property', 'og:type', type);
		upsertMeta('property', 'og:url', canonical);
		upsertMeta('property', 'og:site_name', 'NestFinder');
		if (image) upsertMeta('property', 'og:image', image);
		upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
		upsertMeta('name', 'twitter:title', fullTitle);
		upsertMeta('name', 'twitter:description', desc);
		if (image) upsertMeta('name', 'twitter:image', image);
		upsertLink('canonical', canonical);

		return () => { document.title = prevTitle; };
	}, [title, description, image, url, type]);

	return null;
}
