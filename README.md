# Minuette
⏳ Intercept, inspect, orchestrate. Advanced debugging, or behaviour analysis.

Compatible with both Chromium and Firefox.

## Features
* BroadcastChannel, WebSockets, Cross-frame and Worker messaging
  - [ ] Intercept
  - [ ] Silent posting reject
  - [ ] Silent receiving reject
  - [ ] Silent forging receipt
  - [ ] Message shapeshifting
  - [ ] Replay
  - [ ] Silent posting
* Canvas 2D
  - [ ] Intercept
  - [ ] Silent drawing reject (difficult to implement)
  - [ ] Silent reading reject
  - [ ] Silent reading modification
  - [ ] Silent measurement reject
  - [ ] Silent measurement modification
* Cookie
* Clipboard
  - [ ] Intercept
  - [ ] Silent reading reject
  - [ ] Silent reading modification
  - [ ] Silent write reject
  - [ ] Silent write modification
* Event listeners
  - [ ] Intercept
  - [ ] Track
  - [ ] Remove
  - [ ] Silent reject
  - [ ] Visualize
  - [ ] Cheat trigger
* Form Data
  - [ ] Intercept
* IndexedDB (difficult to implement)
* LocalStorage, SessionStorage
* Media
  - [ ] Reject playback/pause
  - [ ] Play/pause
  - [ ] Controlled seeking
  - [ ] Playback speed adjusting (and toggles tone keeping)
  - [ ] Silent local media replacement (with `FFmpeg.wasm`)
  - [ ] Live image preview
* Media Devices
* Page Visibility
* Promise
  - [ ] Intercept
  - [ ] Execution rejection
  - [ ] Value modification
* setInterval, setTimeout, requestAnimationFrame
  - [ ] Intercept
  - [ ] Execution rejection
  - [ ] Unregistration rejection
  - [ ] Custom execution
  - [ ] Unregister
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
