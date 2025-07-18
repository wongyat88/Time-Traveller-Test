// Time Travel - Fake Date & Time Application
class TimeTravel {
    constructor() {
        this.fakeDate = null
        this.tickStartTimestamp = null
        this.isClockStopped = false
        this.isEnabled = false
        this.updateInterval = null

        this.initializeElements()
        this.bindEvents()
        this.startDemoUpdates()
        this.loadState()
    }

    initializeElements() {
        // Form elements
        this.dateInput = document.getElementById('dateInput')
        this.applyBtn = document.getElementById('applyBtn')
        this.resetBtn = document.getElementById('resetBtn')
        this.helpBtn = document.getElementById('helpBtn')

        // Toggles
        this.enableToggle = document.getElementById('enableToggle')
        this.stopClockToggle = document.getElementById('stopClockToggle')

        // Status elements
        this.currentDateEl = document.getElementById('currentDate')
        this.statusEl = document.getElementById('status')

        // Demo elements
        this.demoNewDate = document.getElementById('demoNewDate')
        this.demoDateNow = document.getElementById('demoDateNow')
        this.demoLocaleString = document.getElementById('demoLocaleString')
        this.demoISOString = document.getElementById('demoISOString')

        // Modals
        this.helpModal = document.getElementById('helpModal')
        this.errorModal = document.getElementById('errorModal')
        this.closeHelp = document.getElementById('closeHelp')
        this.closeError = document.getElementById('closeError')
        this.errorMessage = document.getElementById('errorMessage')
    }

