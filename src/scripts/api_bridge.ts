// API Bridge content script for external website communication
// This script allows external websites to update the extension's global state

declare const __EXT_VERSION__: string

interface TimeTravelAPIRequest {
    type: 'TIME_TRAVEL_UPDATE_GLOBAL_STATE' | 'TIME_TRAVEL_GET_GLOBAL_STATE' | 'TIME_TRAVEL_DISABLE'
    requestId?: string
    fakeDate?: string
    isClockStopped?: boolean
}

interface TimeTravelAPIResponse {
    success: boolean
    error?: string
    globalState?: unknown
    message?: string
}

; (() => {
    // Check if bridge is already loaded
    if ((window as any).__timeTravelAPIBridge !== undefined) {
        console.log('Time Travel: API Bridge already loaded, aborting.')
        return
    }

    console.log('Time Travel: API Bridge loaded !')

    // Listen for messages from external websites
    window.addEventListener('message', (event) => {
        // Security: Only accept messages from the same origin or trusted origins
        if (event.source !== window) return

        const data = event.data as TimeTravelAPIRequest
        if (!data || typeof data !== 'object') return

        // Handle different types of API requests
        if (data.type === 'TIME_TRAVEL_UPDATE_GLOBAL_STATE') {
            void handleUpdateGlobalState(data, event)
        } else if (data.type === 'TIME_TRAVEL_GET_GLOBAL_STATE') {
            void handleGetGlobalState(data, event)
        } else if (data.type === 'TIME_TRAVEL_DISABLE') {
            void handleDisableTimeTravel(data, event)
        }
    })

    async function handleUpdateGlobalState(data: TimeTravelAPIRequest, event: MessageEvent) {
        try {
            // Validate required fields
            if (!data.fakeDate || typeof data.fakeDate !== 'string') {
                sendResponse(event, { success: false, error: 'fakeDate is required and must be a string' })
                return
            }

            // Validate date format
            const testDate = new Date(data.fakeDate)
            if (isNaN(testDate.getTime())) {
                sendResponse(event, { success: false, error: 'Invalid date format' })
                return
            }

            // Send message to background script
            const response = await chrome.runtime.sendMessage({
                msg: 'updateGlobalStateFromAPI',
                fakeDate: data.fakeDate,
                isClockStopped: data.isClockStopped ?? true
            })

            sendResponse(event, response)
        } catch (error) {
            sendResponse(event, {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    async function handleGetGlobalState(data: TimeTravelAPIRequest, event: MessageEvent) {
        try {
            const response = await chrome.runtime.sendMessage({ msg: 'getGlobalState' })
            sendResponse(event, { success: true, globalState: response })
        } catch (error) {
            sendResponse(event, {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    async function handleDisableTimeTravel(data: TimeTravelAPIRequest, event: MessageEvent) {
        try {
            const response = await chrome.runtime.sendMessage({
                msg: 'updateGlobalStateFromAPI',
                fakeDate: null,
                isClockStopped: true
            })

            sendResponse(event, response)
        } catch (error) {
            sendResponse(event, {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    function sendResponse(event: MessageEvent, response: TimeTravelAPIResponse) {
        // Always use postMessage for responses since the client is listening for message events
        // The client doesn't listen for CustomEvents, so we need to use postMessage even for same-origin
        window.postMessage({
            type: 'TIME_TRAVEL_RESPONSE',
            requestId: (event.data as TimeTravelAPIRequest).requestId,
            ...response
        }, '*')
    }

    // Expose API bridge to window for debugging
    (window as any).__timeTravelAPIBridge = {
        version: __EXT_VERSION__ || 'dev',
        isLoaded: true
    }
})() 
