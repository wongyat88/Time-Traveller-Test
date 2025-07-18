// gets loaded together with replace_date.ts, so we know the extension
// is active even in case we don't have `activeTab` permission right now.
// this is necessary in particular when reloading a tab or on navigation

import type { ActivationMessage } from '../util/common'

async function checkAndApplyGlobalState() {
    try {
        const response = await chrome.runtime.sendMessage({ msg: 'getGlobalState' })
        if (response && response.isGlobalEnabled && response.fakeDate) {
            window.sessionStorage.setItem('timeTravelDate', response.fakeDate)
            if (response.tickStartTimestamp) {
                window.sessionStorage.setItem('timeTravelTickStartTimestamp', response.tickStartTimestamp)
            } else {
                window.sessionStorage.removeItem('timeTravelTickStartTimestamp')
            }
            console.log('Time Travel: Applied global state from send_active')
            return true
        }
        return false
    } catch (error) {
        console.log('Time Travel: Could not check global state in send_active:', error)
        return false
    }
}

async function initializeAndSendActive() {
    try {
        // First check for global state
        const globalStateApplied = await checkAndApplyGlobalState()

        const fakeDate = window.sessionStorage.getItem('timeTravelDate')
        if (fakeDate) {
            const tickStartTimestamp = window.sessionStorage.getItem('timeTravelTickStartTimestamp')
            void chrome.runtime.sendMessage<ActivationMessage>({
                msg: 'active',
                fakeDate,
                tickStartTimestamp,
                isClockStopped: !tickStartTimestamp,
            })
            console.log('Time Travel: Sent active message with fake date:', fakeDate)
        } else if (globalStateApplied) {
            // If global state was applied but no fake date in session storage, 
            // try again after a short delay
            setTimeout(() => {
                void initializeAndSendActive()
            }, 500)
        }
    } catch (exception) {
        //document possibly sandboxed
        console.log('send_active: Reading from sessionStorage was blocked:', exception)
    }
}

// Execute the async function
void initializeAndSendActive()

// Also listen for navigation events to re-apply global state
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        // Re-check global state on page load
        setTimeout(() => {
            void checkAndApplyGlobalState()
        }, 100)
    })
}
