// Function to check if current page is a match room or any FACEIT page
function isFaceitPage(): boolean {
  const currentUrl = window.location.href
  return currentUrl.includes('faceit.com')
}

// Function to hide campaign widgets
function hideCampaignWidgets() {
  // More specific selectors targeting only campaign widgets
  const campaignSelectors = [
    // Exact selector for the provided HTML structure
    'div[class*="Card"][class*="CampaignWidget__StyledSingleCampaignWidget"]',
    // Alternative campaign widget selectors
    'div[class*="CampaignWidget__Styled"]',
    'div[class*="SingleCampaignWidget"]',
    // More specific campaign container
    'div[class*="Card"][class*="CampaignWidget"]'
  ]

  let hiddenCount = 0
  const processedElements = new Set<Element>()

  campaignSelectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector)
      elements.forEach(element => {
        // Skip if already processed
        if (processedElements.has(element)) {
          return
        }

        // Additional validation to ensure this is actually a campaign widget
        const hasRewardTag = element.querySelector('[class*="RewardTag"]')
        const hasMissionProgress = element.querySelector('[class*="MissionProgressCounterText"]')
        const hasCampaignContent = element.querySelector('[class*="BaseCampaignWidget__Content"]')
        const hasOverline = element.querySelector('[class*="BaseCampaignWidget__Overline"]')
        
        // Check for specific campaign text patterns
        const textContent = element.textContent || ''
        const hasCampaignText = textContent.includes('In progress') ||
                               textContent.includes('Ends in') ||
                               textContent.includes('Go to') ||
                               textContent.includes('Complete') ||
                               textContent.includes('Mission') ||
                               textContent.includes('Reward') ||
                               textContent.includes('депозит') ||
                               textContent.includes('Winline')

        // Only hide if it has multiple campaign indicators
        const isCampaignWidget = (hasRewardTag || hasMissionProgress || hasCampaignContent || hasOverline) && 
                                hasCampaignText

        if (isCampaignWidget && element.parentElement && !processedElements.has(element)) {
          // Hide the element by setting display to none
          ;(element as HTMLElement).style.display = 'none'
          processedElements.add(element)
          hiddenCount++
        }
      })
    } catch (error) {
      // Ignore errors for invalid selectors
    }
  })
}

// Function to observe DOM changes and hide new campaign widgets
function observeAndHideCampaigns() {
  let checkTimeout: ReturnType<typeof setTimeout> | null = null
  
  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if any added nodes might be campaign widgets
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element
            const classList = element.classList?.toString() || ''
            
            // More specific checks for campaign widgets
            const isCampaignWidget = classList.includes('CampaignWidget__StyledSingleCampaignWidget') ||
                                    classList.includes('CampaignWidget__Styled') ||
                                    classList.includes('SingleCampaignWidget') ||
                                    (classList.includes('Card') && classList.includes('CampaignWidget'))
            
            const hasCampaignElements = element.querySelector && (
              element.querySelector('[class*="RewardTag"]') ||
              element.querySelector('[class*="MissionProgressCounterText"]') ||
              element.querySelector('[class*="BaseCampaignWidget__Content"]') ||
              element.querySelector('[class*="BaseCampaignWidget__Overline"]')
            )
            
            if (isCampaignWidget || hasCampaignElements) {
              shouldCheck = true
            }
          }
        })
      }
    })
    
    if (shouldCheck) {
      // Debounce the check to avoid excessive calls
      if (checkTimeout) {
        clearTimeout(checkTimeout)
      }
      
      checkTimeout = setTimeout(() => {
        // Use requestIdleCallback for better performance
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            hideCampaignWidgets()
          })
        } else {
          hideCampaignWidgets()
        }
        checkTimeout = null
      }, 200) // 200ms debounce
    }
  })

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  })

  return observer
}

// Global state
let campaignObserver: MutationObserver | null = null
let isInitialized = false

export async function hideCampaigns() {
  if (!isFaceitPage()) {
    return
  }

  if (isInitialized) {
    return
  }

  try {
    // Initial hide of existing campaign widgets
    hideCampaignWidgets()

    // Set up observer for new campaign widgets
    if (!campaignObserver) {
      campaignObserver = observeAndHideCampaigns()
    }

    isInitialized = true
  } catch (error) {
  }
}

// Function to cleanup observer
export function cleanupCampaignHiding() {
  if (campaignObserver) {
    campaignObserver.disconnect()
    campaignObserver = null
  }
  isInitialized = false
} 