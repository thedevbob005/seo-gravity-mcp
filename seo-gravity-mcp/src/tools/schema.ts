import { fetchAndParsePage } from '../utils/scraper.js';
import { extractEntitiesWithSalience, extractSpoTriples } from '../utils/nlp.js';
import { EntitySalienceMapReport, SchemaValidationResult } from '../types/seo.js';

export async function mapEntitySalience(textOrUrl: string): Promise<EntitySalienceMapReport> {
  let content = textOrUrl;
  if (textOrUrl.startsWith('http') || textOrUrl.includes('<html') || textOrUrl.endsWith('.html')) {
    const page = await fetchAndParsePage(textOrUrl);
    content = page.cleanText;
  }

  const entities = extractEntitiesWithSalience(content);
  const triples = extractSpoTriples(content);

  const topEntity = entities[0]?.name || 'Primary Subject';

  return {
    totalEntitiesFound: entities.length,
    topEntities: entities,
    semanticTriples: triples,
    knowledgeGraphSummary: `Identified ${entities.length} primary entities anchored around '${topEntity}'. Extracted ${triples.length} Subject-Predicate-Object triples for search engine entity indexing.`
  };
}

export function generateSchemaMarkup(
  schemaType: 'Article' | 'FAQPage' | 'Product' | 'HowTo' | 'LocalBusiness' | 'Organization' | 'BreadcrumbList' | 'SoftwareApplication',
  data: Record<string, any>
): {
  schemaType: string;
  jsonLdScript: string;
  googleRichResultNotes: string[];
} {
  let schemaObj: any = {
    '@context': 'https://schema.org',
    '@type': schemaType
  };

  const notes: string[] = [];

  switch (schemaType) {
    case 'Article':
      schemaObj = {
        ...schemaObj,
        headline: data.headline || data.title || 'Article Headline',
        description: data.description || 'Article summary description',
        image: data.image || ['https://example.com/cover.jpg'],
        datePublished: data.datePublished || new Date().toISOString(),
        dateModified: data.dateModified || new Date().toISOString(),
        author: {
          '@type': 'Person',
          name: data.authorName || 'Editorial Team',
          url: data.authorUrl || 'https://example.com/about'
        },
        publisher: {
          '@type': 'Organization',
          name: data.publisherName || 'Company Name',
          logo: {
            '@type': 'ImageObject',
            url: data.publisherLogo || 'https://example.com/logo.png'
          }
        }
      };
      notes.push('Ensure dateModified is updated whenever significant text edits are deployed.');
      break;

    case 'FAQPage':
      const questions = Array.isArray(data.items) ? data.items : [
        { question: 'What is this service?', answer: 'This is a description of the service and capabilities.' }
      ];
      schemaObj = {
        ...schemaObj,
        mainEntity: questions.map(q => ({
          '@type': 'Question',
          name: q.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: q.answer
          }
        }))
      };
      notes.push('Google FAQ Rich Snippets require the exact FAQ text to be visibly visible on the page.');
      break;

    case 'Product':
      schemaObj = {
        ...schemaObj,
        name: data.name || 'Product Name',
        image: data.image || ['https://example.com/product.jpg'],
        description: data.description || 'Product description',
        sku: data.sku || 'SKU-001',
        offers: {
          '@type': 'Offer',
          url: data.url || 'https://example.com/product',
          priceCurrency: data.currency || 'USD',
          price: data.price || '99.00',
          availability: 'https://schema.org/InStock'
        }
      };
      notes.push('Include aggregateRating with real user reviews to unlock gold star snippets in SERPs.');
      break;

    case 'LocalBusiness':
      schemaObj = {
        ...schemaObj,
        name: data.name || 'Business Name',
        image: data.image || 'https://example.com/store.jpg',
        address: {
          '@type': 'PostalAddress',
          streetAddress: data.streetAddress || '123 Main St',
          addressLocality: data.city || 'San Francisco',
          addressRegion: data.state || 'CA',
          postalCode: data.zip || '94105',
          addressCountry: 'US'
        },
        telephone: data.phone || '+1-555-123-4567',
        openingHours: data.openingHours || ['Mo-Fr 09:00-17:00']
      };
      notes.push('Keep NAP (Name, Address, Phone) 100% consistent with Google Business Profile.');
      break;

    case 'BreadcrumbList':
      const breadcrumbs = Array.isArray(data.items) ? data.items : [{ name: 'Home', url: '/' }, { name: 'Category', url: '/category' }];
      schemaObj = {
        ...schemaObj,
        itemListElement: breadcrumbs.map((b, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: b.name,
          item: b.url
        }))
      };
      notes.push('Breadcrumbs replace raw URLs with clean hierarchy paths in Google search snippets.');
      break;

    default:
      schemaObj = { ...schemaObj, ...data };
  }

  const jsonString = JSON.stringify(schemaObj, null, 2);
  const jsonLdScript = `<script type="application/ld+json">\n${jsonString}\n</script>`;

  return {
    schemaType,
    jsonLdScript,
    googleRichResultNotes: notes
  };
}

export async function validateSchema(urlOrJsonLd: string): Promise<SchemaValidationResult> {
  const schemas: any[] = [];

  if (urlOrJsonLd.trim().startsWith('{') || urlOrJsonLd.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(urlOrJsonLd);
      if (Array.isArray(parsed)) schemas.push(...parsed);
      else schemas.push(parsed);
    } catch {}
  } else {
    const page = await fetchAndParsePage(urlOrJsonLd);
    schemas.push(...page.schemas);
  }

  const validatedSchemas: SchemaValidationResult['schemas'] = [];
  const richResults: SchemaValidationResult['googleRichResultEligibility'] = [];

  schemas.forEach(s => {
    const type = s['@type'] || 'Unknown';
    const missing: string[] = [];
    const improvements: string[] = [];

    if (type === 'Article' || type === 'BlogPosting') {
      if (!s.headline) missing.push('headline');
      if (!s.image) missing.push('image');
      if (!s.datePublished) missing.push('datePublished');
      if (!s.author) missing.push('author');
      if (!s.dateModified) improvements.push('Add dateModified to signal content updates.');
    } else if (type === 'FAQPage') {
      if (!s.mainEntity || !Array.isArray(s.mainEntity)) missing.push('mainEntity (must be array of Questions)');
    } else if (type === 'Product') {
      if (!s.name) missing.push('name');
      if (!s.offers) missing.push('offers (pricing)');
      if (!s.aggregateRating) improvements.push('Add aggregateRating to qualify for star rating snippets.');
    }

    const isValid = missing.length === 0;

    validatedSchemas.push({
      type,
      rawObject: s,
      isValid,
      missingMandatoryFields: missing,
      recommendedImprovements: improvements
    });

    richResults.push({
      feature: `${type} Rich Snippet`,
      eligible: isValid,
      missingRequirements: missing
    });
  });

  return {
    schemasDetectedCount: schemas.length,
    schemas: validatedSchemas,
    googleRichResultEligibility: richResults
  };
}
