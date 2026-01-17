## Technical Requirements Document: Logcat Service Refactor

### Scope
- Simplify logcat implementation by removing complex filtering and service layers
- Consolidate logcat functionality into `Logcat.ts` (containing `LogcatService` class) using `ADB.ts` commands
- Make `BuildVariantService` the source of truth for selected module
- Remove unnecessary services (`AdbService.ts`, `LogcatService.ts`, `LogcatProvider.ts`) and dependencies
- Stream logcat output directly to VS Code output channel without complex filtering
- Make `Logcat.ts` the single source of truth for all logcat functionality and data

### Current State Summary
- **LogcatProvider** (`LogcatProvider.ts`): Manages logcat streaming with complex filters (package, level, tag, PID), wraps LogcatService
- **LogcatService** (`LogcatService.ts`): Handles ADB logcat process management, PID-to-package mapping, filtering logic
- **LogcatService** (`Logcat.ts`): Basic stub implementation, extends Service base class
- **AdbService** (`AdbService.ts`): Provides ADB command execution wrapper
- **manifestParser**: Used to extract package name from AndroidManifest.xml
- **Selected Module**: Currently stored in webview state (`avdSelector.ts`)
- **ApplicationId**: Retrieved from `BuildVariantService` module variants but not used for logcat
- **Commands**: Use `ILogcatProvider` interface, depend on `LogcatProvider` instance

### Goals
- Single `LogcatService` class in `Logcat.ts` that uses `ADB.ts` commands directly
- No filtering logic (remove level, tag, package filters for now)
- `BuildVariantService` stores and manages selected module state
- Use `applicationId` from selected module's variant (already available in `BuildVariantService`)
- Simple logcat flow: selected emulator + applicationId → stream logs
- `Logcat.ts` handles all responsibilities: validation, execution, output channel management, data storage
- Commands use `LogcatService` from `Logcat.ts` directly (no provider wrapper)
- Remove `AdbService.ts`, `LogcatService.ts` (complex one), and `LogcatProvider.ts` entirely

### Non-Goals
- No UI changes to logcat webview
- No new filtering features
- No changes to AVD selection logic
- No changes to build variant selection logic

### Proposed Architecture

#### 1. BuildVariantService as Source of Truth for Selected Module

**Add to BuildVariantService:**
- `selectedModule: string | null` - Currently selected module name
- `selectedVariant: Record<string, string>` - Map of module name to variant name (already exists in workspace state)
- `STORAGE_KEY_MODULE = 'selectedModule'` - Workspace state key
- `STORAGE_KEY_VARIANT = 'android-studio-lite.selectedBuildVariants'` - Already exists

**New Methods:**
- `getSelectedModule(): string | null`
- `setSelectedModule(moduleName: string): Promise<void>`
- `getSelectedModuleApplicationId(): string | null` - Get applicationId from selected module's selected variant
- `onModuleSelectionChanged(cb: (moduleName: string | null) => void): Disposable` - Optional: for reactive updates

**Responsibilities:**
- Persist selected module to workspace state
- Load selected module on initialization
- Provide applicationId for selected module's selected variant
- Default to first module if none selected

#### 2. Refactor Logcat.ts - Single Source of Truth

**Current State:**
- `Logcat.ts` contains a basic `LogcatService` class stub extending `Service`
- Currently has placeholder methods `startLogcat()`, `getSelectedDevice()`, `getResolvedApplicationId()`

**Remove Dependencies:**
- Remove dependency on `AdbService.ts` (delete file entirely)
- Remove dependency on `LogcatService.ts` (delete file entirely - the complex one with filtering)
- Remove dependency on `LogcatProvider.ts` (delete file entirely)
- Remove `manifestParser` usage

**New Implementation in Logcat.ts:**
- Keep `LogcatService` class name (in `Logcat.ts` file)
- Extend `Service` base class (for cache/config access)
- Use `ADBExecutable` from `cmd/ADB.ts` for logcat commands
- Inject `AVDService` for device selection
- Inject `BuildVariantService` for applicationId
- Create and manage VS Code output channel internally
- Handle all validation, execution, lifecycle management, and state
- Store logcat process state internally (running, paused, etc.)

