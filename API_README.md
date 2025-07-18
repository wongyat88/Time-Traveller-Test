# Time Travel Extension - External API

This document explains how to programmatically update the Time Travel extension's global state from external websites.

## Overview

The Time Travel extension now supports external API communication, allowing admin websites to update the extension's global fake date/time state without needing to be on a website where the extension is active.

## How It Works

1. **API Bridge Content Script**: A new content script (`api_bridge.ts`) runs on all websites and acts as a bridge between external websites and the extension's background script.

2. **Message Passing**: External websites communicate with the extension through `window.postMessage()` API.

3. **Global State Storage**: Updates are stored in the extension's `chrome.storage.local` with the key `'timeTravelGlobalState'`.

4. **Automatic Propagation**: Once the global state is updated, it automatically propagates to all tabs where the extension is active.

## Setup

### 1. Include the API Library

Add the `time-travel-api.js` file to your admin website:

```html
<script src="time-travel-api.js"></script>
```

### 2. Initialize the API

```javascript
const api = new TimeTravelAPI()
```

## API Methods

### `updateGlobalState(fakeDate, isClockStopped)`

Updates the global fake date/time state.

**Parameters:**

- `fakeDate` (string): ISO date string (e.g., `'2023-12-25T10:30:00.000Z'`)
- `isClockStopped` (boolean): Whether to stop the clock (default: `true`)

**Returns:** Promise that resolves to response object

**Example:**

```javascript
try {
    const response = await api.updateGlobalState('2023-12-25T10:30:00.000Z', true)
    console.log('Success:', response.message)
} catch (error) {
    console.error('Error:', error.message)
}
```

### `getGlobalState()`

Gets the current global state.

**Returns:** Promise that resolves to current state object

**Example:**

```javascript
try {
    const response = await api.getGlobalState()
    console.log('Current state:', response.globalState)
} catch (error) {
    console.error('Error:', error.message)
}
```

### `disable()`

Disables time travel (clears fake date).

**Returns:** Promise that resolves to response object

**Example:**

```javascript
try {
    const response = await api.disable()
    console.log('Time travel disabled')
} catch (error) {
    console.error('Error:', error.message)
}
```

### `isAvailable()`

Checks if the extension is available.

**Returns:** boolean

**Example:**

```javascript
if (api.isAvailable()) {
    console.log('Extension is available')
} else {
    console.log('Extension is not available')
}
```

### `waitForExtension(timeout)`

Waits for the extension to become available.

**Parameters:**

- `timeout` (number): Timeout in milliseconds (default: `10000`)

**Returns:** Promise that resolves to boolean

**Example:**

```javascript
const isAvailable = await api.waitForExtension(5000)
if (isAvailable) {
    console.log('Extension became available')
} else {
    console.log('Extension did not become available within timeout')
}
```

## Complete Example

```html
<!DOCTYPE html>
<html>
    <head>
        <title>Admin Control Panel</title>
        <script src="time-travel-api.js"></script>
    </head>
    <body>
        <h1>Time Travel Admin Control</h1>

        <div>
            <label>Fake Date:</label>
            <input type="datetime-local" id="fakeDate" />
            <input type="checkbox" id="isClockStopped" /> Stop Clock
            <button onclick="applyTimeTravel()">Apply</button>
            <button onclick="disableTimeTravel()">Disable</button>
        </div>

        <div id="status"></div>

        <script>
            const api = new TimeTravelAPI()

            // Set default date to now
            const now = new Date()
            const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
            document.getElementById('fakeDate').value = localDateTime

            async function applyTimeTravel() {
                const fakeDate = document.getElementById('fakeDate').value
                const isClockStopped = document.getElementById('isClockStopped').checked

                if (!fakeDate) {
                    showStatus('Please select a date', 'error')
                    return
                }

                try {
                    showStatus('Applying...', 'info')
                    await api.updateGlobalState(fakeDate, isClockStopped)
                    showStatus('Time travel applied successfully!', 'success')
                } catch (error) {
                    showStatus(`Error: ${error.message}`, 'error')
                }
            }

            async function disableTimeTravel() {
                try {
                    showStatus('Disabling...', 'info')
                    await api.disable()
                    showStatus('Time travel disabled!', 'success')
                } catch (error) {
                    showStatus(`Error: ${error.message}`, 'error')
                }
            }

            function showStatus(message, type) {
                const statusDiv = document.getElementById('status')
                statusDiv.textContent = message
                statusDiv.className = `status ${type}`
            }

            // Check if extension is available
            setTimeout(() => {
                if (api.isAvailable()) {
                    showStatus('Extension is available', 'success')
                } else {
                    showStatus('Extension not detected', 'error')
                }
            }, 1000)
        </script>
    </body>
</html>
```

## Security Considerations

1. **Origin Validation**: The API bridge only accepts messages from the same origin by default.

2. **Input Validation**: All inputs are validated before being processed.

3. **Timeout Protection**: Requests timeout after 5 seconds to prevent hanging.

4. **Error Handling**: All errors are properly caught and reported.

## Troubleshooting

### Extension Not Detected

1. Make sure the Time Travel extension is installed and enabled
2. Check that the extension has the necessary permissions
3. Verify that the API bridge content script is running (check browser console for "Time Travel: API Bridge loaded" message)

### Request Timeout

1. Check if the extension is responding
2. Verify that the message format is correct
3. Check browser console for any error messages

### Invalid Date Format

Make sure to use ISO date format: `YYYY-MM-DDTHH:mm:ss.sssZ`

Examples:

- `'2023-12-25T10:30:00.000Z'`
- `'2023-12-25T10:30:00Z'`
- `'2023-12-25T10:30:00.123Z'`

## File Structure

```
src/
├── scripts/
│   ├── api_bridge.ts          # API bridge content script
│   ├── worker.ts              # Background script (updated)
│   └── replace_date.ts        # Main content script
├── manifest.json              # Extension manifest (updated)
└── util/
    └── storage.ts             # Storage utilities

admin_example.html             # Complete admin interface example
time-travel-api.js             # Standalone API library
API_README.md                  # This documentation
```

## Browser Compatibility

- Chrome 109+
- Firefox (with manifest v3 support)
- Other Chromium-based browsers

## Notes

- The API bridge runs on all websites (`<all_urls>`) to ensure it's available for admin websites
- Global state changes automatically propagate to all active tabs
- Session storage is automatically initialized from the global state
- The extension maintains backward compatibility with existing functionality
