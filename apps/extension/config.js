/**
 * KlarText Chrome Extension - Configuration
 * 
 * Centralized configuration for the extension.
 * This makes it easy to switch between development and production environments.
 * 
 * Future extensibility:
 * - Phase B: Add UI to let users configure these settings
 * - Phase C: Support custom API endpoints via options page
 */

const CONFIG = {
  /**
   * API endpoint for KlarText simplification service
   * Development: http://localhost:8000
   * Production: Update this when deploying to production
   */
  API_ENDPOINT: 'http://localhost:8000',

  /**
   * API routes
   */
  API_ROUTES: {
    SIMPLIFY: '/v1/simplify',
    SIMPLIFY_BATCH: '/v1/simplify/batch',
  },

  /**
   * Default language for simplification
   * Options: 'de' (German), 'en' (English)
   * User can select in sidepanel UI
   */
  DEFAULT_LANG: 'en',

  /**
   * Supported languages with display labels
   */
  SUPPORTED_LANGUAGES: {
    'de': 'Deutsch (German)',
    'en': 'English'
  },

  /**
   * Current template version for logging and A/B testing
   */
  CURRENT_TEMPLATE_VERSION: 'v2',

  /**
   * Default simplification level
   * Options: 'very_easy', 'easy', 'medium'
   * Future: Will be selectable in sidepanel UI
   */
  DEFAULT_LEVEL: 'easy',

  /**
   * Maximum number of text chunks to send in a single batch request
   * API limit: 10 texts per batch
   */
  MAX_BATCH_SIZE: 10,

  /**
   * Maximum length of a single text chunk (characters)
   * API limit: 5000 characters per text in batch mode
   */
  MAX_TEXT_LENGTH: 5000,

  /**
   * Minimum text length to consider for simplification (characters)
   * Shorter texts are likely UI elements, not content
   */
  MIN_TEXT_LENGTH: 20,

  /**
   * Minimum selection length for manual text selection (characters)
   * Lower threshold for user-selected text vs automatic page chunking
   */
  MIN_SELECTION_LENGTH: 20,

  /**
   * Request timeout in milliseconds
   * Large pages may take longer to process
   */
  REQUEST_TIMEOUT: 60000, // 60 seconds

  /**
   * Debug mode - logs additional information to console
   * Set to false in production
   */
  DEBUG: true,

  /**
   * Webapp URL for feature links in sidepanel
   * Development: http://localhost:5174
   * Production: Update this when deploying
   */
  WEBAPP_URL: 'https://klartext-rho.vercel.app/', // TODO: Update with actual URL

  /**
   * Webapp feature links configuration
   * Used in sidepanel to link to full webapp features
   */
  WEBAPP_FEATURES: [
    {
      id: 'input-text',
      url: '/',
    },
    {
      id: 'upload-pdf',
      url: '/',
    },
    {
      id: 'text-to-speech',
      url: '/',
    },
  ],
};

// Note: This config file is injected into the content script context by the service worker.
// When injected via chrome.scripting.executeScript(), CONFIG becomes a global variable
// available to subsequently injected scripts (like simplify.js).
// 
// The service worker itself does not need access to CONFIG - only content scripts do.
