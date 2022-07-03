## Features
* Event listeners
  - [ ] Intercept
  - [ ] Track
  - [ ] Remove
  - [ ] Silent reject
  - [ ] Visualize
  - [ ] Cheat trigger
* setInterval, setTimeout, requestAnimationFrame
  - [ ] Intercept
  - [ ] Execution rejection
  - [ ] Unregistration rejection
  - [ ] Custom execution
  - [ ] Unregister
* Promise
  - [ ] Intercept
  - [ ] Execution rejection
  - [ ] Value modification
* Web requests
  - [ ] Intercept
  - [ ] Silent request reject
  - [ ] Silent response reject
  - [ ] Silent response forging
  - [ ] Header shapeshifting
  - [ ] Body shapeshifting (if small!)
  - [ ] Replay
  - [ ] Visualize
  - [ ] Response body hash
  - [ ] Response body difference comparison
  - [ ] Arbitrary request sending
* BroadcastChannel, WebSockets, Cross-frame and Worker messaging
  - [ ] Intercept
  - [ ] Silent posting reject
  - [ ] Silent receiving reject
  - [ ] Silent forging receipt
  - [ ] Message shapeshifting
  - [ ] Replay
  - [ ] Silent posting
* Media
  - [ ] Reject playback/pause
  - [ ] Play/pause
  - [ ] Controlled seeking
  - [ ] Playback speed adjusting (and toggles tone keeping)
  - [ ] Silent local media replacement (with `FFmpeg.wasm`)
  - [ ] Live image preview
* Form Data
  - [ ] Intercept
* Clipboard
  - [ ] Intercept
  - [ ] Silent reading reject
  - [ ] Silent reading modification
  - [ ] Silent write reject
  - [ ] Silent write modification
* Cookie
* LocalStorage, SessionStorage
* IndexedDB (difficult to implement)
* Canvas 2D
  - [ ] Intercept
  - [ ] Silent drawing reject (difficult to implement)
  - [ ] Silent reading reject
  - [ ] Silent reading modification
  - [ ] Silent measurement reject
  - [ ] Silent measurement modification

## Received message events
### pageStart
Establish a new connection to the background page from a new page.

#### Keys
* `pid`: Page ID.
* `tid`: Tab ID allocated by the browser.
* `url`: The current URL of page.
* `readyState`: The state of page when the agent injection succeeded.

### pageRun
Indicates a successful injection of Minuette on the target page.

#### Keys
* `pid`: Page ID.
* `tid`: Tab ID allocated by the browser.
* `url`: The current URL of page.
* `readyState`: The state of page when the injection succeeded.

### pageKeep
Heartbeat messages to keep connections alive.

#### Keys
* `pid`: Page ID.
* `tid`: Tab ID allocated by the browser.
* `url`: The current URL of page.

### pageEnd
Actively disconnects from the background page.

#### Keys
* `pid`: Page ID.
* `tid`: Tab ID allocated by the browser.
* `url`: The current URL of page.

### trigDoc
HTML element actions.

#### Keys
* `type`: One of `add`, `insert` and `remove`.
* `target`: One of `element`, `child`, `attribute`, `attributeNode` and `attributeNs`.
* `dir`: One of `append` (after), `appendChild` (append, appendChild), `prepend` (before) and `prependChild` (prepend, prependChild).

### addEL
Add a listener type to an element.

#### Keys
* `eid`: Element ID.
* `type`: Type of the new listener.
* `selector`: The CSS selector of target element.

### rmvEl
Remove a listener type of an element.

#### Keys
* `eid`: Element ID.
* `type`: Type of the new listener.

### trigEl
Trigger a listener type of an element.

#### Keys
* `eid`: Element ID.
* `ts`: Unix timestamp.
* `type`: Type of the new listener.
* `action`: One of `observe`, `reject`, `modify`.
* `data`: Data of the current event.

### trigPromise
Trigger a Promise.

#### Keys
* `id`: ID of the Promise.
* `ts`: Unix timestamp.
* `state`: The state of said promise. For example, `pending`, `running`, `resolved` or `rejected`.
* `root`: ID of the Promise object which triggered the original event.
* `parent`: ID of the parent Promise object.
* `data`: If the data contained can be considered primitive (`Number`, `BigInt`, `Object`, `String`), the returned value of the parent Promise.

### trigSchd
Trigger a scheduled call, like `setInterval`, `setTimeout` and `requestAnimationFrame`.

#### Keys
* `id`: ID of the schedule call.
* `fid`: ID of the function called.
* `ts`: Unix timestamp.
* `type`: One of `interval`, `timeout` and `animate`.
* `minDelay`: Set delay of scheduled calls. For example, `setInterval(o, 514)` will return `514`, while `requestAnimationFrame(o)` will return `-1`.
* `lastTs`: Unix timestamp of the last trigger.
