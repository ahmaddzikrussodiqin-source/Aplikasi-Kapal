# Auto-Logout Feature Implementation

## Task: Implement auto-logout after 60 minutes of inactivity

### Steps:

1. **Modify AuthContext.jsx** - Add idle timeout functionality:
   - [x] Add state for idle timer management
   - [x] Store last active timestamp in localStorage
   - [x] Add event listeners for user activity detection (mousemove, keydown, click, scroll, touch)
   - [x] Implement check on app load to logout if session expired
   - [x] Implement idle timer that auto-logouts after 60 minutes
   - [x] Clear timers properly to prevent memory leaks

2. **Test the implementation:**
   - Verify auto-logout after 60 minutes of inactivity
   - Verify auto-logout when reopening browser after 60 minutes
   - Verify timer resets on user activity

### Implementation Summary:

The auto-logout feature has been successfully implemented in `website/src/context/AuthContext.jsx`. Here's how it works:

1. **Idle Timeout**: Set to 60 minutes (60 * 60 * 1000 milliseconds)

2. **Session Tracking**:
   - `lastActive` timestamp stored in localStorage
   - Checked on app load to auto-logout if session expired
   - Updated on user activity (mousemove, keydown, click, scroll, touch)

3. **Key Functions**:
   - `updateLastActive()`: Updates the last active timestamp
   - `checkSessionExpired()`: Checks if 60 minutes have passed since last activity
   - `resetIdleTimer()`: Resets the idle timer on user activity
   - `logout()`: Logs out user and clears all session data

4. **Event Listeners**: Active on mousemove, keydown, click, scroll, and touchstart events

5. **Auto-Logout Behavior**:
   - When website is open but idle for 60 minutes: auto-logout and redirect to /login
   - When website is closed and reopened after 60 minutes: auto-logout on page load

