import { runFeatureIf, systemSettings } from '../hooks/use-settings'
import { addSmurfDetection } from '../features/add-smurf-detection'
import { hideCampaigns } from '../features/hide-campaigns'
import { waitForPlayerCards } from '../lib/utils'

// Function to check if current page is a match room (not scoreboard)
function isMatchRoomPage(): boolean {
  const currentUrl = window.location.href
  
  // Check for active match room
  const matchRoomPattern = /^https:\/\/www\.faceit\.com\/[a-z]{2}\/cs2\/room\/[^\/]+$/
  const isActiveRoom = matchRoomPattern.test(currentUrl)
  
  // Check for match results page (new support)
  const matchResultsPattern = /^https:\/\/www\.faceit\.com\/[a-z]{2}\/cs2\/results\/[^\/]+$/
  const isResultsPage = matchResultsPattern.test(currentUrl)
  
  // Check for any page with player cards (fallback)
  const hasPlayerCards = document.querySelector('[type="button"][aria-haspopup="dialog"], [class*="ListContentPlayer__Holder"]')
  const isPageWithPlayers = !!hasPlayerCards
  
  return isActiveRoom || isResultsPage || isPageWithPlayers
}

// Function to check if the page content has actually loaded
function isPageContentLoaded(): boolean {
  // Check if we have the main match room content
  const hasMatchContent = document.querySelector('[class*="MatchRoom"], [class*="match-room"], [class*="Room"]')
  const hasPlayerContent = document.querySelector('[class*="Player"], [class*="player"], [class*="ListContentPlayer"]')
  
  // Check if we have a modal window with match content
  const hasModal = document.querySelector('#canvas-wrapper, [class*="ContextualView"], [class*="Modal"], [class*="modal"]')
  const hasModalMatchContent = hasModal && hasModal.querySelector('[class*="MatchRoom"], [class*="ContextualView__Content"]')
  
  // Check if we have player cards in any context
  const hasPlayerCards = document.querySelector('[type="button"][aria-haspopup="dialog"], [class*="ListContentPlayer__Holder"]')
  
  const isLoaded = !!(hasMatchContent || hasPlayerContent || hasModalMatchContent || hasPlayerCards)
  
  return isLoaded
}

// Global state to prevent infinite loops
let isSmurfDetectionRunning = false
let isExtensionToggleAdded = false
let lastProcessedUrl = ''
let lastProcessedHash = ''
let lastSmurfDetectionTime = 0
const SMURF_DETECTION_COOLDOWN = 5000 // 5 seconds cooldown

// Function to run smurf detection with smart waiting
async function runSmurfDetectionWithSmartWaiting() {
  try {
    
    // Wait for player cards to load with increased timeout
    const playerCards = await waitForPlayerCards(12000) // 12 second timeout
    
    
    await addSmurfDetection()
  } catch (error) {
    console.error('Failed to run smurf detection with smart waiting:', error)
    
    // Попробуем запустить smurf detection даже без карточек игроков
    try {
      await addSmurfDetection()
    } catch (fallbackError) {
      console.error('Fallback smurf detection also failed:', fallbackError)
    }
  } finally {
    isSmurfDetectionRunning = false
  }
}

// Function to check if we should run smurf detection
function shouldRunSmurfDetection(): boolean {
  const currentUrl = window.location.href
  const currentHash = window.location.hash
  const now = Date.now()
  
  // Check if URL or hash changed and we're on a match room page
  const urlChanged = currentUrl !== lastProcessedUrl || currentHash !== lastProcessedHash
  const isMatchRoom = isMatchRoomPage()
  const contentLoaded = isPageContentLoaded()
  const cooldownExpired = now - lastSmurfDetectionTime > SMURF_DETECTION_COOLDOWN
  

  
  return urlChanged && isMatchRoom && contentLoaded && !isSmurfDetectionRunning && cooldownExpired
}

// Function to trigger smurf detection
function triggerSmurfDetection() {
  if (shouldRunSmurfDetection()) {
    isSmurfDetectionRunning = true
    lastProcessedUrl = window.location.href
    lastProcessedHash = window.location.hash
    lastSmurfDetectionTime = Date.now()
    
    runFeatureIf('smurfDetection', () => {
      runSmurfDetectionWithSmartWaiting()
    })
  }
}