**Core Methods:**
- `start(): Promise<void>` - Start logcat streaming
  - Validate device selected via `AVDService.getSelectedDevice()`
  - Validate module selected via `BuildVariantService.getSelectedModule()`
  - Get selected device ID from `AVDService.getSelectedDeviceId()`
  - Get applicationId from `BuildVariantService.getSelectedModuleApplicationId()`
  - Use `ADBExecutable.exec(Command.logcat, deviceId, applicationId, '*:V')`
  - Stream output to VS Code output channel
  - Show output channel and handle errors
- `stop(): void` - Stop logcat process
- `pause(): void` - Pause logcat (optional, for future use)
- `resume(): void` - Resume logcat (optional, for future use)
- `clear(): void` - Clear output channel
- `isRunning(): boolean` - Check if logcat is active
- `isPaused(): boolean` - Check if logcat is paused (optional)
- `getOutputChannel(): vscode.OutputChannel` - Return output channel
- `setLogLevel(level: LogLevel): void` - Placeholder for future filtering (no-op for now)

**Simplified Flow:**
1. Validate device and module are selected
2. Get selected device ID from `AVDService.getSelectedDeviceId()`
3. Get applicationId from `BuildVariantService.getSelectedModuleApplicationId()`
4. Execute: `adb -s {deviceId} logcat --pid=$(adb -s {deviceId} shell pidof {applicationId}) -v threadtime '*:V'`
5. Stream stdout/stderr to output channel
6. Handle process lifecycle (spawn, kill, error handling)
7. Show user-friendly error messages if validation fails

#### 3. Update Commands to Use LogcatService Directly

**Command Changes:**
- Update `logcatCommands.ts` functions to accept `LogcatService` instead of `ILogcatProvider`
- Update `StartLogcatCommand`, `StopLogcatCommand`, etc. to use `LogcatService` directly
- Remove `ILogcatProvider` interface or replace with `LogcatService` type
- Update `registerCommands.ts` to pass `LogcatService` instead of `LogcatProvider`

**Command Functions:**
- `startLogcatCommand(logcatService: LogcatService): Promise<void>`
- `stopLogcatCommand(logcatService: LogcatService): void`
- `pauseLogcatCommand(logcatService: LogcatService): void`
- `resumeLogcatCommand(logcatService: LogcatService): void`
- `clearLogcatCommand(logcatService: LogcatService): void`
- `setLogLevelCommand(logcatService: LogcatService): Promise<void>` - Placeholder for future

**Extension.ts Changes:**
- Remove `LogcatProvider` initialization
- Resolve `LogcatService` from DI container
- Pass `LogcatService` to `registerCommands` instead of `LogcatProvider`

#### 4. Update Webview Integration

**AVDSelectorProvider Changes:**
- On `select-module` message: Call `BuildVariantService.setSelectedModule(moduleName)`
- Remove module selection state from webview state
- Read selected module from `BuildVariantService` when needed

**avdSelector.ts Changes:**
- Remove `selectedModule` state (read from service via messages)
- On module selection: Send `select-module` message to provider
- Receive `update-modules` with `selectedModule` from provider (derived from service)

**Message Contract:**
- Incoming: `update-modules` includes `selectedModule` from `BuildVariantService`
- Outgoing: `select-module` with `moduleName` updates `BuildVariantService`

#### 5. ADB Command Usage

**Current ADB.ts Command:**
```typescript
[Command.logcat]: {
    command: '{{exe}} -s {{0}} logcat --pid=$(adb -s {{0}} shell pidof {{1}}) -v threadtime {{2}}',
    type: CommandType.spawn,
}
```

**Usage in Logcat.ts (LogcatService class):**
- `{{0}}` = deviceId (from `AVDService`)
- `{{1}}` = applicationId (from `BuildVariantService`)
- `{{2}}` = log level filter (`'*:V'` for verbose, no filtering)

**Note:** The command uses `pidof` to get PID for applicationId, then filters by PID. This is simpler than current multi-method PID detection in `LogcatService.ts`.

### Data Flow

