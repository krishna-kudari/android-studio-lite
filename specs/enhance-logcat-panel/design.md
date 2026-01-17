## Technical Requirements Document

### Scope
- Consolidate device/AVD state into `AVDService` as the single source of truth.
- Remove `DeviceService` and migrate its responsibilities into `AVDService`.
- Refactor AVD-related webviews to separate UI from state and logic.
- Use caching to avoid unnecessary ADB/AVD queries.
- Produce a design-only plan; no implementation in this change set.

### Current State Summary
- `DeviceService` owns `selectedDeviceId`, polls ADB, and stores selection in workspace state.
- `AVDService` manages AVD lifecycle (list/create/rename/delete/launch) and caches AVD lists.
- Webviews manage their own selected AVD/module state and store selection in workspace state.
- Webviews communicate with extension via message passing.

### Goals
- One source of truth for device and AVD state in `AVDService`.
- Webviews become thin UI layers; state is derived from service and pushed to webviews.
- Simplify persistence: use workspace state only through `AVDService`.
- Minimize redundant polling and maximize cache use.

### Non-Goals
- No UI redesign.
- No changes to unrelated services or features.
- No new test suites unless explicitly requested.

### Proposed Architecture

#### AVDService as Source of Truth
Add device state responsibilities to `AVDService`:
- `selectedDeviceId: string | null`
- `selectedAVDName: string | null`
- `onlineDevices: EnrichedDevice[]`
- `lastSelectedEmulator: string | null`
- `devicePollingInterval: NodeJS.Timeout | null`

Responsibilities:
- Poll ADB devices on a timer (moved from `DeviceService`).
- Persist `selectedDeviceId` and `selectedAVDName` in workspace state.
- Keep AVD list cache; add device list cache with TTL.
- Map running emulator device IDs to AVD names via ADB (reuse AdbService).

#### State Access Across Services
Services inject `AVDService` and call:
- `getSelectedDevice()`
- `getSelectedDeviceId()`
- `getOnlineDevices()`
- `getSelectedAVDName()`
- `setSelectedDeviceId(...)`
- `setSelectedAVDName(...)`

Use EventBus or a simple callback-based subscription:
- `onDeviceStateChanged(cb)`
- `onAvdListChanged(cb)`

#### Webview Refactor Strategy
Split each webview into:
- UI component (render only, event emitters)
- Controller or state adapter (message handling, mapping state to UI)

Recommended structure:
- `avdSelector.html`: purely shell loading bundle.
- `avdSelector.ts`: thin UI + event emitter.
- `avdSelectorProvider.ts`: state sync, no UI logic.
- `AVDDropdownView.ts`: state sync, no UI logic.

Webview behavior:
- On ready, request initial state from extension.
- Receive consolidated state payload from `AVDService`.
- Send only user intent (select AVD/device, refresh, run app, toggle logcat).

### Data Flow
1. `AVDService` polls ADB and caches devices.
2. `AVDService` updates selection state and persists to workspace state.
3. Provider sends state to webview via `notify/update` messages.
4. Webview renders state and emits user intent.
5. Provider calls `AVDService` methods and re-broadcasts state changes.

### API Changes (Proposed)

#### AVDService
- `startDevicePolling()` / `stopDevicePolling()`
- `refreshDevices(force?: boolean)`
- `getOnlineDevices(): EnrichedDevice[]`
- `getSelectedDevice(): EnrichedDevice | null`
- `getSelectedDeviceId(): string | null`
- `setSelectedDeviceId(id: string | null): Promise<void>`
- `getSelectedAVDName(): string | null`
- `setSelectedAVDName(name: string | null): Promise<void>`
- `onDeviceStateChanged(cb: (state) => void): Disposable`

#### Removal
- Remove `DeviceService` and its DI registration.
- Update any consumers (LogcatProvider, commands) to use `AVDService`.

### Caching Strategy
- Reuse existing cache utilities in `Service`.
- Cache devices list for short TTL (e.g., 3 seconds).
- Cache AVD list as currently implemented.
- Only re-query ADB when cache is expired or forced.

### Webview Message Contract (Proposed)
Incoming to webview:
- `avd-state`: `{ avds, selectedAVDName, onlineDevices, selectedDeviceId, modules, selectedModule }`

Outgoing from webview:
- `select-avd` `{ avdName }`
- `select-device` `{ deviceId }`
- `refresh-avds`
- `refresh-devices`
- `run-app` `{ avdName, moduleName, cancellationToken }`
- `toggle-logcat` `{ active }`

### Migration Steps
1. Extend `AVDService` with device state and polling.
2. Replace `DeviceService` usages with `AVDService`.
3. Update DI container to remove `DeviceService`.
4. Refactor webview providers to read state from `AVDService`.
5. Refactor webview UI to be stateless and driven by messages.
6. Remove workspace state usage from webviews.

### Risks
- Breaking device selection if ADB polling or mapping fails.
- Webview state desync if message contracts are inconsistent.
- Increased coupling if `AVDService` grows too large.

### Open Questions
- Should device polling be always-on or demand-based? Demand-based.
- Preferred TTL for device list cache? 5 minutes.
- Should selected AVD automatically map to a running emulator on start? Yes.
