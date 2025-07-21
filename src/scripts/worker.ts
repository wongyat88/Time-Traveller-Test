import { allowedUrls } from '../config/allowedUrls.js'
import { registerContentScript } from '../util/browser'
import { getContentScriptState, setBadgeAndTitle, type ActivationMessage } from '../util/common'
import { getGlobalState, setGlobalState } from '../util/storage'

// Track all tabs that have content scripts active
const activeTabs = new Set<number>()

// Track tabs that have been reloaded to prevent infinite reloading
const reloadedTabs = new Set<number>()

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('Time Travel: Extension starting up')
    void initializeExtension()
})

// Handle extension installation/update
chrome.runtime.onInstalled.addListener(() => {
    console.log('Time Travel: Extension installed/updated')
    void initializeExtension()
})

// Handle new tab creation
chrome.tabs.onCreated.addListener((tab) => {
    if (tab.id) {
        console.log(`Time Travel: New tab created: ${tab.id}`)
        // We might not have a URL here yet, onUpdated will handle it.
        // We can still try to apply if the global state is on.
        void applyGlobalStateToTab(tab.id)
    }
})

async function initializeExtension() {
    try {
        // Register content scripts for all pages
        await registerContentScript()
        console.log('Time Travel: Content scripts registered')

        // Apply global state to all tabs
        await applyGlobalStateToAllTabs()
    } catch (error) {
        console.error('Time Travel: Failed to initialize extension:', error)
    }
}

chrome.tabs.onActivated.addListener((activeInfo) => {
    void updateBadgeAndTitle(activeInfo.tabId)
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading') {
        if (tab.url && !isRestrictedUrl(tab.url) && isAllowedWebsite(tab.url)) {
            console.log(`Time Travel: Tab loading allowed website: ${tab.url}`)
            void applyGlobalStateToTab(tabId)
        }
    }

    // Update badge when tab is updated, regardless of status
    void updateBadgeAndTitle(tabId)
})

chrome.tabs.onRemoved.addListener((tabId) => {
    activeTabs.delete(tabId)
    reloadedTabs.delete(tabId)
})

chrome.runtime.onMessage.addListener((message: ActivationMessage | { msg: 'getGlobalState' } | { msg: 'reapplyGlobalState' } | { msg: 'updateGlobalStateFromAPI', fakeDate: string, isClockStopped?: boolean }, sender, sendResponse) => {
    if (message.msg === 'active' && sender.tab?.id) {
        const state = {
            contentScriptActive: true,
            fakeDate: message.fakeDate,
            tickStartTimestamp: message.tickStartTimestamp,
            isClockStopped: message.isClockStopped,
            fakeDateActive: true,
        }
        activeTabs.add(sender.tab.id)
        void setBadgeAndTitle(sender.tab.id, state)
    } else if (message.msg === 'getGlobalState') {
        // Handle global state requests from content scripts
        void getGlobalState().then((globalState) => {
            sendResponse(globalState)
        })
        return true // Indicates we will send response asynchronously
    } else if (message.msg === 'reapplyGlobalState') {
        // Handle reapply global state requests
        console.log('Time Travel: Reapplying global state to all tabs')
        void applyGlobalStateToAllTabs()
        sendResponse({ success: true })
        return true
    } else if (message.msg === 'updateGlobalStateFromAPI') {
        // Handle external API updates to global state
        console.log('Time Travel: Received external API update:', message)
        void (async () => {
            try {
                const tickStartTimestamp = message.isClockStopped ? null : Date.now().toString()
                await setGlobalState({
                    isGlobalEnabled: true,
                    fakeDate: message.fakeDate,
                    isClockStopped: message.isClockStopped ?? true,
                    tickStartTimestamp
                })
                console.log('Time Travel: Successfully updated global state from external API')
                sendResponse({ success: true, message: 'Global state updated successfully' })
            } catch (error) {
                console.error('Time Travel: Failed to update global state from external API:', error)
                sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
            }
        })()
        return true // Indicates we will send response asynchronously
    }
})

// Listen for global state changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.timeTravelGlobalState) {
        console.log('Time Travel: Global state changed, applying to all tabs')

        // Clear reload tracking when global state changes so tabs can be reloaded again if needed
        reloadedTabs.clear()

        void applyGlobalStateToAllTabs()
    }
})