#### Module Selection Flow:
1. User selects module in webview
2. Webview sends `select-module` message
3. `AVDSelectorProvider` calls `BuildVariantService.setSelectedModule()`
4. `BuildVariantService` persists to workspace state
5. Provider sends `update-modules` with updated `selectedModule` to webview

#### Logcat Start Flow:
1. User triggers logcat start (command or webview toggle)
2. Command calls `LogcatService.start()` directly (from `Logcat.ts`)
3. `LogcatService.start()` (in `Logcat.ts`):
   - Validates device selected via `AVDService.getSelectedDevice()`
   - Validates module selected via `BuildVariantService.getSelectedModule()`
   - Gets deviceId from `AVDService.getSelectedDeviceId()`
   - Gets applicationId from `BuildVariantService.getSelectedModuleApplicationId()`
   - Executes ADB logcat command via `ADBExecutable` (from `cmd/ADB.ts`)
   - Streams output to VS Code output channel
   - Shows output channel and handles errors
   - Stores process state internally

### API Changes

#### BuildVariantService
**New:**
- `getSelectedModule(): string | null`
- `setSelectedModule(moduleName: string): Promise<void>`
- `getSelectedModuleApplicationId(): string | null`
- `onModuleSelectionChanged(cb: (moduleName: string | null) => void): Disposable` (optional)

**Storage:**
- Workspace state key: `'selectedModule'`
- Existing: `'android-studio-lite.selectedBuildVariants'` (module → variant mapping)

#### LogcatService (in Logcat.ts)
**File:** `src/service/Logcat.ts`

**New Implementation:**
- `constructor(avdService: AVDService, buildVariantService: BuildVariantService, output: Output)`
- `start(): Promise<void>` - Validates, executes, and streams logcat
- `stop(): void` - Stops logcat process
- `pause(): void` - Pauses logcat (optional, for future)
- `resume(): void` - Resumes logcat (optional, for future)
- `clear(): void` - Clears output channel
- `isRunning(): boolean` - Check if logcat is active
- `isPaused(): boolean` - Check if logcat is paused (optional)
- `getOutputChannel(): vscode.OutputChannel` - Return output channel
- `setLogLevel(level: LogLevel): void` - Placeholder for future filtering (no-op for now)

**Internal State:**
- `logcatProcess: ChildProcess | null` - ADB logcat process instance
- `isPaused: boolean` - Pause state
- `outputChannel: vscode.OutputChannel` - VS Code output channel instance

**Responsibilities:**
- Device and module validation
- ADB command execution via `ADBExecutable` (from `cmd/ADB.ts`)
- Output channel creation and management
- Process lifecycle management (spawn, kill, error handling)
- Error handling and user notifications
- State management (running, paused, etc.)

**Removed Dependencies:**
- `AdbService.ts` - Use `ADBExecutable` directly instead
- `LogcatService.ts` (complex one) - All functionality moved to `Logcat.ts`
- `LogcatProvider.ts` - No wrapper needed, use `LogcatService` directly
- `manifestParser` - Use `applicationId` from `BuildVariantService` instead

**Removed Features (for now):**
- All filtering methods (level, tag, package filters)
- PID-to-package cache
- Package name resolution via manifestParser
- Complex filter application

### Removal Plan

#### Files to Remove:
1. `src/service/AdbService.ts` - Delete entirely, use `ADBExecutable` from `cmd/ADB.ts` directly
2. `src/service/LogcatService.ts` - Delete entirely, functionality moved to `Logcat.ts`
3. `src/providers/LogcatProvider.ts` - Delete entirely, use `LogcatService` from `Logcat.ts` directly

#### Dependencies to Remove:
- `manifestParser` usage from logcat-related code
- `AdbService` from DI container and all consumers
- `LogcatService.ts` (complex one) from DI container
- `LogcatProvider` from DI container and all consumers
- `ILogcatProvider` interface (replace with `LogcatService` type from `Logcat.ts`)

