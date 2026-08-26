import natural from 'natural';
import { SpoTriple, EntitySalienceItem } from '../types/seo.js';

const tokenizer = new natural.WordTokenizer();
const stopwords = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot',
  'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each',
  'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d',
  'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
  'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s',
  'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll',
  'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll',
  'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which',
  'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d',
  'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves', 'also', 'just', 'like', 'get', 'use'
]);

/**
 * Extract meaningful 1-gram, 2-gram, and 3-gram keyphrases and calculate their frequencies.
 */
export function extractKeyphrases(text: string, maxItems = 30): Array<{ term: string; count: number; tf: number }> {
  const clean = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
  const rawTokens = tokenizer.tokenize(clean) || [];
  const tokens = rawTokens.filter(t => t.length > 2 && !stopwords.has(t) && !/^\d+$/.test(t));
  const totalTokens = tokens.length || 1;

  const phraseCounts = new Map<string, number>();

  // 1-grams
  for (const token of tokens) {
    phraseCounts.set(token, (phraseCounts.get(token) || 0) + 1);
  }

  // 2-grams
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]} ${tokens[i + 1]}`;
    phraseCounts.set(bigram, (phraseCounts.get(bigram) || 0) + 1);
  }

  // 3-grams
  for (let i = 0; i < tokens.length - 2; i++) {
    const trigram = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
    phraseCounts.set(trigram, (phraseCounts.get(trigram) || 0) + 1);
  }

  const results = Array.from(phraseCounts.entries())
    .filter(([_, count]) => count >= 2)
    .map(([term, count]) => ({
      term,
      count,
      tf: Number((count / totalTokens).toFixed(4))
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxItems);

  return results;
}

/**
 * Computes TF-IDF between target text and a set of competitor texts to detect content gaps.
 */
export function computeContentGapTfIdf(
  targetText: string,
  competitorTexts: string[]
): Array<{ term: string; competitorFrequency: number; targetFrequency: number; importance: 'high' | 'medium' | 'low' }> {
  const tfidf = new natural.TfIdf();
  
  // Doc 0 is target text
  tfidf.addDocument(targetText);
  
  // Docs 1..N are competitors
  for (const comp of competitorTexts) {
    tfidf.addDocument(comp);
  }

  const competitorTerms = new Map<string, { totalTfIdf: number; count: number }>();

  // Evaluate competitor terms
  for (let docIdx = 1; docIdx <= competitorTexts.length; docIdx++) {
    tfidf.listTerms(docIdx).forEach(item => {
      if (stopwords.has(item.term) || item.term.length < 3 || /^\d+$/.test(item.term)) return;
      const current = competitorTerms.get(item.term) || { totalTfIdf: 0, count: 0 };
      competitorTerms.set(item.term, {
        totalTfIdf: current.totalTfIdf + item.tfidf,
        count: current.count + 1
      });
    });
  }

  // Find target frequencies
  const targetTokens = (tokenizer.tokenize(targetText.toLowerCase()) || []).filter(t => !stopwords.has(t));
  const targetTokenCounts = new Map<string, number>();
  for (const t of targetTokens) {
    targetTokenCounts.set(t, (targetTokenCounts.get(t) || 0) + 1);
  }

  const gaps: Array<{ term: string; competitorFrequency: number; targetFrequency: number; importance: 'high' | 'medium' | 'low' }> = [];

  for (const [term, data] of competitorTerms.entries()) {
    const targetFreq = targetTokenCounts.get(term) || 0;
    const avgCompFreq = Number((data.count / competitorTexts.length).toFixed(2));

    // If competitor uses it frequently across docs, but target barely uses it
    if (avgCompFreq >= 0.5 && targetFreq <= 1) {
      const importance: 'high' | 'medium' | 'low' = 
        data.count === competitorTexts.length ? 'high' : 
        data.count >= 2 ? 'medium' : 'low';

      gaps.push({
        term,
        competitorFrequency: data.count,
        targetFrequency: targetFreq,
        importance
      });
    }
  }

  return gaps.sort((a, b) => (b.importance === 'high' ? 3 : 1) - (a.importance === 'high' ? 3 : 1)).slice(0, 25);
}

/**
 * Calculates Flesch Reading Ease, Flesch-Kincaid Grade Level, and Gunning Fog index.
 */
export function calculateReadability(text: string) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = (tokenizer.tokenize(clean) || []).filter(w => /[a-zA-Z]/.test(w));
  
  const numSentences = Math.max(sentences.length, 1);
  const numWords = Math.max(words.length, 1);

  let numSyllables = 0;
  let complexWords = 0;

  for (const word of words) {
    const syllables = countSyllables(word);
    numSyllables += syllables;
    if (syllables >= 3) complexWords++;
  }

  // Flesch Reading Ease: 206.835 - 1.015 * (total words / total sentences) - 84.6 * (total syllables / total words)
  const wordsPerSentence = numWords / numSentences;
  const syllablesPerWord = numSyllables / numWords;
  const fleschReadingEase = Math.round(206.835 - (1.015 * wordsPerSentence) - (84.6 * syllablesPerWord));

  // Flesch-Kincaid Grade Level: 0.39 * (total words / total sentences) + 11.8 * (total syllables / total words) - 15.59
  const gradeLevel = Math.max(0, Number((0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59).toFixed(1)));

  // Gunning Fog Index: 0.4 * ((words / sentences) + 100 * (complex words / words))
  const gunningFog = Math.max(0, Number((0.4 * (wordsPerSentence + (100 * (complexWords / numWords)))).toFixed(1)));

  // Passive voice detection approximation
  const passiveVoiceMatches = (clean.match(/\b(is|are|was|were|be|been|being)\s+([a-z]+ed|[a-z]+en)\b/gi) || []).length;
  const passiveVoicePercent = Number(((passiveVoiceMatches / numSentences) * 100).toFixed(1));

  // Long sentences (> 25 words)
  const longSentences = sentences
    .map(s => s.trim())
    .filter(s => (tokenizer.tokenize(s) || []).length > 25);

  return {
    fleschReadingEase: Math.max(0, Math.min(100, fleschReadingEase)),
    gradeLevel,
    gunningFog,
    readingLevelSummary: 
      fleschReadingEase >= 80 ? 'Easy (5th-6th Grade) - Highly Conversational' :
      fleschReadingEase >= 60 ? 'Standard (8th-9th Grade) - Ideal for Web SEO' :
      fleschReadingEase >= 40 ? 'Difficult (College Level) - Technical / Academic' :
      'Very Confusing / Academic - Consider Simplifying',
    totalWords: numWords,
    totalSentences: numSentences,
    wordsPerSentence: Number(wordsPerSentence.toFixed(1)),
    passiveVoicePercent: Math.min(100, passiveVoicePercent),
    longSentencesCount: longSentences.length,
    sampleLongSentences: longSentences.slice(0, 3)
  };
}

function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]|ed|es|e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

/**
 * Extracts Subject-Predicate-Object (SPO) semantic triples from text for Knowledge Graph analysis.
 */
export function extractSpoTriples(text: string): SpoTriple[] {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15);
  const triples: SpoTriple[] = [];

  const commonVerbs = /\b(is|are|was|were|has|have|provides|supports|includes|contains|integrates|improves|reduces|creates|allows|enables|powers|offers|connects|automates)\b/i;

  for (const sentence of sentences) {
    const match = sentence.match(commonVerbs);
    if (match && match.index) {
      const verbIndex = match.index;
      const predicate = match[0];
      const subject = sentence.substring(0, verbIndex).trim();
      const object = sentence.substring(verbIndex + predicate.length).trim();

      if (subject.length > 2 && subject.length < 50 && object.length > 2 && object.length < 80) {
        triples.push({
          subject,
          predicate,
          object,
          sourceSentence: sentence
        });
      }
    }
    if (triples.length >= 10) break;
  }

  return triples;
}

/**
 * Extracts key named entities with approximate salience scoring.
 */
export function extractEntitiesWithSalience(text: string): EntitySalienceItem[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  
  // Heuristic for capitalized entity phrases (excluding start of sentences)
  const entityCounts = new Map<string, number>();

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/);
    for (let i = 1; i < words.length; i++) {
      const w = words[i].replace(/[^a-zA-Z0-9]/g, '');
      if (/^[A-Z][a-z0-9]{2,}$/.test(w) && !stopwords.has(w.toLowerCase())) {
        entityCounts.set(w, (entityCounts.get(w) || 0) + 1);
      }
    }
  }

  const maxCount = Math.max(...Array.from(entityCounts.values()), 1);

  return Array.from(entityCounts.entries())
    .filter(([_, count]) => count >= 2)
    .map(([name, count]) => ({
      name,
      salienceScore: Number((count / maxCount).toFixed(2)),
      type: 'Concept / Entity',
      contextSentence: sentences.find(s => s.includes(name))?.substring(0, 100)
    }))
    .sort((a, b) => b.salienceScore - a.salienceScore)
    .slice(0, 15);
}
