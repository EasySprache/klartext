/**
 * KlarText Run Logger
 * ==================
 * Client-side logging for simplification runs.
 * Sends analytics to /v1/log-run endpoint for feedback loop.
 */

import { apiJsonRequest } from './api';

/**
 * Generate a unique run ID (UUID v4)
 */
export function generateRunId(): string {
  return crypto.randomUUID();
}

/**
 * Log a simplification run to the API
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
    
    // Build log entry
    const logEntry = {
      run_id: runId,
      input_text: params.inputText,
      output_text: params.outputText,
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
 *   startTime: Date.now() - 1234
 * });
 * ```
 */
export async function logSimplification(params: {
  inputText: string;
  outputText: string;
  targetLang: string;
  level: string;
  startTime: number; // Timestamp when simplification started
  warnings?: string[];
  userFeedback?: 'thumbs_up' | 'thumbs_down' | 'flag';
}): Promise<void> {
  // Calculate latency
  const latencyMs = Date.now() - params.startTime;
  
  // Compute basic scores
  const scores = computeBasicScores(params.outputText);
  
  // Default model (update if using different models)
  const model = 'llama-3.1-8b-instant';
  
  // Log to API
  await logSimplificationRun({
    inputText: params.inputText,
    outputText: params.outputText,
    targetLang: params.targetLang,
    level: params.level,
    model: model,
    latencyMs: latencyMs,
    scores: scores,
    warnings: params.warnings,
    userFeedback: params.userFeedback,
  });
}
