// shims.d.ts
// Type declarations for shared functions across files

declare namespace esp8266 {
    // Core variables
    let esp8266Initialized: boolean
    let rxData: string
    
    // Core functions (declared in main.ts, used in other files)
    function error(code: number): void
    function sendCommand(command: string, expected?: string, timeout?: number): boolean
    function getResponse(terminator?: string, timeout?: number): string
    function isWifiConnected(): boolean
    
    // Firebase variables (used in firebase.ts)
    let firebaseApiKey: string
    let firebaseDatabaseURL: string
    let firebaseProjectId: string
    let firebasePath: string
    let firebaseDataSent: boolean
}
