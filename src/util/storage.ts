export interface GlobalState {
    isGlobalEnabled: boolean
    fakeDate: string | null
    tickStartTimestamp: string | null
    isClockStopped: boolean
}

const STORAGE_KEYS = {
    GLOBAL_STATE: 'timeTravelGlobalState'
} as const

const DEFAULT_STATE: GlobalState = {
    isGlobalEnabled: false,
    fakeDate: null,
    tickStartTimestamp: null,
    isClockStopped: true
}

export async function getGlobalState(): Promise<GlobalState> {
    try {
        const result = await chrome.storage.local.get(STORAGE_KEYS.GLOBAL_STATE)
        const storedState = result[STORAGE_KEYS.GLOBAL_STATE] as Partial<GlobalState> | undefined
        const finalState = { ...DEFAULT_STATE, ...storedState }
        console.log('Time Travel: Retrieved global state:', finalState)
        return finalState
    } catch (error) {
        console.error('Failed to get global state:', error)
        return DEFAULT_STATE
    }
}

export async function setGlobalState(state: Partial<GlobalState>): Promise<void> {
    try {
        const currentState = await getGlobalState()
        const newState = { ...currentState, ...state }
        console.log('Time Travel: Setting global state:', newState)
        await chrome.storage.local.set({ [STORAGE_KEYS.GLOBAL_STATE]: newState })
        console.log('Time Travel: Global state saved successfully')
    } catch (error) {
        console.error('Failed to set global state:', error)
        throw error
    }
}

export async function updateGlobalFakeDate(fakeDate: string | null): Promise<void> {
    console.log('Time Travel: Updating global fake date:', fakeDate)
    await setGlobalState({ fakeDate })
}

export async function updateGlobalClockState(isClockStopped: boolean, tickStartTimestamp?: string | null): Promise<void> {
    console.log('Time Travel: Updating global clock state:', { isClockStopped, tickStartTimestamp })

    // If clock is not stopped, ensure we have a tick start timestamp
    let finalTickStartTimestamp = tickStartTimestamp
    if (!isClockStopped && !tickStartTimestamp) {
        finalTickStartTimestamp = Date.now().toString()
        console.log('Time Travel: Setting tick start timestamp to current time:', finalTickStartTimestamp)
    } else if (isClockStopped) {
        finalTickStartTimestamp = null
    }

    await setGlobalState({
        isClockStopped,
        tickStartTimestamp: finalTickStartTimestamp
    })
}

export async function setGlobalEnabled(enabled: boolean): Promise<void> {
    console.log('Time Travel: Setting global enabled:', enabled)
    await setGlobalState({ isGlobalEnabled: enabled })
}

export async function clearGlobalState(): Promise<void> {
    try {
        console.log('Time Travel: Clearing global state')
        await chrome.storage.local.remove(STORAGE_KEYS.GLOBAL_STATE)
        console.log('Time Travel: Global state cleared successfully')
    } catch (error) {
        console.error('Failed to clear global state:', error)
        throw error
    }
} 