async function applyGlobalStateToTab(tabId: number) {
    try {
        const globalState = await getGlobalState()

        // Get tab info to check URL, but don't fail if it's not ready
        const tab = await chrome.tabs.get(tabId).catch(() => null)

        // Skip restricted URLs. If tab is null or has no URL, the checks will handle it.
        if (!tab || !tab.url || isRestrictedUrl(tab.url)) {
            console.log(`Time Travel: Skipping restricted or unavailable URL for tab ${tabId}`)
            return
        }

        // Only apply to allowed websites
        if (!isAllowedWebsite(tab.url)) {
            console.log(`Time Travel: Skipping non-allowed website: ${tab.url}`)
            return
        }

        console.log(`Time Travel: Applying global state to tab ${tabId} (${tab.url})`)

        // Check if we need to reload this tab for first-time time travel application
        // This is necessary because the website's JS executes before our extension can inject the fake date
        // By reloading, we ensure the fake date is in session storage before any page scripts run
        if (globalState.isGlobalEnabled && globalState.fakeDate && !reloadedTabs.has(tabId)) {
            console.log(`Time Travel: First load detected for tab ${tabId}, triggering reload to apply fake date`)
            reloadedTabs.add(tabId)

            // Reload the tab so that the fake date is available from the very beginning
            await chrome.tabs.reload(tabId)
            return // Exit early, the reload will trigger this function again
        }

        // Inject the global state into the tab's session storage.
        // This must run at document_start in the MAIN world to be effective before any page scripts.
        await chrome.scripting.executeScript({
            target: { tabId, allFrames: true },
            func: (state) => {
                // This function is injected into the page's MAIN world.
                try {
                    if (state.isGlobalEnabled && state.fakeDate) {
                        window.sessionStorage.setItem('timeTravelDate', state.fakeDate)
                        if (state.tickStartTimestamp) {
                            window.sessionStorage.setItem('timeTravelTickStartTimestamp', state.tickStartTimestamp)
                        } else {
                            window.sessionStorage.removeItem('timeTravelTickStartTimestamp')
                        }
                    } else {
                        window.sessionStorage.removeItem('timeTravelDate')
                        window.sessionStorage.removeItem('timeTravelTickStartTimestamp')
                    }
                } catch (e) {
                    console.error('Time Travel: Failed to set session storage in content script.', e)
                }
            },
            args: [globalState],
            injectImmediately: true, // Crucial: runs before page scripts
            world: 'MAIN', // Crucial: access the page's window object
        })

        // Update badge and title after attempting to apply state
        const state = await getContentScriptState(tabId)
        await setBadgeAndTitle(tabId, state)
    } catch (error) {
        console.error(`Failed to apply global state to tab ${tabId}:`, error)
    }
}

// Check if URL is restricted (chrome://, chrome-extension://, etc.)
function isRestrictedUrl(url: string): boolean {
    const restrictedProtocols = [
        'chrome://',
        'chrome-extension://',
        'moz-extension://',
        'about:',
        'data:',
        'file://',
        'view-source:'
    ]

    return restrictedProtocols.some(protocol => url.startsWith(protocol))
}


// Check if URL matches the allowed website patterns
function isAllowedWebsite(url: string): boolean {
    const allowedPatterns = allowedUrls

    return allowedPatterns.some(pattern => url.startsWith(pattern))
}

async function applyGlobalStateToAllTabs() {
    const globalState = await getGlobalState()

    if (!globalState.isGlobalEnabled) {
        console.log('Time Travel: Global mode is disabled')
        return
    }

    console.log('Time Travel: Applying global state to all tabs')

    // Get all tabs
    const tabs = await chrome.tabs.query({})

    for (const tab of tabs) {
        if (tab.id && tab.url && !isRestrictedUrl(tab.url) && isAllowedWebsite(tab.url)) {
            try {
                await applyGlobalStateToTab(tab.id)
            } catch (error) {
                console.error(`Failed to apply global state to tab ${tab.id}:`, error)
            }
        }
    }
}

async function updateBadgeAndTitle(tabId: number) {
    try {
        const state = await getContentScriptState(tabId)
        await setBadgeAndTitle(tabId, state)
    } catch (e) {
        //ignore errors
        console.log(e)
    }
}
