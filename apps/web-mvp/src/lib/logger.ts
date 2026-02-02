/**
 * KlarText Run Logger
 * ==================
 * Client-side logging for simplification runs.
 * Sends analytics to /v1/log-run endpoint for feedback loop.
 * 
 * ⚠️  PRIVACY WARNING:
 * This implementation logs FULL TEXT (input and output) to the backend.
 * This is acceptable for:
 * - Study/research projects
 * - Internal testing environments
 * - Development/staging servers
 * 
 * For production with real users:
 * - Set VITE_LOG_FULL_TEXT=false in production environment
 * - Use text hashing instead (implement hashText function)
 * - Review privacy policy and GDPR compliance
 * - Consider user consent mechanisms
 */

import { apiJsonRequest } from './api';

// Configuration: Control whether to log full text (for study projects) or hashes (for production)
const LOG_FULL_TEXT = import.meta.env.VITE_LOG_FULL_TEXT !== 'false'; // Default: true for study projects

// Log privacy warning in console
if (LOG_FULL_TEXT && import.meta.env.PROD) {
  console.warn(
    '⚠️  PRIVACY: Full text logging is enabled in production. ' +
    'Set VITE_LOG_FULL_TEXT=false to hash text instead. ' +
    'See apps/web-mvp/src/lib/logger.ts for details.'
  );
}

/**
 * Generate a unique run ID (UUID v4)
 */
export function generateRunId(): string {
  return crypto.randomUUID();
}

/**
 * Hash text using SHA-256 (for privacy-preserving logging)
 * Only used when LOG_FULL_TEXT is false.
 * 
 * TODO: Enable this in logSimplificationRun() when backend supports hashed text.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Log a simplification run to the API
 * 
 * ⚠️  NOTE: Currently always logs full text regardless of LOG_FULL_TEXT setting.
 * Backend API must be updated to support hashed text before privacy mode works.
 * See services/api/app/core/run_logger.py for backend changes needed.
 * 
 * @param params Logging parameters
 * @returns Promise that resolves when log is sent (fires and forgets on error)
 */
export async function logSimplificationRun(params: {
  inputText: string;
  outputText: string;
  targetLang: string;
  level: string;
  model: string;
  latencyMs: number;
  chunkCount?: number;
  warnings?: string[];
  scores?: Record<string, number>;
  userFeedback?: 'thumbs_up' | 'thumbs_down' | 'flag';
}): Promise<void> {
  try {
    // Generate run ID
    const runId = generateRunId();
    
    // TODO: When LOG_FULL_TEXT is false, hash the text instead:
    // const input_text = LOG_FULL_TEXT ? params.inputText : await hashText(params.inputText);
    // const output_text = LOG_FULL_TEXT ? params.outputText : await hashText(params.outputText);
    // Backend must also be updated to handle both modes.
    
    // Build log entry
    const logEntry = {
      run_id: runId,
      input_text: params.inputText,  // Currently always full text
      output_text: params.outputText, // Currently always full text
      target_lang: params.targetLang,
      level: params.level,
      model_used: params.model,
      latency_ms: params.latencyMs,
      chunk_count: params.chunkCount || 1,
      scores: params.scores || {},
      warnings: params.warnings || [],
      user_feedback: params.userFeedback || null,
    };
    
    // Send to API (fire and forget - don't block UI)
    const response = await apiJsonRequest('/v1/log-run', logEntry);
    
    if (!response.ok) {
      console.warn('Failed to log run:', response.statusText);
    }
  } catch (error) {
    // Silent fail - don't disrupt user experience
    console.error('Error logging run:', error);
  }
}

/**
 * Compute basic readability scores for the output
 * (Optional - provides quality metrics for logging)
 */
export function computeBasicScores(text: string): Record<string, number> {
  try {
    // Split into sentences
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    if (sentences.length === 0) {
      return {
        sentence_count: 0,
        avg_sentence_len: 0,
        word_count: 0,
      };
    }
    
    // Split into words
    const words = text
      .split(/\s+/)
      .filter(w => w.length > 0);
    
    // Calculate metrics
    const avgSentenceLen = words.length / sentences.length;
    
    return {
      sentence_count: sentences.length,
      avg_sentence_len: Math.round(avgSentenceLen * 10) / 10,
      word_count: words.length,
    };
  } catch (error) {
    console.error('Error computing scores:', error);
    return {};
  }
}

/**
 * High-level function to log a simplification with automatic metrics
 * 
 * Usage example:
 * ```typescript
 * await logSimplification({
 *   inputText: originalText,
 *   outputText: simplifiedText,
 *   targetLang: 'de',
 *   level: 'easy',
 *   modelUsed: 'llama-3.1-8b-instant', // From API response
 *   startTime: Date.now() - 1234
 * });
 * ```
 */
export async function logSimplification(params: {
  inputText: string;
  outputText: string;
  targetLang: string;
  level: string;
  modelUsed: string; // Model actually used by backend (from API response)
  startTime: number; // Timestamp when simplification started
  warnings?: string[];
  userFeedback?: 'thumbs_up' | 'thumbs_down' | 'flag';
}): Promise<void> {
  // Calculate latency
  const latencyMs = Date.now() - params.startTime;
  
  // Compute basic scores
  const scores = computeBasicScores(params.outputText);
  
  // Log to API
  await logSimplificationRun({
    inputText: params.inputText,
    outputText: params.outputText,
    targetLang: params.targetLang,
    level: params.level,
    model: params.modelUsed, // Use actual model from API response
    latencyMs: latencyMs,
    scores: scores,
    warnings: params.warnings,
    userFeedback: params.userFeedback,
  });
}
