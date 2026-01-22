/**
 * Support for Firebase Realtime Database.
 * Firebase functions only - No duplicate core functions
 */
namespace esp8266 {
    // ==================== FIREBASE VARIABLES ====================
    // Firebase-specific variables (different from core variables)
    //% blockHidden=true
    export let firebaseApiKey = ""
    //% blockHidden=true
    export let firebaseDatabaseURL = ""
    //% blockHidden=true
    export let firebaseProjectId = ""
    //% blockHidden=true
    export let firebasePath = "iot" // Default path
    //% blockHidden=true
    export let firebaseDataSent = false

    // ==================== FIREBASE HELPER FUNCTIONS ====================
    // Helper: Extract host from Firebase URL
    function extractHost(url: string): string {
        let host = url
        if (host.includes("https://")) {
            host = host.substr(8)
        }
        if (host.includes("http://")) {
            host = host.substr(7)
        }
        if (host.charAt(host.length - 1) == "/") {
            host = host.substr(0, host.length - 1)
        }
        return host
    }

    // Helper: Clean path (remove leading slash)
    function cleanPath(path: string): string {
        if (path.charAt(0) == "/") {
            return path.substr(1)
        }
        return path
    }

    // Helper: Extract JSON body from HTTP response
    function extractJsonFromResponse(response: string): string {
        // Find +IPD marker
        let ipdIndex = response.indexOf("+IPD")
        if (ipdIndex == -1) return ""

        // Find colon after +IPD (marks start of HTTP response)
        let colonIndex = response.indexOf(":", ipdIndex)
        if (colonIndex == -1) return ""

        // Get everything after the colon
        let httpData = response.substr(colonIndex + 1)

        // Find HTTP body (after headers)
        let bodyStart = httpData.indexOf("\r\n\r\n")
        if (bodyStart != -1) {
            httpData = httpData.substr(bodyStart + 4)
        } else {
            // Alternative: find first { if no clear header separation
            let jsonStart = httpData.indexOf("{")
            if (jsonStart != -1) {
                httpData = httpData.substr(jsonStart)
            }
        }

        // Check if response is null
        if (httpData.includes("null")) return "null"

        // Find JSON object start
        let braceIndex = httpData.indexOf("{")
        if (braceIndex == -1) return ""

        return httpData.substr(braceIndex)
    }

    // Helper: Extract value from JSON string
    function extractValueFromJson(jsonData: string): string {
        if (jsonData == "" || jsonData == "null") return ""

        // Look for "value": field
        let valueIndex = jsonData.indexOf("\"value\"")
        if (valueIndex == -1) return ""

        // Find the colon after "value"
        let colonIndex = jsonData.indexOf(":", valueIndex)
        if (colonIndex == -1) return ""

        // Start after the colon
        let startIndex = colonIndex + 1
        let valueStr = jsonData.substr(startIndex)

        // Skip whitespace
        while (valueStr.length > 0 && (valueStr.charAt(0) == " " || valueStr.charAt(0) == "\t" || valueStr.charAt(0) == "\r" || valueStr.charAt(0) == "\n")) {
            valueStr = valueStr.substr(1)
        }

        if (valueStr.length == 0) return ""

        // Determine if value is string or number
        let firstChar = valueStr.charAt(0)
        let endIndex = 0

        if (firstChar == "\"") {
            // String value - find closing quote
            valueStr = valueStr.substr(1)
            endIndex = valueStr.indexOf("\"")
            if (endIndex == -1) endIndex = valueStr.length
            return valueStr.substr(0, endIndex)
        } else {
            // Number or boolean - find delimiter
            for (let i = 0; i < valueStr.length; i++) {
                let char = valueStr.charAt(i)
                if (char == "," || char == "}" || char == " " || char == "\r" || char == "\n" || char == "\t") {
                    endIndex = i
                    break
                }
            }
            if (endIndex == 0) endIndex = valueStr.length

            let result = valueStr.substr(0, endIndex)
            // Trim any remaining whitespace
            while (result.length > 0 && (result.charAt(result.length - 1) == " " || result.charAt(result.length - 1) == "\r" || result.charAt(result.length - 1) == "\n")) {
                result = result.substr(0, result.length - 1)
            }
            return result
        }
    }

