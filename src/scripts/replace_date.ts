declare const __EXT_VERSION__: string

    ; (() => {
        console.log(`Time Travel: injected content-script (version ${__EXT_VERSION__}) for host ${window.location.host}`)
        console.log(`Time Travel: Document ready state: ${document.readyState}`)
        console.log(`Time Travel: Current real time: ${new Date().toString()}`)

        if (window['__timeTravelCheckToggle'] !== undefined) {
            console.log('Time Travel: content script was already injected, aborting.')
            return
        }

        const FAKE_DATE_STORAGE_KEY = 'timeTravelDate'
        const TICK_START_STORAGE_KEY = 'timeTravelTickStartTimestamp'

        // ==================== helper functions ====================

        function getFromStorage(key: string): string | null {
            try {
                return window.sessionStorage.getItem(key)
            } catch {
                return null
            }
        }

        function getTickStartTimestamp(): number | null {
            const startTimestamp = getFromStorage(TICK_START_STORAGE_KEY)
            if (startTimestamp === null) {
                return null
            }
            try {
                return Number.parseInt(startTimestamp)
            } catch {
                return null
            }
        }

        function fakeNowDate(): Date {
            const fakeDate = getFromStorage(FAKE_DATE_STORAGE_KEY)
            if (fakeDate !== null) {
                const fakeDateObject = new OriginalDate(fakeDate)
                const startTimestamp = getTickStartTimestamp()
                if (startTimestamp === null) {
                    return fakeDateObject
                } else {
                    const elapsed = OriginalDate.now() - startTimestamp
                    return new OriginalDate(fakeDateObject.getTime() + elapsed)
                }
            } else {
                return new OriginalDate()
            }
        }

        function copyOwnProperties<T extends object>(source: T, target: T): void {
            Reflect.ownKeys(source)
                .filter((key) => key !== 'constructor')
                .forEach((key) => {
                    target[key as keyof T] = source[key as keyof T]
                })
        }

        // ==================== Date replacement ====================

        const OriginalDate = Date

        function FakeDate(...args: unknown[]) {
            if (!new.target) {
                return new Date().toString()
            }

            if (args.length === 0) {
                args = [fakeNowDate()]
            }
            // @ts-expect-error: let original Date constructor handle the arguments
            const returnDate = new OriginalDate(...args)
            Object.setPrototypeOf(returnDate, new.target.prototype as object)
            return returnDate
        }

        Object.setPrototypeOf(FakeDate, OriginalDate)
        FakeDate.now = () => new Date().getTime()
        copyOwnProperties(OriginalDate.prototype, FakeDate.prototype)

        // ==================== Intl.DateTimeFormat replacement ====================

        const OriginalIntlDateTimeFormat = Intl.DateTimeFormat

        interface FakeIntlDateTimeFormat extends Intl.DateTimeFormat {
            _originalObject: Intl.DateTimeFormat
        }

        function FakeIntlDateTimeFormat(
            this: FakeIntlDateTimeFormat,
            locale?: string | string[],
            options?: Intl.DateTimeFormatOptions
        ) {
            if (!new.target) {
                return new Intl.DateTimeFormat(locale, options)
            }
            this._originalObject = OriginalIntlDateTimeFormat(locale, options)

            this.format = format.bind(this)
            this.formatToParts = formatToParts.bind(this)
            this.formatRange = formatRange.bind(this)
            this.formatRangeToParts = formatRangeToParts.bind(this)
            this.resolvedOptions = resolvedOptions.bind(this)

            return this
        }

        function format(this: FakeIntlDateTimeFormat, date?: Date) {
            return this._originalObject.format(date ?? fakeNowDate())
        }
        function formatToParts(this: FakeIntlDateTimeFormat, date?: Date | number): Intl.DateTimeFormatPart[] {
            return this._originalObject.formatToParts(date ?? fakeNowDate())
        }
        type RangeDate = Date | number | bigint
        function formatRange(this: FakeIntlDateTimeFormat, startDate: RangeDate, endDate: RangeDate) {
            return this._originalObject.formatRange(startDate, endDate)
        }
        function formatRangeToParts(this: FakeIntlDateTimeFormat, startDate: RangeDate, endDate: RangeDate) {
            return this._originalObject.formatRangeToParts(startDate, endDate)
        }
        function resolvedOptions(this: FakeIntlDateTimeFormat) {
            return this._originalObject.resolvedOptions()
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        FakeIntlDateTimeFormat.prototype[Symbol.toStringTag] = 'Intl.DateTimeFormat'
        Object.setPrototypeOf(FakeIntlDateTimeFormat, Intl.DateTimeFormat)

        // ==================== toggle logic ====================

        const timeTravelCheckToggle = () => {
            const fakeDate = getFromStorage(FAKE_DATE_STORAGE_KEY)
            if (fakeDate !== null) {
                console.log(`Time Travel: Enabling fake date: ${fakeDate}`)
                console.log(`Time Travel: Document ready state when enabling: ${document.readyState}`)
                // eslint-disable-next-line no-global-assign
                Date = FakeDate as DateConstructor
                Intl.DateTimeFormat = FakeIntlDateTimeFormat as typeof Intl.DateTimeFormat
                console.log(`Time Travel: Fake date enabled. Test: ${new Date().toString()}`)
            } else {
                console.log('Time Travel: Disabling')
                console.log(`Time Travel: Document ready state when disabling: ${document.readyState}`)
                // eslint-disable-next-line no-global-assign
                Date = OriginalDate
                Intl.DateTimeFormat = OriginalIntlDateTimeFormat
            }
        }

        // ==================== CRITICAL: Apply immediately ====================
        // Apply fake date IMMEDIATELY, even before checking global state
        // This ensures the fake Date is available when website scripts load
        console.log('Time Travel: Initial session storage state:')
        console.log(`  FAKE_DATE_STORAGE_KEY: ${getFromStorage(FAKE_DATE_STORAGE_KEY)}`)
        console.log(`  TICK_START_STORAGE_KEY: ${getFromStorage(TICK_START_STORAGE_KEY)}`)

        timeTravelCheckToggle()

        // ==================== Session Storage Change Detection ====================
        // A listener for when the popup changes the date on an existing page.
        // The background script can't directly update the MAIN world of a page
        // after it has loaded, so it notifies via storage events.
        window.addEventListener('storage', (event) => {
            // We only care about sessionStorage events
            if (event.storageArea === window.sessionStorage) {
                if (event.key === FAKE_DATE_STORAGE_KEY || event.key === TICK_START_STORAGE_KEY) {
                    console.log(`Time Travel: Storage event detected for key: ${event.key}. Re-applying toggle.`)
                    timeTravelCheckToggle()
                }
            }
        })

        // The background script handles all the logic for setting the initial state.
        // The complex polling and message passing has been removed for a more reliable
        // injection method from the service worker.

        // Event listeners for debugging
        document.addEventListener('DOMContentLoaded', () => {
            console.log(`Time Travel: DOMContentLoaded event fired. Ready state: ${document.readyState}`)
        })

        window.addEventListener('load', () => {
            console.log(`Time Travel: Load event fired. Ready state: ${document.readyState}`)
        })

        window['__timeTravelCheckToggle'] = timeTravelCheckToggle
    })()

export { }

