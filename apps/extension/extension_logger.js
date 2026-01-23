/**
 * KlarText Extension Output Logger
 * =================================
 * Logs each simplification output with metrics and guardrails.
 * Ported from demo/demo_logger.py to work in browser extension context.
 * 
 * Usage in content script:
 *   import { log_simplification } from './extension_logger.js';
 *   
 *   log_simplification(
 *     source_text,
 *     output_text,
 *     model,
 *     template,
 *     language
 *   );
 */

// -----------------------------------------------------------------------------
// Text Processing Utilities
// -----------------------------------------------------------------------------

/**
 * Split text into sentences, handling common abbreviations
 */
function split_sentences(text) {
  // Handle common English abbreviations
  let text_clean = text.replace(/\b(Mr|Mrs|Ms|Dr|Prof|Jr|Sr|vs|etc|e\.g|i\.e)\.\s/g, '$1_DOT ');
  // Handle German abbreviations
  text_clean = text_clean.replace(/\b(z\.B|d\.h|usw|ggfs)\.\s/g, '$1_DOT ');
  
  // Split on sentence-ending punctuation
  const sentences = text_clean.trim().split(/[.!?]+\s+/);
  return sentences.filter(s => s.trim().length > 0).map(s => s.trim());
}

/**
 * Extract words from text, handling German characters
 */
function get_words(text) {
  return text.match(/[A-Za-zÄÖÜäöüßéèêëàâáîïíôöóûüú]+/g) || [];
}

/**
 * Count syllables (simple heuristic for English/German)
 */
function count_syllables(word) {
  word = word.toLowerCase();
  const vowels = "aeiouyäöü";
  let count = 0;
  let prev_was_vowel = false;
  
  for (const char of word) {
    const is_vowel = vowels.includes(char);
    if (is_vowel && !prev_was_vowel) {
      count++;
    }
    prev_was_vowel = is_vowel;
  }
  
  return Math.max(1, count);
}

// -----------------------------------------------------------------------------
// Metrics Computation
// -----------------------------------------------------------------------------

/**
 * Compute Automated Readability Index (ARI)
 * ARI = 4.71 * (characters/words) + 0.5 * (words/sentences) - 21.43
 */
function compute_ari_score(text) {
  const sentences = split_sentences(text);
  const words = get_words(text);
  
  if (sentences.length === 0 || words.length === 0) {
    return 0.0;
  }
  
  const char_count = words.reduce((sum, w) => sum + w.length, 0);
  const word_count = words.length;
  const sentence_count = sentences.length;
  
  const ari = 4.71 * (char_count / word_count) + 0.5 * (word_count / sentence_count) - 21.43;
  return Math.round(Math.max(0, ari) * 100) / 100;
}

/**
 * Compute TF-IDF cosine similarity (simplified version without sklearn)
 * Returns a basic word overlap score instead of true TF-IDF
 */
function compute_meaning_cosine(source, output) {
  try {
    // Get word sets
    const source_words = new Set(get_words(source.toLowerCase()));
    const output_words = new Set(get_words(output.toLowerCase()));
    
    if (source_words.size === 0 || output_words.size === 0) {
      return 0.0;
    }
    
    // Compute Jaccard similarity (overlap)
    const intersection = new Set([...source_words].filter(w => output_words.has(w)));
    const union = new Set([...source_words, ...output_words]);
    
    const similarity = intersection.size / union.size;
    return Math.round(similarity * 1000) / 1000;
  } catch (error) {
    console.error('[Logger] Error computing similarity:', error);
    return 0.0;
  }
}

/**
 * Compute all metrics for a simplification output
 */
