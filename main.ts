/***************************************************
 * ESP8266 MakeCode Library - Main File
 * Organized with separate namespaces
 ***************************************************/

// ==================================================
// CORE FUNCTIONS - Shared by all modules
// ==================================================

namespace esp8266.core {
    //% blockHidden=true
    export let esp8266Initialized = false
    //% blockHidden=true
    export let rxData = ""
    
    // Internal function - not exposed as block
    export function error(code: number): void {
        // debugging & LED dihilangkan
    }

    //% blockHidden=true
    //% block="send AT command %command expect %expected timeout %timeout"
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
            basic.pause(10)
        }
        return false
    }

    //% blockHidden=true
    export function getResponse(terminator: string = "", timeout: number = 2000): string {
        let response = ""
        let start = input.runningTime()
        
        while (input.runningTime() - start < timeout) {
            response += serial.readString()
            if (terminator != "" && response.indexOf(terminator) >= 0) {
                return response
            }
            basic.pause(50)
        }
        return response
    }

    //% blockHidden=true
    export function isWifiConnected(): boolean {
        return sendCommand("AT+CWJAP?", "WIFI GOT IP", 1000)
    }

    //% weight=100
    //% block="initialize ESP8266|Tx %tx Rx %rx Baud %baudrate"
    //% tx.defl=SerialPin.P0
    //% rx.defl=SerialPin.P1
    //% baudrate.defl=BaudRate.BaudRate115200
    export function init(tx: SerialPin, rx: SerialPin, baudrate: BaudRate): void {
        serial.redirect(tx, rx, baudrate)
        basic.pause(500)

        if (!sendCommand("AT+RST", "ready", 5000)) {
            error(1)
            return
        }
        
        if (!sendCommand("ATE0", "OK", 2000)) {
            error(2)
            return
        }
        
        if (!sendCommand("AT+CWMODE=1", "OK", 2000)) {
            error(3)
            return
        }

        esp8266Initialized = true
    }

    //% weight=95
    //% block="connect to WiFi|SSID %ssid Password %password"
    //% ssid.defl="YourWiFi"
    //% password.defl="YourPassword"
    export function connectWiFi(ssid: string, password: string): boolean {
        if (!esp8266Initialized) return false
        
        return sendCommand(
            "AT+CWJAP=\"" + ssid + "\",\"" + password + "\"",
            "WIFI GOT IP",
            20000
        )
    }
}

// ==================================================
// HTTP CLIENT FUNCTIONS
// ==================================================

namespace esp8266.http {
    //% weight=90
    //% block="HTTP GET from|Server IP %serverIp Path %path"
    //% serverIp.defl="192.168.1.100"
    //% path.defl="/api/data"
    export function get(serverIp: string, path: string): string {
        if (!esp8266.core.esp8266Initialized) return ""

        esp8266.core.rxData = ""
        serial.readString()

        // TCP Connection
        if (!esp8266.core.sendCommand(
            "AT+CIPSTART=\"TCP\",\"" + serverIp + "\",80",
            "CONNECT",
            8000
        )) return ""

        let httpRequest =
            "GET " + path + " HTTP/1.1\r\n" +
            "Host: " + serverIp + "\r\n" +
            "Connection: close\r\n\r\n"

        if (!esp8266.core.sendCommand("AT+CIPSEND=" + (httpRequest.length + 2), ">", 5000)) {
            esp8266.core.sendCommand("AT+CIPCLOSE")
            return ""
        }

        serial.writeString(httpRequest)

        let start = input.runningTime()
        while (input.runningTime() - start < 8000) {
            esp8266.core.rxData += serial.readString()
            basic.pause(200)
        }

        esp8266.core.sendCommand("AT+CIPCLOSE")
        
        // Extract body from HTTP response
        let response = esp8266.core.rxData
        let bodyStart = response.indexOf("\r\n\r\n")
        if (bodyStart >= 0) {
            return response.substr(bodyStart + 4)
        }
        return response
    }

