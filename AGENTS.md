# Generic Coding Style Prompts

## Handler Map Pattern (Object Lookup vs Switch)

### When to Use

**Use Object Lookup (Handler Maps) when:**
- Handler set will grow over time (Phase 1/2 development, extensible systems)
- Team values maintainability over micro-optimizations
- You need to inject/mock handlers for testing
- Handlers may need dynamic composition at runtime
- Handler count is <100 (negligible performance difference)
- You hate switch statements (subjective but valid!)

**Use Switch when:**
- Performance is critical (tight loops, thousands of invocations/second)
- Handler set is fixed and small (<5 cases)
- Memory allocation must be minimized
- Code is shipped and frozen (no new actions expected)

### The Pattern

**Handler Map (Recommended for Extensions):**
```javascript
const messageHandlers = {
  'SAVE_FILE': handleSaveFile,
  'LOAD_FILE': handleLoadFile,
  'PICK_DIRECTORY': handlePickDirectory,
  'LOG_RELAY_FROM_OFFSCREEN': handleLogRelay
};

function handleUnknownAction(action, payload, sender, sendResponse) {
  log('⚠️ Unknown action:', action);
  sendResponse({ error: `Unknown action: ${action}` });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, payload } = message;
  const handler = messageHandlers[action] || handleUnknownAction;
  handler(payload, sender, sendResponse);
  return true;
});
```

**Switch (When Necessary):**
```javascript
switch (action) {
  case 'SAVE_FILE':
    handleSaveFile(payload, sender, sendResponse);
    break;
  case 'LOAD_FILE':
    handleLoadFile(payload, sender, sendResponse);
    break;
  default:
    handleUnknownAction(action, payload, sender, sendResponse);
}
```

### Trade-offs

| Aspect | Handler Map | Switch |
|--------|-------------|--------|
| **Performance** | ~20-30% slower (negligible in practice) | Baseline |
| **Extensibility** | Add handlers without touching router | Requires code change |
| **Readability** | All handlers visible in one place | Clear fallthrough logic visible |
| **Testing** | Can inject/mock handlers | Must mock entire function |
| **Memory** | Allocates object | Stack allocation only |
| **Boilerplate** | Clean, no break statements | Repetitive case/break |

### Chrome Extension Context

For Chrome extensions, message routing is **NOT a performance bottleneck** because:
- Message frequency is user-driven (not thousands/sec)
- Processing time dominated by I/O (file access, network)
- Browser's JIT compiler optimizes both patterns equally

**Recommendation:** Use handler maps for all extension routing unless profiling proves otherwise.

### Example: Refactoring Switch to Handler Map

**Before:**
```javascript
switch (action) {
  case 'saveFile':
    handleSaveFile_Legacy(payload, sendResponse);
    break;
  case 'OPEN_MODAL':
    handleOpenModal(sender, sendResponse);
    break;
  case 'CLOSE_MODAL':
    handleCloseModal(sender, sendResponse);
    break;
  default:
    log('⚠️ Unknown action:', action);
    sendResponse({ error: `Unknown action: ${action}` });
}
```

**After:**
```javascript
const messageHandlers = {
  'saveFile': handleSaveFile_Legacy,
  'OPEN_MODAL': handleOpenModal,
  'CLOSE_MODAL': handleCloseModal
};

const handler = messageHandlers[action] || handleUnknownAction;
handler(payload, sender, sendResponse);
```

### Handler Signature Consistency

When using handler maps, enforce a consistent signature:

```javascript
// Good: All handlers have same signature
function handleSaveFile(payload, sender, sendResponse) { }
function handleLoadFile(payload, sender, sendResponse) { }

// Bad: Inconsistent signatures
function handleSaveFile(payload, sendResponse) { }      // Missing sender
function handleLoadFile(payload, sender, sendResponse) { } // Has sender
```

This makes the handler map work seamlessly without special cases.
