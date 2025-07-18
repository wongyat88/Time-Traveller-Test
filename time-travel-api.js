/**
 * Time Travel Extension API Client
 *
 * This library allows external websites to communicate with the Time Travel browser extension
 * to update the global fake date/time state.
 *
 * Usage:
 * const api = new TimeTravelAPI();
 * await api.updateGlobalState('2023-12-25T10:30:00.000Z', true);
 */

class TimeTravelAPI {
    constructor() {
        this.requestId = 0
        this.pendingRequests = new Map()
        this.isExtensionAvailable = false
        this.checkExtensionAvailability()
    }

    /**
     * Check if the Time Travel extension is available
     */
    checkExtensionAvailability() {
        // Since the API bridge runs in an isolated world, we can't directly access window.__timeTravelAPIBridge
        // Instead, we'll test communication by sending a test message
        this.testCommunication()
    }

    /**
     * Test communication with the extension
     */
    async testCommunication() {
        try {
            // Send a test message to see if the API bridge responds
            const testResponse = await this.sendMessage('TIME_TRAVEL_GET_GLOBAL_STATE', {}, 2000)
            this.isExtensionAvailable = true
            this.emit('extensionAvailable')
        } catch (error) {
            this.isExtensionAvailable = false
            console.warn('Time Travel extension not detected:', error.message)
        }
    }

    /**
     * Generate a unique request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${++this.requestId}`
    }

    /**
     * Send a message to the extension and wait for response
     */
    async sendMessage(type, data = {}, timeout = 5000) {
        const requestId = this.generateRequestId()

        return new Promise((resolve, reject) => {
            // Set up response listener
            const responseHandler = (event) => {
                if (event.data && event.data.type === 'TIME_TRAVEL_RESPONSE' && event.data.requestId === requestId) {
                    window.removeEventListener('message', responseHandler)
                    this.pendingRequests.delete(requestId)

                    if (event.data.success) {
                        resolve(event.data)
                    } else {
                        reject(new Error(event.data.error || 'Unknown error'))
                    }
                }
            }

            // Listen for response
            window.addEventListener('message', responseHandler)
            this.pendingRequests.set(requestId, responseHandler)

            // Send the message
            window.postMessage(
                {
                    type,
                    requestId,
                    ...data,
                },
                '*'
            )

            // Timeout
            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    window.removeEventListener('message', responseHandler)
                    this.pendingRequests.delete(requestId)
                    reject(new Error('Request timeout - extension may not be available'))
                }
            }, timeout)
        })
    }

    /**
     * Update the global fake date/time state
     * @param {string} fakeDate - ISO date string (e.g., '2023-12-25T10:30:00.000Z')
     * @param {boolean} isClockStopped - Whether to stop the clock (default: true)
     * @returns {Promise<Object>} Response object
     */
    async updateGlobalState(fakeDate, isClockStopped = true) {
        // Validate date format
        if (!fakeDate || typeof fakeDate !== 'string') {
            throw new Error('fakeDate is required and must be a string')
        }

        const testDate = new Date(fakeDate)
        if (isNaN(testDate.getTime())) {
            throw new Error('Invalid date format. Please use ISO date format (e.g., "2023-12-25T10:30:00.000Z")')
        }

        return this.sendMessage('TIME_TRAVEL_UPDATE_GLOBAL_STATE', {
            fakeDate,
            isClockStopped,
        })
    }

    /**
     * Get the current global state
     * @returns {Promise<Object>} Current global state
     */
    async getGlobalState() {
        return this.sendMessage('TIME_TRAVEL_GET_GLOBAL_STATE')
    }

    /**
     * Disable time travel (clear fake date)
     * @returns {Promise<Object>} Response object
     */
    async disable() {
        return this.sendMessage('TIME_TRAVEL_DISABLE')
    }

    /**
     * Check if the extension is available
     * @returns {boolean} True if extension is available
     */
    isAvailable() {
        return this.isExtensionAvailable
    }

    /**
     * Wait for the extension to become available
     * @param {number} timeout - Timeout in milliseconds (default: 10000)
     * @returns {Promise<boolean>} True if extension becomes available
     */
    async waitForExtension(timeout = 10000) {
        if (this.isExtensionAvailable) {
            return true
        }

        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                resolve(false)
            }, timeout)

            const checkInterval = setInterval(() => {
                if (this.isExtensionAvailable) {
                    clearInterval(checkInterval)
                    clearTimeout(timeoutId)
                    resolve(true)
                }
            }, 500)

            // Also listen for the event
            const eventHandler = () => {
                clearInterval(checkInterval)
                clearTimeout(timeoutId)
                window.removeEventListener('timeTravelExtensionAvailable', eventHandler)
                resolve(true)
            }
            window.addEventListener('timeTravelExtensionAvailable', eventHandler)
        })
    }

    /**
     * Force re-check extension availability
     * @returns {Promise<boolean>} True if extension is available
     */
    async recheckAvailability() {
        await this.testCommunication()
        return this.isExtensionAvailable
    }

    /**
     * Emit a custom event
     */
    emit(eventName, data = {}) {
        window.dispatchEvent(new CustomEvent(eventName, { detail: data }))
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    // CommonJS
    module.exports = TimeTravelAPI
} else if (typeof define === 'function' && define.amd) {
    // AMD
    define([], function () {
        return TimeTravelAPI
    })
} else if (typeof window !== 'undefined') {
    // Browser global
    window.TimeTravelAPI = TimeTravelAPI
}
