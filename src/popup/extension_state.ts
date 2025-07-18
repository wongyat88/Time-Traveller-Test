/// <reference types="vite/client" />
import { m } from '../paraglide/messages'
import {
    getActiveTabId,
    injectFunction,
    isAboutUrl,
    isExtensionGalleryUrl,
    isFileUrl,
    registerContentScript,
} from '../util/browser'
import {
    formatLocalTime,
    getContentScriptState,
    isContentScriptActive,
    parseDate,
    setBadgeAndTitle,
} from '../util/common'
import * as inject from '../util/inject'
import { getGlobalState, setGlobalEnabled, updateGlobalClockState, updateGlobalFakeDate } from '../util/storage'

/** sets & enables fake date, returns whether page needs reload for content script to be injected */
export async function setFakeDate(dateString: string): Promise<boolean> {
    if (import.meta.env.DEV) {
        return true
    }

    const fakeDate = parseDate(dateString)
    if (fakeDate === null) {
        throw new Error('Invalid date format!')
    }

    const tabId = await getActiveTabId()

    let needsReload = false
    if (fakeDate && !(await isContentScriptActive(tabId))) {
        await registerContentScript()
        needsReload = true
    }

    await injectFunction(tabId, inject.setFakeDate, [fakeDate])

    return needsReload
}

export async function updateExtensionIcon() {
    const tabId = await getActiveTabId()
    const state = await getContentScriptState(tabId)
    await setBadgeAndTitle(tabId, state)
}

/** set clock ticking state. `setClockState(false)` also resets the start time to now. */
export async function setClockState(stopClock: boolean): Promise<void> {
    const tabId = await getActiveTabId()

    if (stopClock) {
        await injectFunction(tabId, inject.setTickStartTimestamp, [''])
    } else {
        const now = new Date()
        const nowTimestampStr = now.getTime().toString()
        await injectFunction(tabId, inject.setTickStartTimestamp, [nowTimestampStr])
    }
}

/** get current state of content script. Throws on permission errors */
export async function getState(): Promise<{ fakeDate?: string; isClockStopped: boolean }> {
    if (import.meta.env.DEV) {
        //return dummy state for testing
        return {
            fakeDate: '2005-06-07 08:09',
            isClockStopped: false,
        }
    }

    const tabId = await getActiveTabId()
    try {
        let initialFakeDate
        const state = await getContentScriptState(tabId)
        if (state.fakeDateActive && state.fakeDate) {
            const fakeDate = new Date(Date.parse(state.fakeDate))
            if (!state.isClockStopped && state.tickStartTimestamp) {
                const tickStartTimestamp = Number.parseInt(state.tickStartTimestamp)
                const elapsed = Date.now() - tickStartTimestamp
                const fakeDateNow = new Date(fakeDate.getTime() + elapsed)
                initialFakeDate = formatLocalTime(fakeDateNow)
            } else {
                initialFakeDate = state.fakeDate
            }
        }

        return {
            fakeDate: initialFakeDate,
            isClockStopped: state.isClockStopped,
        }
    } catch (error) {
        if (await isFileUrl(tabId)) {
            throw new Error(m.permission_error_file_url())
        } else if (await isExtensionGalleryUrl(tabId)) {
            throw new Error(m.permission_error_extension_gallery())
        } else if (await isAboutUrl(tabId)) {
            throw new Error(m.permission_error_generic())
        } else {
            const message = error instanceof Error ? error.message : ''
            throw new Error(m.permission_error_generic_with_message({ message }))
        }
    }
}

/** Enable or disable global fake time for all websites */
export async function setGlobalFakeTime(enabled: boolean, fakeDate?: string, isClockStopped?: boolean): Promise<void> {
    if (enabled && fakeDate) {
        const parsedDate = parseDate(fakeDate)
        if (parsedDate === null) {
            throw new Error('Invalid date format!')
        }

        // Ensure content scripts are registered for global mode
        try {
            await registerContentScript()
            console.log('Time Travel: Content scripts registered for global mode')
        } catch (error) {
            console.error('Time Travel: Failed to register content scripts:', error)
        }

        await updateGlobalFakeDate(parsedDate)
        await updateGlobalClockState(isClockStopped ?? true)
        await setGlobalEnabled(true)

        console.log('Time Travel: Global fake time enabled with date:', parsedDate)
    } else {
        await setGlobalEnabled(false)
        await updateGlobalFakeDate(null)
        await updateGlobalClockState(true, null)

        console.log('Time Travel: Global fake time disabled')
    }
}

/** Get global state */
export async function getGlobalFakeTimeState(): Promise<{ isEnabled: boolean; fakeDate?: string; isClockStopped: boolean }> {
    const globalState = await getGlobalState()

    if (!globalState.isGlobalEnabled || !globalState.fakeDate) {
        return {
            isEnabled: false,
            isClockStopped: true
        }
    }

    let currentFakeDate = globalState.fakeDate
    if (!globalState.isClockStopped && globalState.tickStartTimestamp) {
        const fakeDate = new Date(Date.parse(globalState.fakeDate))
        const tickStartTimestamp = Number.parseInt(globalState.tickStartTimestamp)
        const elapsed = Date.now() - tickStartTimestamp
        const fakeDateNow = new Date(fakeDate.getTime() + elapsed)
        currentFakeDate = formatLocalTime(fakeDateNow)
    }

    return {
        isEnabled: true,
        fakeDate: currentFakeDate,
        isClockStopped: globalState.isClockStopped
    }
}