    //% weight=85
    //% block="HTTP POST to|Server IP %serverIp Path %path Data %data"
    //% serverIp.defl="192.168.1.100"
    //% path.defl="/api/post"
    //% data.defl="{\"value\":123}"
    export function post(serverIp: string, path: string, data: string): string {
        if (!esp8266.core.esp8266Initialized) return ""

        esp8266.core.rxData = ""
        serial.readString()

        // TCP Connection
        if (!esp8266.core.sendCommand(
            "AT+CIPSTART=\"TCP\",\"" + serverIp + "\",80",
            "CONNECT",
            8000
        )) return ""

        let httpRequest =
            "POST " + path + " HTTP/1.1\r\n" +
            "Host: " + serverIp + "\r\n" +
            "Content-Type: application/json\r\n" +
            "Content-Length: " + data.length + "\r\n" +
            "Connection: close\r\n\r\n" +
            data

        if (!esp8266.core.sendCommand("AT+CIPSEND=" + httpRequest.length, ">", 5000)) {
            esp8266.core.sendCommand("AT+CIPCLOSE")
            return ""
        }

        serial.writeString(httpRequest)

        let start = input.runningTime()
        while (input.runningTime() - start < 8000) {
            esp8266.core.rxData += serial.readString()
            basic.pause(200)
        }

        esp8266.core.sendCommand("AT+CIPCLOSE")
        
        // Extract body from HTTP response
        let response = esp8266.core.rxData
        let bodyStart = response.indexOf("\r\n\r\n")
        if (bodyStart >= 0) {
            return response.substr(bodyStart + 4)
        }
        return response
    }

    //% weight=80
    //% block="send data to server|IP %serverIp Data %data"
    //% serverIp.defl="192.168.1.100"
    export function sendToServer(serverIp: string, data: string): void {
        if (!esp8266.core.esp8266Initialized) return

        // TCP Connection
        if (!esp8266.core.sendCommand(
            "AT+CIPSTART=\"TCP\",\"" + serverIp + "\",80",
            "CONNECT",
            8000
        )) return

        let httpRequest =
            "GET /tes.php?" + data + " HTTP/1.1\r\n" +
            "Host: " + serverIp + "\r\n" +
            "Connection: close\r\n\r\n"

        let len = httpRequest.length

        if (!esp8266.core.sendCommand("AT+CIPSEND=" + len, ">", 5000)) {
            esp8266.core.sendCommand("AT+CIPCLOSE")
            return
        }

        serial.writeString(httpRequest)
        basic.pause(4000)
        esp8266.core.sendCommand("AT+CIPCLOSE")
    }
}

// ==================================================
// FIREBASE FUNCTIONS (Simplified Interface)
// ==================================================

namespace esp8266.firebase {
    let apiKey = ""
    let databaseURL = ""
    let projectId = ""
    let basePath = "iot"

    //% weight=70
    //% block="configure Firebase|API Key %apiKeyParam Database URL %databaseUrlParam"
    //% apiKeyParam.defl="your-api-key"
    //% databaseUrlParam.defl="https://your-project.firebaseio.com"
    export function configure(apiKeyParam: string, databaseUrlParam: string): void {
        apiKey = apiKeyParam
        databaseURL = databaseUrlParam
    }

    //% weight=69
    //% block="set Firebase path %path"
    //% path.defl="iot"
    export function setPath(path: string): void {
        basePath = path
    }

    //% weight=68
    //% block="Firebase write|Device %deviceName Value %value"
    //% deviceName.defl="temperature"
    export function write(deviceName: string, value: number): void {
        if (!esp8266.core.isWifiConnected()) return
        if (databaseURL == "" || apiKey == "") return

        // Extract host
        let host = databaseURL
        if (host.includes("https://")) {
            host = host.substr(8)
        }
        if (host.charAt(host.length - 1) == "/") {
            host = host.substr(0, host.length - 1)
        }

        // Connect via SSL
        if (!esp8266.core.sendCommand("AT+CIPSTART=\"SSL\",\"" + host + "\",443", "OK", 3000)) {
            return
        }

        // Build PATCH request
        let jsonData = "{\"" + deviceName + "\":" + value + "}"
        let requestPath = "/" + basePath + ".json?auth=" + apiKey
        let httpRequest = "PATCH " + requestPath + " HTTP/1.1\r\n"
        httpRequest += "Host: " + host + "\r\n"
        httpRequest += "Content-Type: application/json\r\n"
        httpRequest += "Content-Length: " + jsonData.length + "\r\n"
        httpRequest += "Connection: close\r\n\r\n"
        httpRequest += jsonData

        if (!esp8266.core.sendCommand("AT+CIPSEND=" + httpRequest.length, "OK")) {
            esp8266.core.sendCommand("AT+CIPCLOSE")
            return
        }

        serial.writeString(httpRequest)
        basic.pause(2000)
        esp8266.core.sendCommand("AT+CIPCLOSE")
    }

