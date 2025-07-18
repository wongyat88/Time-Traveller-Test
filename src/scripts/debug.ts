// Debug script to test global state functionality
export async function debugGlobalState() {
    try {
        console.log('=== Time Travel Debug ===')

        // Test storage access
        const result = await chrome.storage.local.get('timeTravelGlobalState')
        console.log('Storage result:', result)

        // Test getting global state
        const { getGlobalState } = await import('../util/storage')
        const globalState = await getGlobalState()
        console.log('Global state:', globalState)

        // Test getting all tabs
        const tabs = await chrome.tabs.query({})
        console.log('Active tabs:', tabs.length)

        return {
            storageResult: result,
            globalState,
            activeTabs: tabs.length
        }
    } catch (error) {
        console.error('Debug failed:', error)
        return { error: error instanceof Error ? error.message : String(error) }
    }
}

// Fix clock state inconsistency
export async function fixClockState() {
    try {
        console.log('=== Fixing Clock State ===')

        const { getGlobalState, updateGlobalClockState } = await import('../util/storage')
        const globalState = await getGlobalState()

        console.log('Current state:', globalState)

        if (globalState.isGlobalEnabled && globalState.fakeDate) {
            // Fix the inconsistency: if clock is not stopped but no tick timestamp, set it
            if (!globalState.isClockStopped && !globalState.tickStartTimestamp) {
                console.log('Fixing: Setting tick start timestamp')
                await updateGlobalClockState(false, Date.now().toString())
            } else if (globalState.isClockStopped && globalState.tickStartTimestamp) {
                console.log('Fixing: Clearing tick start timestamp')
                await updateGlobalClockState(true, null)
            }

            const fixedState = await getGlobalState()
            console.log('Fixed state:', fixedState)
            return fixedState
        }

        return globalState
    } catch (error) {
        console.error('Fix failed:', error)
        return { error: error instanceof Error ? error.message : String(error) }
    }
}

// Reapply global state to all tabs
export async function reapplyGlobalState() {
    try {
        console.log('=== Reapplying Global State ===')

        const { getGlobalState } = await import('../util/storage')
        const globalState = await getGlobalState()

        if (!globalState.isGlobalEnabled) {
            console.log('Global mode is disabled')
            return
        }

        // Send message to background script to reapply
        await chrome.runtime.sendMessage({ msg: 'reapplyGlobalState' })
        console.log('Reapply message sent')

        return { success: true }
    } catch (error) {
        console.error('Reapply failed:', error)
        return { error: error instanceof Error ? error.message : String(error) }
    }
}

// Make it available globally for testing
if (typeof window !== 'undefined') {
    (window as Record<string, unknown>).debugTimeTravel = debugGlobalState
        ; (window as Record<string, unknown>).fixClockState = fixClockState
        ; (window as Record<string, unknown>).reapplyGlobalState = reapplyGlobalState
} 
