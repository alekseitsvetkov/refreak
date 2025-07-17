import { runFeatureIf, systemSettings } from '../hooks/use-settings'
import { addSmurfDetection } from '../features/add-smurf-detection'
import { addExtensionToggle } from '../features/add-extension-toggle'

// Global state to prevent infinite loops
let isSmurfDetectionRunning = false
let isExtensionToggleAdded = false
let lastProcessedUrl = ''

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
    console.log('Refreak extension is disabled')
    return
  }

  console.log('Refreak extension is enabled, initializing features...')

  // Initialize features
  observeBody()
  observeUrlChanges()
  observeHistoryChanges()
}

function observeBody() {
  let isRunning = false
  const observer = new MutationObserver(() => {
    if (isRunning) return
    isRunning = true
    
    // Run features based on current page and settings
    runFeatureIf('enabled', () => {
      console.log('Extension is enabled, running features...')
    })

    // Only run smurf detection if not already running and URL changed
    // Also check if we're on a match page (support multiple URL patterns)
    const currentUrl = window.location.href
    const isMatchPage = currentUrl.includes('/match/') || 
                       currentUrl.includes('/room/') ||
                       currentUrl.includes('/cs2/room/')
    
    if (!isSmurfDetectionRunning && 
        currentUrl !== lastProcessedUrl && 
        isMatchPage) {
      console.log('Match page detected, starting smurf detection...')
      console.log('Current URL:', currentUrl)
      console.log('Last processed URL:', lastProcessedUrl)
      runFeatureIf('smurfDetection', () => {
        isSmurfDetectionRunning = true
        lastProcessedUrl = window.location.href
        addSmurfDetection().finally(() => {
          isSmurfDetectionRunning = false
        })
      })
    }

    // Add extension toggle UI if not already present
    if (!isExtensionToggleAdded) {
      runFeatureIf('enabled', () => {
        addExtensionToggle()
        isExtensionToggleAdded = true
      })
    }
    
    // Reset flag after a short delay
    setTimeout(() => {
      isRunning = false
    }, 2000)
  })

  observer.observe(document.body, { childList: true, subtree: true, attributes: false })
}

function observeUrlChanges() {
  let currentUrl = window.location.href
  
  // Check for URL changes periodically
  setInterval(() => {
    const newUrl = window.location.href
    if (newUrl !== currentUrl && !isSmurfDetectionRunning) {
      console.log('URL changed, re-running features...')
      console.log('Old URL:', currentUrl)
      console.log('New URL:', newUrl)
      currentUrl = newUrl
      
      // Wait a bit for the page to load, then run features
      setTimeout(() => {
        if (!isSmurfDetectionRunning) {
          runFeatureIf('smurfDetection', () => {
            isSmurfDetectionRunning = true
            lastProcessedUrl = window.location.href
            addSmurfDetection().finally(() => {
              isSmurfDetectionRunning = false
            })
          })
        }
      }, 2000)
    }
  }, 2000) // Increased interval to reduce frequency
}

function observeHistoryChanges() {
  // Listen for popstate events (back/forward navigation)
  window.addEventListener('popstate', () => {
    if (!isSmurfDetectionRunning) {
      console.log('Navigation detected (popstate), re-running features...')
      setTimeout(() => {
        if (!isSmurfDetectionRunning) {
          runFeatureIf('smurfDetection', () => {
            isSmurfDetectionRunning = true
            lastProcessedUrl = window.location.href
            addSmurfDetection().finally(() => {
              isSmurfDetectionRunning = false
            })
          })
        }
      }, 2000)
    }
  })

  // Override pushState and replaceState to detect programmatic navigation
  const originalPushState = history.pushState
  const originalReplaceState = history.replaceState

  history.pushState = function(...args) {
    originalPushState.apply(history, args)
    if (!isSmurfDetectionRunning) {
      console.log('Navigation detected (pushState), re-running features...')
      setTimeout(() => {
        if (!isSmurfDetectionRunning) {
          runFeatureIf('smurfDetection', () => {
            isSmurfDetectionRunning = true
            lastProcessedUrl = window.location.href
            addSmurfDetection().finally(() => {
              isSmurfDetectionRunning = false
            })
          })
        }
      }, 2000)
    }
  }

  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args)
    if (!isSmurfDetectionRunning) {
      console.log('Navigation detected (replaceState), re-running features...')
      setTimeout(() => {
        if (!isSmurfDetectionRunning) {
          runFeatureIf('smurfDetection', () => {
            isSmurfDetectionRunning = true
            lastProcessedUrl = window.location.href
            addSmurfDetection().finally(() => {
              isSmurfDetectionRunning = false
            })
          })
        }
      }, 2000)
    }
  }
}

// Export for WXT content script
export default defineContentScript({
  matches: ['*://*.faceit.com/*'],
  main() {
    initContent()
  },
})