    //% weight=67
    //% block="Firebase read|Device %deviceName"
    //% deviceName.defl="temperature"
    export function read(deviceName: string): number {
        if (!esp8266.core.isWifiConnected()) return 0
        if (databaseURL == "" || apiKey == "") return 0

        // Extract host
        let host = databaseURL
        if (host.includes("https://")) {
            host = host.substr(8)
        }
        if (host.charAt(host.length - 1) == "/") {
            host = host.substr(0, host.length - 1)
        }

        // Connect via SSL
        if (!esp8266.core.sendCommand("AT+CIPSTART=\"SSL\",\"" + host + "\",443", "OK", 3000)) {
            return 0
        }

        // Build GET request
        let requestPath = "/" + basePath + "/" + deviceName + ".json?auth=" + apiKey
        let httpRequest = "GET " + requestPath + " HTTP/1.1\r\n"
        httpRequest += "Host: " + host + "\r\n"
        httpRequest += "Connection: close\r\n\r\n"

        if (!esp8266.core.sendCommand("AT+CIPSEND=" + httpRequest.length, "OK")) {
            esp8266.core.sendCommand("AT+CIPCLOSE")
            return 0
        }

        serial.writeString(httpRequest)
        
        let response = esp8266.core.getResponse("", 3000)
        esp8266.core.sendCommand("AT+CIPCLOSE")

        // Simple JSON parsing
        let valueStart = response.indexOf("\"value\":")
        if (valueStart < 0) return 0
        
        let valueStr = response.substr(valueStart + 8)
        let endIndex = valueStr.indexOf("}")
        if (endIndex > 0) valueStr = valueStr.substr(0, endIndex)
        
        endIndex = valueStr.indexOf(",")
        if (endIndex > 0) valueStr = valueStr.substr(0, endIndex)
        
        return parseFloat(valueStr)
    }

    //% weight=66
    //% block="Firebase send sensor|Name %name Value %value Unit %unit"
    //% name.defl="temperature"
    //% unit.defl="C"
    export function sendSensor(name: string, value: number, unit: string): void {
        write(name + "_value", value)
        write(name + "_unit", parseFloat('"' + unit + '"')) // Store unit as reference
    }
}

// ==================================================
// CONVENIENCE FUNCTIONS (Legacy Support)
// ==================================================

namespace esp8266 {
    // Legacy functions for backward compatibility
    
    //% weight=60
    //% block="get raw data from server|IP %serverIp WiFi %ssid Pass %password Path %path"
    //% deprecated=true
    export function getRawFromServer(
        serverIp: string,
        ssid: string,
        password: string,
        path: string
    ): string {
        esp8266.core.connectWiFi(ssid, password)
        return esp8266.http.get(serverIp, path)
    }

    //% weight=59
    //% block="send to server|IP %serverIp WiFi %ssid Pass %password Data %data"
    //% deprecated=true
    export function sendToServerOld(
        serverIp: string,
        ssid: string,
        password: string,
        data: string
    ): void {
        esp8266.core.connectWiFi(ssid, password)
        esp8266.http.sendToServer(serverIp, data)
    }
}

// ==================================================
// EXPORT ALL NAMESPACES
// ==================================================

// Ekspor untuk external access
export {
    esp8266,
    esp8266 as core,
    esp8266 as http,
    esp8266 as firebase
}
