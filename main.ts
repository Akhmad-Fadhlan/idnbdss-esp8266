/***************************************************
 * ESP8266 MakeCode Library - CORE FUNCTIONS
 ***************************************************/
namespace esp8266 {
    // ==================== CORE VARIABLES ====================
    export let esp8266Initialized = false
    export let rxData = ""
    let wifiConnected = false

    // ==================== ERROR HANDLER ====================
    function error(code: number) {
        // debugging & LED dihilangkan
    }

    // ==================== CORE HELPER FUNCTIONS ====================
    /**
     * Send AT command to ESP8266
     */
    //% blockHidden=true
    export function sendCommand(
        command: string,
        expected: string = null,
        timeout: number = 1000
    ): boolean {
        rxData = ""
        serial.readString()
        serial.writeString(command + "\r\n")

        if (expected == null) return true

        let start = input.runningTime()
        while (input.runningTime() - start < timeout) {
            rxData += serial.readString()
            if (rxData.indexOf(expected) >= 0) return true
            if (rxData.indexOf("ERROR") >= 0) return false
        }
        return false
    }

    /**
     * Get response from ESP8266 within timeout
     */
    //% blockHidden=true
    export function getResponse(expected: string = "", timeout: number = 1000): string {
        rxData = ""
        let start = input.runningTime()
        
        while (input.runningTime() - start < timeout) {
            rxData += serial.readString()
            if (expected != "" && rxData.indexOf(expected) >= 0) {
                return rxData
            }
            basic.pause(50)
        }
        return rxData
    }

    /**
     * Check if WiFi is connected
     */
    //% blockHidden=true
    export function isWifiConnected(): boolean {
        return wifiConnected
    }

    /**
     * Set WiFi connection status
     */
    //% blockHidden=true
    export function setWifiConnected(status: boolean) {
        wifiConnected = status
    }

    // ==================== CORE PUBLIC API ====================
    /**
     * Initialize ESP8266 module
     */
    //% weight=100
    //% block="initialize ESP8266|Tx %tx|Rx %rx|Baud %baudrate"
    //% tx.defl=SerialPin.P8
    //% rx.defl=SerialPin.P12
    //% baudrate.defl=BaudRate.BaudRate115200
    export function init(tx: SerialPin, rx: SerialPin, baudrate: BaudRate) {
        serial.redirect(tx, rx, baudrate)
        basic.pause(100)

        // Reset ESP8266
        if (!sendCommand("AT+RST", "ready", 5000)) {
            error(1)
            return
        }

        // Disable echo
        if (!sendCommand("ATE0", "OK")) {
            error(2)
            return
        }

        // Set to station mode
        if (!sendCommand("AT+CWMODE=1", "OK")) {
            error(3)
            return
        }

        esp8266Initialized = true
    }

    /**
     * Connect to WiFi network
     */
    //% weight=95
    //% block="connect to WiFi|SSID %ssid|Password %password"
    //% ssid.defl="YourWiFi"
    //% password.defl="YourPassword"
    export function connectWiFi(ssid: string, password: string): boolean {
        if (!esp8266Initialized) return false

        wifiConnected = false
        
        if (sendCommand(
            "AT+CWJAP=\"" + ssid + "\",\"" + password + "\"",
            "WIFI GOT IP",
            20000
        )) {
            wifiConnected = true
            return true
        }
        
        return false
    }

    /**
     * Check WiFi connection status
     */
    //% weight=90
    //% block="WiFi connected"
    export function isConnected(): boolean {
        return wifiConnected
    }

    /**
     * Disconnect from WiFi
     */
    //% weight=85
    //% block="disconnect WiFi"
    export function disconnectWiFi() {
        sendCommand("AT+CWQAP", "OK")
        wifiConnected = false
    }

    // ==================== ADDITIONAL WIFI BLOCKS ====================
    
    /**
     * Quick WiFi setup and connect
     */
    //% weight=98
    //% block="quick WiFi setup|SSID %ssid|Password %password"
    //% ssid.defl="YourWiFi"
    //% password.defl="YourPassword"
    export function quickWifiSetup(ssid: string, password: string): boolean {
        init(SerialPin.P8, SerialPin.P12, BaudRate.BaudRate115200)
        basic.pause(1000)
        return connectWiFi(ssid, password)
    }

    /**
     * WiFi is connected (boolean block)
     */
    //% weight=89
    //% block="WiFi is connected"
    export function wifiIsConnected(): boolean {
        return wifiConnected
    }

    /**
     * WiFi is disconnected (boolean block)
     */
    //% weight=88
    //% block="WiFi is disconnected"
    export function wifiIsDisconnected(): boolean {
        return !wifiConnected
    }

