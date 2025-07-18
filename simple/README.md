# 🕰️ Time Travel - Simplified Version

A simplified web application that allows you to fake the current date and time in JavaScript. This is a standalone version of the Time Travel browser extension, built with only HTML, CSS, and JavaScript.

## Features

- **Fake Date & Time**: Set any date and time to be used by JavaScript `Date` objects
- **Clock Control**: Start/stop the clock to freeze or resume time progression
- **Multiple Date Formats**: Support for various date input formats
- **Live Demo**: See how the fake date affects different JavaScript date methods
- **Persistent State**: Settings are saved in localStorage
- **Responsive Design**: Works on desktop and mobile devices

## Supported Date Formats

- `2025-04-27 12:40` - Local time
- `2025-04-27` - Midnight UTC
- `2025-03-30 00:59:55` - With seconds
- `2025-04-27T12:40Z` - UTC time
- `2025-04-27T12:40+1130` - With timezone offset
- `1731493140025` - UNIX timestamp

## How to Use

1. **Open the Application**: Simply open `index.html` in your web browser
2. **Enter a Date**: Type a date in any supported format
3. **Apply the Fake Date**: Click "Apply Fake Date" or press Enter
4. **Control the Clock**: Use the toggles to enable/disable fake time and stop/start the clock
5. **Reset**: Click "Reset to Real Time" to return to the actual system time

## Live Demo Section

The application includes a live demo that shows how the fake date affects:

- `new Date()` - Constructor
- `Date.now()` - Current timestamp
- `toLocaleString()` - Formatted local time
- `toISOString()` - ISO string format

## Technical Details

### Date Injection

The application overrides the JavaScript `Date` constructor and `Date.now()` method to return the fake date instead of the real system time.

### State Management

- Settings are automatically saved to localStorage
- The application remembers your last used date and settings
- State is restored when you reload the page

### Clock Control

- **Running**: The fake date progresses in real-time from the set starting point
- **Stopped**: The fake date remains frozen at the set time

## Browser Compatibility

This application works in all modern browsers that support:

- ES6 classes and arrow functions
- localStorage API
- CSS Grid and Flexbox
- CSS Custom Properties (variables)

## Testing

You can test the fake date functionality using the browser console:

```javascript
// Set a fake date programmatically
window.testTimeTravel.setFakeDate('2025-01-01 12:00:00')

// Reset to real time
window.testTimeTravel.reset()

// Get current fake date
window.testTimeTravel.getCurrentFakeDate()
```

## Limitations

- Only affects JavaScript `Date` objects in the current page
- Does not change system time or affect other applications
- Some third-party libraries may cache Date objects
- The fake date is only active while the page is open

## File Structure

```
simple/
├── index.html      # Main HTML file
├── styles.css      # CSS styles and responsive design
├── script.js       # JavaScript functionality
└── README.md       # This file
```

## Development

To modify or extend the application:

1. Edit `index.html` for structure changes
2. Modify `styles.css` for styling updates
3. Update `script.js` for functionality changes

The code is well-commented and organized into logical sections for easy maintenance.

## License

This simplified version is based on the original Time Travel browser extension. Please refer to the main project's LICENSE file for licensing information.
