import { systemSettings } from '../lib/storage'
import { select } from '../lib/match-room'
import { setFeatureAttribute, hasFeatureAttribute, setStyle } from '../lib/dom-element'

export async function addExtensionToggle() {
  try {
    // Check if toggle already exists
    if (hasFeatureAttribute('extension-toggle', document.body)) {
      return
    }
    
    console.log('Adding extension toggle UI...')
    
    // Create toggle button using a simpler approach
    const toggleButton = document.createElement('div')
    console.log('Created toggle button:', toggleButton)
    console.log('toggleButton type:', typeof toggleButton)
    console.log('toggleButton.addEventListener:', typeof toggleButton.addEventListener)
    
    toggleButton.className = 'refreak-toggle'
    setStyle(toggleButton, [
      'position: fixed',
      'top: 20px',
      'right: 20px',
      'background: #2563eb',
      'color: white',
      'padding: 8px 12px',
      'border-radius: 6px',
      'font-size: 12px',
      'font-weight: 500',
      'cursor: pointer',
      'z-index: 10000',
      'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15)',
      'transition: all 0.2s ease'
    ])
    toggleButton.textContent = 'Refreak ON'
    
    // Add hover effect
    toggleButton.addEventListener('mouseenter', function() {
      toggleButton.style.background = '#1d4ed8'
      toggleButton.style.transform = 'translateY(-1px)'
    })
    
    toggleButton.addEventListener('mouseleave', function() {
      toggleButton.style.background = '#2563eb'
      toggleButton.style.transform = 'translateY(0)'
    })
    
    // Add click handler
    toggleButton.addEventListener('click', async function() {
      try {
        const currentSettings = await systemSettings.getValue()
        const newEnabled = !currentSettings.enabled
        
        await systemSettings.setValue({
          ...currentSettings,
          enabled: newEnabled
        })
        
        // Update button text
        toggleButton.textContent = newEnabled ? 'Refreak ON' : 'Refreak OFF'
        toggleButton.style.background = newEnabled ? '#2563eb' : '#6b7280'
        
        // Reload page to apply changes
        if (newEnabled) {
          window.location.reload()
        } else {
          // Remove all Refreak elements
          const root = document.getElementById('__next') ?? document.body
          const elements = root.querySelectorAll('.refreak-toggle, .smurf-indicator')
          Array.from(elements).forEach((el: Element) => el.remove())
        }
        
      } catch (error) {
        console.error('Failed to toggle extension:', error)
      }
    })
    
    // Add to page
    const root = document.getElementById('__next') ?? document.body
    root.appendChild(toggleButton)
    console.log('Toggle button added to page')
    
    // Mark that extension toggle is added
    setFeatureAttribute('extension-toggle', document.body)
    
  } catch (error) {
    console.error('Failed to add extension toggle:', error)
  }
}