    /**
     * Get WiFi IP address
     */
    //% weight=84
    //% block="get WiFi IP address"
    export function getIPAddress(): string {
        if (!esp8266Initialized) return ""
        
        sendCommand("AT+CIFSR", "OK", 2000)
        
        let ip = ""
        let staipIndex = rxData.indexOf("STAIP,\"")
        if (staipIndex >= 0) {
            let start = staipIndex + 7
            let end = rxData.indexOf("\"", start)
            if (end > start) {
                ip = rxData.substr(start, end - start)
            }
        }
        
        return ip
    }

    /**
     * Get WiFi signal strength (RSSI)
     */
    //% weight=83
    //% block="WiFi signal strength"
    export function getSignalStrength(): number {
        if (!esp8266Initialized) return 0
        if (!wifiConnected) return 0
        
        sendCommand("AT+CWJAP?", "OK", 2000)
        
        // Find RSSI value (search from end manually)
        let rssiIndex = -1
        for (let i = rxData.length - 1; i >= 0; i--) {
            if (rxData.charAt(i) == "-" && i > 0 && rxData.charAt(i-1) == ",") {
                rssiIndex = i - 1
                break
            }
        }
        
        if (rssiIndex >= 0) {
            let rssiStr = rxData.substr(rssiIndex + 2, 2)
            let rssi = 0
            for (let i = 0; i < rssiStr.length; i++) {
                let char = rssiStr.charAt(i)
                if (char >= "0" && char <= "9") {
                    rssi = rssi * 10 + (char.charCodeAt(0) - 48)
                }
            }
            return -rssi
        }
        
        return 0
    }

    /**
     * Show WiFi status on LED
     */
    //% weight=82
    //% block="show WiFi status on LED"
    export function showWifiStatus() {
        if (wifiConnected) {
            basic.showIcon(IconNames.Yes)
        } else {
            basic.showIcon(IconNames.No)
        }
    }

    /**
     * Show connecting animation
     */
    //% weight=81
    //% block="show connecting animation"
    export function showConnecting() {
        basic.showIcon(IconNames.SmallDiamond)
        basic.pause(200)
        basic.showIcon(IconNames.Diamond)
        basic.pause(200)
    }

    // ==================== UTILITY BLOCKS ====================

    /**
     * Get last response data
     */
    //% weight=70
    //% block="get last response"
    export function getLastResponse(): string {
        return rxData
    }

    /**
     * Check if response contains text
     */
    //% weight=69
    //% block="response contains %text"
    //% text.defl="OK"
    export function responseContains(text: string): boolean {
        return rxData.indexOf(text) >= 0
    }

    /**
     * Clear response buffer
     */
    //% weight=68
    //% block="clear response buffer"
    export function clearResponseBuffer() {
        rxData = ""
        serial.readString()
    }

    /**
     * Wait for seconds
     */
    //% weight=67
    //% block="wait %seconds seconds"
    //% seconds.defl=1
    export function waitSeconds(seconds: number) {
        basic.pause(seconds * 1000)
    }

    /**
     * Extract JSON value from string by key
     */
    //% weight=66
    //% block="extract JSON value|key %key|from %jsonStr"
    //% key.defl="temperature"
    //% jsonStr.defl='{"temperature":25}'
    export function extractJsonValue(key: string, jsonStr: string): string {
        let searchKey = "\"" + key + "\":"
        let keyIndex = jsonStr.indexOf(searchKey)
        if (keyIndex < 0) return ""
        
        let valueStart = keyIndex + searchKey.length
        let valueStr = jsonStr.substr(valueStart)
        
        // Skip whitespace
        while (valueStr.length > 0 && (valueStr.charAt(0) == " " || valueStr.charAt(0) == "\t")) {
            valueStr = valueStr.substr(1)
        }
        
        if (valueStr.length == 0) return ""
        
        // Check if string value
        if (valueStr.charAt(0) == "\"") {
            valueStr = valueStr.substr(1)
            let endQuote = valueStr.indexOf("\"")
            if (endQuote >= 0) {
                return valueStr.substr(0, endQuote)
            }
        } else {
            // Number or boolean
            let result = ""
            for (let i = 0; i < valueStr.length; i++) {
                let char = valueStr.charAt(i)
                if (char == "," || char == "}" || char == " ") {
                    break
                }
                result += char
            }
            return result
        }
        
        return ""
    }

    /**
     * Convert string to number
     */
    //% weight=65
    //% block="convert to number %text"
    //% text.defl="123"
    export function stringToNumber(text: string): number {
        let result = 0
        let isNegative = false
        let hasDecimal = false
        let decimalPlace = 0
        
        for (let i = 0; i < text.length; i++) {
            let char = text.charAt(i)
            
            if (char == "-" && i == 0) {
                isNegative = true
            } else if (char == ".") {
                hasDecimal = true
            } else if (char >= "0" && char <= "9") {
                let digit = char.charCodeAt(0) - 48
                
                if (hasDecimal) {
                    decimalPlace++
                    result = result + digit / Math.pow(10, decimalPlace)
                } else {
                    result = result * 10 + digit
                }
            }
        }
        
        return isNegative ? -result : result
    }
}