// Function to check for modal windows and trigger detection
function checkForModalAndTrigger() {
  // Check if a modal window has appeared
  const modal = document.querySelector('#canvas-wrapper, [class*="ContextualView"], [class*="Modal"]')
  if (modal && !isSmurfDetectionRunning) {
    
    // Wait a bit for modal content to load
    setTimeout(() => {
      if (isPageContentLoaded() && isMatchRoomPage()) {
        isSmurfDetectionRunning = true
        lastProcessedUrl = window.location.href
        lastProcessedHash = window.location.hash
        lastSmurfDetectionTime = Date.now()
        
        runFeatureIf('smurfDetection', () => {
          runSmurfDetectionWithSmartWaiting()
        })
      }
    }, 1000)
  }
}

async function initContent() {
  let extensionEnabled = false
  try {
    const settings = await systemSettings.getValue()
    extensionEnabled = settings.enabled
  } catch (e) {
    if (e && typeof e === 'object' && e !== null && 'message' in e && typeof e.message === 'string' && e.message.includes('Extension context invalidated')) {
      return
    }
    console.error('Failed to load extension settings:', e)
    return
  }

  if (!extensionEnabled) {
    return
  }

  // Initialize features
  observeBody()
  observeUrlChanges()
  observeHistoryChanges()
  
  // Initial check for current page
  setTimeout(() => {
    triggerSmurfDetection()
  }, 1000)

  // Initialize campaign hiding feature
  runFeatureIf('hideCampaigns', () => {
    hideCampaigns()
  })
}

function observeBody() {
  let isRunning = false
  const observer = new MutationObserver(() => {
    if (isRunning) return
    isRunning = true
    
    // Run features based on current page and settings
    runFeatureIf('enabled', () => {
      // Extension is enabled
    })

    // Check if we should run smurf detection
    triggerSmurfDetection()
    
    // Check for modal windows
    checkForModalAndTrigger()

    // Run campaign hiding feature
    runFeatureIf('hideCampaigns', () => {
      hideCampaigns()
    })

    // Add extension toggle UI if not already present
    if (!isExtensionToggleAdded) {
      runFeatureIf('enabled', () => {
        isExtensionToggleAdded = true
      })
    }
    
    // Reset flag using requestIdleCallback for better performance
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        isRunning = false
      })
    } else {
      // Fallback for older browsers
      setTimeout(() => {
        isRunning = false
      }, 100) // Minimal delay as fallback
    }
  })

  observer.observe(document.body, { childList: true, subtree: true, attributes: false })
}

function observeUrlChanges() {
  let currentUrl = window.location.href
  let currentHash = window.location.hash
  
  // Check for URL changes periodically with better performance
  const checkUrl = () => {
    const newUrl = window.location.href
    const newHash = window.location.hash
    
    if ((newUrl !== currentUrl || newHash !== currentHash) && !isSmurfDetectionRunning) {
      currentUrl = newUrl
      currentHash = newHash
      
      // Add a small delay to allow page content to start loading
      setTimeout(() => {
        triggerSmurfDetection()
      }, 500)
    }
    
    // Schedule next check using requestIdleCallback if available
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        setTimeout(checkUrl, 1000) // Check every 1 second when idle
      })
    } else {
      setTimeout(checkUrl, 2000) // Fallback: check every 2 seconds
    }
  }
  
  // Start the URL checking loop
  checkUrl()
}

function observeHistoryChanges() {
  // Listen for popstate events (back/forward navigation)
  window.addEventListener('popstate', () => {
    setTimeout(() => {
      triggerSmurfDetection()
    }, 500)
  })

  // Override pushState and replaceState to detect programmatic navigation
  const originalPushState = history.pushState
  const originalReplaceState = history.replaceState

  history.pushState = function(...args) {
    originalPushState.apply(history, args)
    setTimeout(() => {
      triggerSmurfDetection()
    }, 500)
  }

  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args)
    setTimeout(() => {
      triggerSmurfDetection()
    }, 500)
  }
}

// Export for WXT content script
export default defineContentScript({
  matches: ['*://*.faceit.com/*'],
  main() {
    initContent()
  },
})