    // Helper: Parse string to number
    function parseStringToNumber(valueStr: string): number {
        // Parse string to number
        let result = 0
        let isNegative = false
        let hasDecimal = false
        let decimalPlace = 0

        for (let i = 0; i < valueStr.length; i++) {
            let char = valueStr.charAt(i)

            if (char == "-" && i == 0) {
                isNegative = true
            } else if (char == ".") {
                hasDecimal = true
            } else if (char >= "0" && char <= "9") {
                let digit = char.charCodeAt(0) - 48  // ASCII '0' = 48

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

    // ==================== FIREBASE PUBLIC API ====================
    /**
     * Configure Firebase parameters.
     */
    //% subcategory="Firebase"
    //% weight=30
    //% blockGap=8
    //% blockId=esp8266_configure_firebase
    //% block="Firebase config|API Key %apiKey|URL %databaseURL|Project ID %projectId"
    //% apiKey.defl="your-api-key"
    //% databaseURL.defl="https://your-project.firebaseio.com"
    //% projectId.defl="your-project"
    export function configureFirebase(apiKey: string, databaseURL: string, projectId: string) {
        firebaseApiKey = apiKey
        firebaseDatabaseURL = databaseURL
        firebaseProjectId = projectId
    }

    /**
     * Set Firebase path where all data will be sent.
     */
    //% subcategory="Firebase"
    //% weight=28
    //% blockGap=8
    //% blockId=esp8266_set_firebase_path
    //% block="set Firebase path %path"
    //% path.defl="iot"
    export function setFirebasePath(path: string) {
        firebasePath = path
    }

    /**
     * Read device value from Firebase.
     */
    //% subcategory="Firebase"
    //% weight=27
    //% blockGap=40
    //% blockId=esp8266_read_firebase_value
    //% block="Firebase read value of %deviceName"
    //% deviceName.defl="temperature"
    export function readFirebaseValue(deviceName: string): number {
        // Validate WiFi connection
        if (!isWifiConnected()) return 0

        // Validate Firebase configuration
        if (firebaseDatabaseURL == "" || firebaseApiKey == "") return 0

        // Build full path
        let fullPath = cleanPath(firebasePath + "/" + deviceName)
        let host = extractHost(firebaseDatabaseURL)

        // Connect to Firebase via SSL
        if (!sendCommand("AT+CIPSTART=\"SSL\",\"" + host + "\",443", "OK", 3000)) {
            return 0
        }

        // Build GET request
        let requestPath = "/" + fullPath + ".json?auth=" + firebaseApiKey
        let httpRequest = "GET " + requestPath + " HTTP/1.1\r\n"
        httpRequest += "Host: " + host + "\r\n"
        httpRequest += "Connection: close\r\n"
        httpRequest += "\r\n"

        // Send request
        if (!sendCommand("AT+CIPSEND=" + httpRequest.length, "OK")) {
            sendCommand("AT+CIPCLOSE", "OK", 1000)
            return 0
        }

        sendCommand(httpRequest, null, 100)

        // Wait for response
        let response = getResponse("", 1500)

        // Close connection
        sendCommand("AT+CIPCLOSE", "OK", 500)

        // Validate response
        if (response == "") return 0

        // Extract JSON from HTTP response
        let jsonData = extractJsonFromResponse(response)
        if (jsonData == "" || jsonData == "null") return 0

        // Extract value field from JSON as STRING
        let valueStr = extractValueFromJson(jsonData)
        if (valueStr == "") return 0

        // Parse string to number
        return parseStringToNumber(valueStr)
    }

    /**
     * Read device value from Firebase as NUMBER.
     */
    //% subcategory="Firebase"
    //% weight=26
    //% blockGap=40
    //% blockId=esp8266_read_firebase_number
    //% block="Firebase read NUMBER of %deviceName"
    //% deviceName.defl="temperature"
    export function readFirebaseNumber(deviceName: string): number {
        return readFirebaseValue(deviceName)
    }

    /**
     * Send data to Firebase Realtime Database.
     */
    //% blockHidden=true
    //% blockId=esp8266_send_firebase_data
    export function sendFirebaseData(path: string, jsonData: string) {
        firebaseDataSent = false

        // Validate WiFi connection
        if (!isWifiConnected()) return

        // Validate Firebase configuration
        if (firebaseDatabaseURL == "" || firebaseApiKey == "") return

        // Clean path and extract host
        path = cleanPath(path)
        let host = extractHost(firebaseDatabaseURL)

        // Connect to Firebase
        if (!sendCommand("AT+CIPSTART=\"SSL\",\"" + host + "\",443", "OK", 3000)) {
            return
        }

        // Build PATCH request (updates without overwriting)
        let requestPath = "/" + path + ".json?auth=" + firebaseApiKey
        let httpRequest = "PATCH " + requestPath + " HTTP/1.1\r\n"
        httpRequest += "Host: " + host + "\r\n"
        httpRequest += "Content-Type: application/json\r\n"
        httpRequest += "Content-Length: " + jsonData.length + "\r\n"
        httpRequest += "Connection: close\r\n"
        httpRequest += "\r\n"
        httpRequest += jsonData

        // Send request
        if (!sendCommand("AT+CIPSEND=" + httpRequest.length, "OK")) {
            sendCommand("AT+CIPCLOSE", "OK", 1000)
            return
        }

        sendCommand(httpRequest, null, 100)

        // Wait for SEND OK
        if (getResponse("SEND OK", 1500) == "") {
            sendCommand("AT+CIPCLOSE", "OK", 500)
            return
        }

        // Check response status
        let response = getResponse("", 1500)

        // Check if response contains 200 OK
        if (response != "" && response.includes("200")) {
            firebaseDataSent = true
        }

        // Close connection
        sendCommand("AT+CIPCLOSE", "OK", 500)
    }

    /**
     * Return true if last data sent successfully.
     */
    //% subcategory="Firebase"
    //% weight=24
    //% blockId=esp8266_is_firebase_data_sent
    //% block="Firebase data sent"
    export function isFirebaseDataSent(): boolean {
        return firebaseDataSent
    }

    /**
     * Send SWITCH data to Firebase.
     */
    //% subcategory="Firebase"
    //% weight=29
    //% blockGap=8
    //% blockId=esp8266_firebase_switch
    //% block="Firebase send SWITCH|name %deviceName|value %value"
    //% value.min=0 value.max=1
    //% deviceName.defl="lampu"
    export function firebaseSendSwitch(deviceName: string, value: number) {
        let val = value == 1 ? 1 : 0
        let json = "{\"" + deviceName + "\":{\"tipe\":\"switch\",\"value\":" + val + "}}"
        sendFirebaseData(firebasePath, json)
    }

    /**
     * Send DIMMER data to Firebase.
     */
    //% subcategory="Firebase"
    //% weight=26
    //% blockGap=8
    //% blockId=esp8266_firebase_dimmer
    //% block="Firebase send DIMMER|name %deviceName|value %value"
    //% value.min=0 value.max=1024
    //% deviceName.defl="lampu"
    export function firebaseSendDimmer(deviceName: string, value: number) {
        let json = "{\"" + deviceName + "\":{\"tipe\":\"dimmer\",\"value\":" + value + ",\"batas_atas\":1024}}"
        sendFirebaseData(firebasePath, json)
    }

    /**
     * Send SENSOR reading to Firebase.
     */
    //% subcategory="Firebase"
    //% weight=25
    //% blockGap=40
    //% blockId=esp8266_firebase_sensor
    //% block="Firebase send SENSOR|name %deviceName|value %value|unit %unit"
    //% value.defl=0
    //% unit.defl="C"
    //% deviceName.defl="suhu"
    export function firebaseSendSensor(deviceName: string, value: number, unit: string) {
        let json = "{\"" + deviceName + "\":{\"tipe\":\"sensor\",\"value\":" + value + ",\"satuan\":\"" + unit + "\"}}"
        sendFirebaseData(firebasePath, json)
    }
}