    bindEvents() {
        // Button events
        this.applyBtn.addEventListener('click', () => this.applyFakeDate())
        this.resetBtn.addEventListener('click', () => this.resetToRealTime())
        this.helpBtn.addEventListener('click', () => this.showHelpModal())

        // Toggle events
        this.enableToggle.addEventListener('change', (e) => this.onEnableChange(e.target.checked))
        this.stopClockToggle.addEventListener('change', (e) => this.onStopClockChange(e.target.checked))

        // Input events
        this.dateInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.applyFakeDate()
            }
        })

        // Modal events
        this.closeHelp.addEventListener('click', () => this.hideHelpModal())
        this.closeError.addEventListener('click', () => this.hideErrorModal())

        // Click outside modal to close
        this.helpModal.addEventListener('click', (e) => {
            if (e.target === this.helpModal) {
                this.hideHelpModal()
            }
        })

        this.errorModal.addEventListener('click', (e) => {
            if (e.target === this.errorModal) {
                this.hideErrorModal()
            }
        })
    }

    // Date parsing and validation
    parseDate(dateString) {
        if (!dateString || dateString.trim() === '') {
            return null
        }

        let input = dateString.trim()

        // Handle UNIX timestamp
        if (Number.isInteger(+input)) {
            const timestamp = parseInt(input)
            if (timestamp > 0) {
                return new Date(timestamp)
            }
        }

        // Try parsing as ISO string or other formats
        const parsed = Date.parse(input)
        if (!isNaN(parsed)) {
            return new Date(parsed)
        }

        return null
    }

    formatLocalTime(date) {
        if (!date || isNaN(date.getTime())) {
            return 'Invalid Date'
        }

        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }

    // Core functionality
    applyFakeDate() {
        const dateString = this.dateInput.value
        const parsedDate = this.parseDate(dateString)

        if (!parsedDate) {
            this.showError('Invalid date format. Please check the help for valid formats.')
            return
        }

        this.fakeDate = parsedDate
        this.isEnabled = true
        this.enableToggle.checked = true

        if (!this.isClockStopped) {
            this.tickStartTimestamp = Date.now()
        }

        this.updateState()
        this.saveState()
        this.updateDemo()

        // Animate the status update
        this.animateStatusUpdate()
    }

    resetToRealTime() {
        this.fakeDate = null
        this.tickStartTimestamp = null
        this.isClockStopped = false
        this.isEnabled = false

        this.enableToggle.checked = false
        this.stopClockToggle.checked = false
        this.dateInput.value = ''

        this.updateState()
        this.saveState()
        this.updateDemo()

        this.animateStatusUpdate()
    }

    onEnableChange(enabled) {
        if (!enabled) {
            this.resetToRealTime()
        } else {
            const dateString = this.dateInput.value
            const parsedDate = this.parseDate(dateString)

            if (parsedDate) {
                this.fakeDate = parsedDate
                this.isEnabled = true
                this.updateState()
                this.saveState()
                this.updateDemo()
            } else {
                this.enableToggle.checked = false
                this.showError('Please enter a valid date first.')
            }
        }
    }

    onStopClockChange(stopClock) {
        this.isClockStopped = stopClock

        if (stopClock) {
            this.tickStartTimestamp = null
        } else {
            this.tickStartTimestamp = Date.now()
        }

        this.updateState()
        this.saveState()
    }

    // State management
    updateState() {
        if (this.isEnabled && this.fakeDate) {
            let effectiveDate = this.fakeDate

            if (!this.isClockStopped && this.tickStartTimestamp) {
                const elapsed = Date.now() - this.tickStartTimestamp
                effectiveDate = new Date(this.fakeDate.getTime() + elapsed)
            }

            this.currentDateEl.textContent = this.formatLocalTime(effectiveDate)
            this.statusEl.textContent = this.isClockStopped ? 'Active (Clock Stopped)' : 'Active (Clock Running)'
            this.statusEl.style.color = this.isClockStopped ? '#ffc107' : '#28a745'
        } else {
            this.currentDateEl.textContent = 'Not set'
            this.statusEl.textContent = 'Inactive'
            this.statusEl.style.color = '#6c757d'
        }

        // Update button states
        this.applyBtn.disabled = !this.parseDate(this.dateInput.value)
        this.stopClockToggle.disabled = !this.isEnabled
    }

    saveState() {
        const state = {
            fakeDate: this.fakeDate ? this.fakeDate.toISOString() : null,
            tickStartTimestamp: this.tickStartTimestamp,
            isClockStopped: this.isClockStopped,
            isEnabled: this.isEnabled,
        }

        localStorage.setItem('timeTravelState', JSON.stringify(state))
    }

    loadState() {
        try {
            const saved = localStorage.getItem('timeTravelState')
            if (saved) {
                const state = JSON.parse(saved)

                if (state.fakeDate) {
                    this.fakeDate = new Date(state.fakeDate)
                    this.dateInput.value = this.formatLocalTime(this.fakeDate)
                }

                this.tickStartTimestamp = state.tickStartTimestamp
                this.isClockStopped = state.isClockStopped
                this.isEnabled = state.isEnabled

                this.enableToggle.checked = this.isEnabled
                this.stopClockToggle.checked = this.isClockStopped

                this.updateState()
            }
        } catch (error) {
            console.warn('Failed to load saved state:', error)
        }
    }

    // Demo functionality
    startDemoUpdates() {
        this.updateDemo()
        this.updateInterval = setInterval(() => {
            this.updateDemo()
            this.updateState()
        }, 1000)
    }

    updateDemo() {
        const now = this.getFakeDate()

        this.demoNewDate.textContent = now.toString()
        this.demoDateNow.textContent = now.getTime()
        this.demoLocaleString.textContent = now.toLocaleString()
        this.demoISOString.textContent = now.toISOString()
    }

    getFakeDate() {
        if (!this.isEnabled || !this.fakeDate) {
            return new Date()
        }

        if (this.isClockStopped) {
            return this.fakeDate
        }

        if (this.tickStartTimestamp) {
            const elapsed = Date.now() - this.tickStartTimestamp
            return new Date(this.fakeDate.getTime() + elapsed)
        }

        return this.fakeDate
    }

    // UI helpers
    showHelpModal() {
        this.helpModal.style.display = 'block'
    }

    hideHelpModal() {
        this.helpModal.style.display = 'none'
    }

    showError(message) {
        this.errorMessage.textContent = message
        this.errorModal.style.display = 'block'
    }

    hideErrorModal() {
        this.errorModal.style.display = 'none'
    }

    animateStatusUpdate() {
        const statusElements = [this.currentDateEl, this.statusEl]

        statusElements.forEach((el) => {
            el.classList.add('updated')
            setTimeout(() => {
                el.classList.remove('updated')
            }, 500)
        })
    }

    // Override Date constructor and methods
    injectFakeDate() {
        if (!this.isEnabled || !this.fakeDate) {
            return
        }

        const originalDate = window.Date
        const self = this

        // Override Date constructor
        window.Date = function (...args) {
            if (args.length === 0) {
                return new originalDate(self.getFakeDate())
            }
            return new originalDate(...args)
        }

        // Copy static methods
        Object.setPrototypeOf(window.Date, originalDate)
        Object.setPrototypeOf(window.Date.prototype, originalDate.prototype)

        // Override Date.now()
        window.Date.now = function () {
            return self.getFakeDate().getTime()
        }

        // Override Date.UTC()
        window.Date.UTC = originalDate.UTC

        // Override Date.parse()
        window.Date.parse = originalDate.parse
    }

    // Cleanup
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval)
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const timeTravel = new TimeTravel()

    // Inject fake date functionality
    timeTravel.injectFakeDate()

    // Expose for debugging
    window.timeTravel = timeTravel

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        timeTravel.destroy()
    })
})

// Additional utility functions for testing
window.testTimeTravel = {
    setFakeDate: (dateString) => {
        const parsed = new Date(dateString)
        if (!isNaN(parsed.getTime())) {
            window.timeTravel.fakeDate = parsed
            window.timeTravel.isEnabled = true
            window.timeTravel.tickStartTimestamp = Date.now()
            window.timeTravel.updateState()
            window.timeTravel.saveState()
            window.timeTravel.updateDemo()
            return true
        }
        return false
    },

    reset: () => {
        window.timeTravel.resetToRealTime()
    },

    getCurrentFakeDate: () => {
        return window.timeTravel.getFakeDate()
    },
}
