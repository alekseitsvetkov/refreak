// FACEIT API Configuration
export const FACEIT_CONFIG = {
  // Open API endpoints
  OPEN_API_BASE_URL: 'https://open.faceit.com/data/v4',
  
  // Your API Key - replace with your actual key
  API_KEY: '6035dd70-36a0-42e7-84c2-620e374db38a', // TODO: Replace with actual API key
  
  // Rate limiting
  RATE_LIMIT_DELAY: 100, // ms between requests
  
  // Cache settings
  CACHE_TIME: 10 * 60 * 1000, // 10 minutes
}

// Validate configuration
export function validateConfig() {
  if (!FACEIT_CONFIG.API_KEY) {
    console.warn('FACEIT API Key not configured. Please set your API key in lib/config.ts')
    return false
  }
  return true
} 