function compute_metrics(source_text, output_text) {
  const sentences = split_sentences(output_text);
  const words = get_words(output_text);
  
  if (sentences.length === 0 || words.length === 0) {
    return {
      avg_sentence_len_words: 0.0,
      pct_sentences_gt20: 0.0,
      ari_score: 0.0,
      meaning_cosine: 0.0
    };
  }
  
  // Sentence length analysis
  const sent_lengths = sentences.map(s => get_words(s).length);
  const avg_sent_len = sent_lengths.reduce((a, b) => a + b, 0) / sent_lengths.length;
  const long_sents = sent_lengths.filter(len => len > 20).length;
  const pct_long = (long_sents / sent_lengths.length) * 100;
  
  return {
    avg_sentence_len_words: Math.round(avg_sent_len * 10) / 10,
    pct_sentences_gt20: Math.round(pct_long * 10) / 10,
    ari_score: compute_ari_score(output_text),
    meaning_cosine: compute_meaning_cosine(source_text, output_text)
  };
}

// -----------------------------------------------------------------------------
// Guardrails
// -----------------------------------------------------------------------------

const GUARDRAILS = {
  short_sentences: {
    name: "Short Sentences",
    check: (metrics) => metrics.avg_sentence_len_words <= 15
  },
  no_long_sentences: {
    name: "No Long Sentences",
    check: (metrics) => metrics.pct_sentences_gt20 <= 10
  },
  readable: {
    name: "Readable (ARI)",
    check: (metrics) => metrics.ari_score <= 8
  },
  preserves_meaning: {
    name: "Preserves Meaning",
    check: (metrics) => metrics.meaning_cosine >= 0.70
  }
};

/**
 * Evaluate guardrails against computed metrics
 * Returns [passed_count, total_count, failed_names]
 */
function evaluate_guardrails(metrics) {
  let passed = 0;
  const failed = [];
  
  for (const [guardrail_id, guardrail] of Object.entries(GUARDRAILS)) {
    try {
      if (guardrail.check(metrics)) {
        passed++;
      } else {
        failed.push(guardrail.name);
      }
    } catch (error) {
      failed.push(`${guardrail.name} (error)`);
    }
  }
  
  return [passed, Object.keys(GUARDRAILS).length, failed];
}

// -----------------------------------------------------------------------------
// Logging Functions
// -----------------------------------------------------------------------------

/**
 * Log a simplification output
 * Calls API endpoint directly with privacy-first SHA256 hash
 */
async function log_simplification(
  source_text, 
  output_text, 
  model, 
  template, 
  source_language = "de",
  target_language = "de",
  latency_ms = 0
) {
  try {
    // Compute metrics
    const metrics = compute_metrics(source_text, output_text);
    const [passed, total, failed] = evaluate_guardrails(metrics);
    
    // Create SHA256 hash (privacy - no raw text stored)
    const encoder = new TextEncoder();
    const data = encoder.encode(source_text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const input_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Generate UUID
    const run_id = crypto.randomUUID();
    
    // Call API endpoint
    try {
      const response = await fetch(`${CONFIG.API_ENDPOINT}/v1/log-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_id: run_id,
          input_hash: input_hash,
          input_length: source_text.length,
          source_lang: source_language,
          target_lang: target_language,
          template_version: `${CONFIG.CURRENT_TEMPLATE_VERSION}/system_prompt_${target_language}.txt`,
          level: CONFIG.DEFAULT_LEVEL || 'easy',
          model_used: model,
          output_length: output_text.length,
          latency_ms: latency_ms,
          chunk_count: 1,
          scores: {
            avg_sentence_len: metrics.avg_sentence_len_words,
            pct_long_sentences: metrics.pct_sentences_gt20,
            ari_score: metrics.ari_score,
            meaning_cosine: metrics.meaning_cosine,
            guardrails_passed: passed,
            guardrails_total: total
          },
          warnings: failed.length > 0 ? failed : [],
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        console.warn('[Logger] API returned error:', response.status);
      }
    } catch (error) {
      console.error('[Logger] Failed to log to API:', error);
      // Don't block extension if logging fails
    }
  } catch (error) {
    console.error('[Logger] Failed to log simplification:', error);
    return null;
  }
}

// Make functions globally available for content script
if (typeof window !== 'undefined') {
  window.KlarTextLogger = {
    log_simplification,
    compute_metrics,
    evaluate_guardrails
  };
}