#### Code to Update:
1. `src/di/container.ts` - Remove `AdbService`, `LogcatService.ts`, and `LogcatProvider` registrations; register `LogcatService` from `Logcat.ts`
2. `src/di/types.ts` - Remove `AdbService`, `LogcatService` (old), and `LogcatProvider` symbols; keep `LogcatService` symbol pointing to `Logcat.ts`
3. `src/extension.ts` - Remove `AdbService` and `LogcatProvider` initialization; resolve and use `LogcatService` from `Logcat.ts` directly
4. `src/commands/logcat/logcatCommands.ts` - Update functions to accept `LogcatService` (from `Logcat.ts`) instead of `ILogcatProvider`
5. `src/commands/logcat/*.ts` - Update all command classes to use `LogcatService` from `Logcat.ts` directly
6. `src/commands/registerCommands.ts` - Update to pass `LogcatService` (from `Logcat.ts`) instead of `LogcatProvider`
7. `src/webviews/avdSelectorProvider.ts` - Update module selection handling and logcat toggle to use `LogcatService` from `Logcat.ts`
8. `src/webviews/apps/avdSelector/avdSelector.ts` - Remove module state, use service

### Migration Steps

1. **Add selected module management to BuildVariantService**
   - Add `selectedModule` state and persistence
   - Add `getSelectedModuleApplicationId()` method
   - Load selected module on initialization

2. **Refactor Logcat.ts**
   - Replace stub implementation with full logcat functionality
   - Implement logcat service using `ADBExecutable` from `cmd/ADB.ts`
   - Remove all filtering logic (for now)
   - Add validation for device and module selection
   - Create and manage VS Code output channel internally
   - Stream directly to output channel
   - Handle all error cases and user notifications
   - Store process state internally (running, paused, process instance)

3. **Update Commands**
   - Update `logcatCommands.ts` functions to accept `LogcatService`
   - Update all logcat command classes (`StartLogcatCommand`, `StopLogcatCommand`, etc.)
   - Remove `ILogcatProvider` interface or replace with `LogcatService` type
   - Update `registerCommands.ts` to use `LogcatService`

4. **Update Extension.ts**
   - Remove `LogcatProvider` initialization
   - Resolve `LogcatService` from DI container
   - Pass `LogcatService` to `registerCommands`

5. **Update webview integration**
   - Move module selection to `BuildVariantService`
   - Update message handling in `AVDSelectorProvider`
   - Update logcat toggle to use `LogcatService` directly
   - Update UI to read from service

6. **Remove old services**
   - Delete `src/service/AdbService.ts` file
   - Delete `src/service/LogcatService.ts` file (complex one with filtering)
   - Delete `src/providers/LogcatProvider.ts` file
   - Update DI container to remove all registrations for deleted services

7. **Update DI registrations**
   - Register `LogcatService` from `Logcat.ts` in DI container
   - Remove `AdbService` registration from DI container
   - Remove `LogcatProvider` registration from DI container
   - Remove old `LogcatService.ts` registration from DI container
   - Update `TYPES` to only have `LogcatService` pointing to `Logcat.ts`

### Risks
- Breaking existing logcat functionality if ADB command format is incorrect
- Missing device/module validation causing runtime errors
- Output channel management issues if process lifecycle not handled correctly
- Module selection state loss if persistence not working
- Breaking command interface if `ILogcatProvider` is removed without proper type replacement
- Webview logcat toggle breaking if not updated to use `LogcatService` directly

### Open Questions
- Should logcat auto-start when device/module is selected?
- Should we keep the logcat webview or just use output channel?
- What happens if selected module has no applicationId?
- Should we validate applicationId exists on device before starting logcat?

### Testing Considerations
- Test logcat start/stop with valid device and module
- Test error handling when device/module not selected
- Test module selection persistence across extension restarts
- Test applicationId retrieval from selected module variant
- Test ADB command execution and output streaming
- Test all logcat commands (start, stop, pause, resume, clear) work with `LogcatService` from `Logcat.ts`
- Test webview logcat toggle integration with `LogcatService` from `Logcat.ts`
- Test output channel creation and management in `Logcat.ts`
- Test process lifecycle (spawn, kill, error handling) in `Logcat.ts`
- Verify `AdbService.ts`, `LogcatService.ts`, and `LogcatProvider.ts` are completely removed
- Verify all references point to `LogcatService` from `Logcat.ts` only
