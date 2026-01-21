/***************************************************
 * ESP8266 MakeCode Library - COMPLETE HTTP/HTTPS
 * Support: GET, POST, PUT, DELETE for HTTP & HTTPS
 ***************************************************/

namespace esp8266 {
    
    // ==================== HELPER FUNCTIONS ====================
    
    /**
     * Parse URL and determine protocol
     */
    //% blockHidden=true
    export function parseUrl(url: string): {host: string, path: string, isHttps: boolean, port: number} {
        let isHttps = false
        let host = url
        let port = 80
        
        // Check protocol
        if (host.indexOf("https://") >= 0) {
            isHttps = true
            port = 443
            host = host.substr(8)
        } else if (host.indexOf("http://") >= 0) {
            host = host.substr(7)
        }
        
        // Extract path
        let slashIndex = host.indexOf("/")
        let path = "/"
        if (slashIndex >= 0) {
            path = host.substr(slashIndex)
            host = host.substr(0, slashIndex)
        }
        
        // Check for custom port
        let colonIndex = host.indexOf(":")
        if (colonIndex >= 0) {
            let portStr = host.substr(colonIndex + 1)
            host = host.substr(0, colonIndex)
            // Parse port (simple implementation)
            port = 0
            for (let i = 0; i < portStr.length; i++) {
                let char = portStr.charAt(i)
                if (char >= "0" && char <= "9") {
                    port = port * 10 + (char.charCodeAt(0) - 48)
                }
            }
        }
        
        return {host: host, path: path, isHttps: isHttps, port: port}
    }
    
    /**
     * Core HTTP request function
     */
    //% blockHidden=true
    export function httpRequest(
        method: string,
        url: string, 
        body: string = "",
        contentType: string = "application/json"
    ): string {
        if (!esp8266Initialized) return ""
        if (!isWifiConnected()) return ""
        
        // Parse URL
        let urlInfo = parseUrl(url)
        
        rxData = ""
        serial.readString()

        // Connect (TCP or SSL)
        let connectionType = urlInfo.isHttps ? "SSL" : "TCP"
        let connectCmd = "AT+CIPSTART=\"" + connectionType + "\",\"" + 
                        urlInfo.host + "\"," + urlInfo.port
        
        if (!sendCommand(connectCmd, "CONNECT", 10000)) {
            return ""
        }

        // Build HTTP request
        let httpRequest = method + " " + urlInfo.path + " HTTP/1.1\r\n"
        httpRequest += "Host: " + urlInfo.host + "\r\n"
        
        // Add body if present (POST, PUT, PATCH)
        if (body != "") {
            httpRequest += "Content-Type: " + contentType + "\r\n"
            httpRequest += "Content-Length: " + body.length + "\r\n"
        }
        
        httpRequest += "Connection: close\r\n\r\n"
        
        if (body != "") {
            httpRequest += body
        }
        
        // Send request
        if (!sendCommand("AT+CIPSEND=" + httpRequest.length, ">", 5000)) {
            sendCommand("AT+CIPCLOSE")
            return ""
        }

        serial.writeString(httpRequest)
        
        // Wait for response
        let start = input.runningTime()
        let timeout = urlInfo.isHttps ? 12000 : 8000
        while (input.runningTime() - start < timeout) {
            rxData += serial.readString()
            basic.pause(200)
        }

        sendCommand("AT+CIPCLOSE")
        return rxData
    }
    
    // ==================== HTTP GET ====================
    
    /**
     * HTTP/HTTPS GET request
     */
    //% weight=90
    //% subcategory="HTTP"
    //% block="HTTP GET|URL %url"
    //% url.defl="http://192.168.1.100/api/data"
    export function httpGet(url: string): string {
        return httpRequest("GET", url)
    }
    
    /**
     * HTTP/HTTPS GET with custom path
     */
    //% weight=85
    //% subcategory="HTTP"
    //% block="HTTP GET|host %host|path %path|HTTPS %useHttps"
    //% host.defl="192.168.1.100"
    //% path.defl="/api/data"
    //% useHttps.defl=false
    export function httpGetCustom(host: string, path: string, useHttps: boolean): string {
        let protocol = useHttps ? "https://" : "http://"
        return httpRequest("GET", protocol + host + path)
    }
    
    // ==================== HTTP POST ====================
    
    /**
     * HTTP/HTTPS POST request
     */
    //% weight=80
    //% subcategory="HTTP"
    //% block="HTTP POST|URL %url|body %body"
    //% url.defl="http://192.168.1.100/api/data"
    //% body.defl='{"temp":25}'
    export function httpPost(url: string, body: string): string {
        return httpRequest("POST", url, body)
    }
    
    /**
     * HTTP/HTTPS POST with custom content type
     */
    //% weight=75
    //% subcategory="HTTP"
    //% block="HTTP POST|URL %url|body %body|type %contentType"
    //% url.defl="http://192.168.1.100/api/data"
    //% body.defl='{"temp":25}'
    //% contentType.defl="application/json"
    export function httpPostCustom(url: string, body: string, contentType: string): string {
        return httpRequest("POST", url, body, contentType)
    }
    
    // ==================== HTTP PUT ====================
    
    /**
     * HTTP/HTTPS PUT request
     */
    //% weight=70
    //% subcategory="HTTP"
    //% block="HTTP PUT|URL %url|body %body"
    //% url.defl="http://192.168.1.100/api/data/1"
    //% body.defl='{"temp":30}'
    export function httpPut(url: string, body: string): string {
        return httpRequest("PUT", url, body)
    }
    
    /**
     * HTTP/HTTPS PUT with custom content type
     */
    //% weight=65
    //% subcategory="HTTP"
    //% block="HTTP PUT|URL %url|body %body|type %contentType"
    //% url.defl="http://192.168.1.100/api/data/1"
    //% body.defl='{"temp":30}'
    //% contentType.defl="application/json"
    export function httpPutCustom(url: string, body: string, contentType: string): string {
        return httpRequest("PUT", url, body, contentType)
    }
    
    // ==================== HTTP DELETE ====================
    
    /**
     * HTTP/HTTPS DELETE request
     */
    //% weight=60
    //% subcategory="HTTP"
    //% block="HTTP DELETE|URL %url"
    //% url.defl="http://192.168.1.100/api/data/1"
    export function httpDelete(url: string): string {
        return httpRequest("DELETE", url)
    }
    
    /**
     * HTTP/HTTPS DELETE with body
     */
    //% weight=55
    //% subcategory="HTTP"
    //% block="HTTP DELETE|URL %url|body %body"
    //% url.defl="http://192.168.1.100/api/data/1"
    //% body.defl='{"confirm":true}'
    export function httpDeleteWithBody(url: string, body: string): string {
        return httpRequest("DELETE", url, body)
    }
    
    // ==================== HTTP PATCH ====================
    
    /**
     * HTTP/HTTPS PATCH request
     */
    //% weight=50
    //% subcategory="HTTP"
    //% block="HTTP PATCH|URL %url|body %body"
    //% url.defl="http://192.168.1.100/api/data/1"
    //% body.defl='{"temp":28}'
    export function httpPatch(url: string, body: string): string {
        return httpRequest("PATCH", url, body)
    }
    
    // ==================== SPECIALIZED FUNCTIONS ====================
    
    /**
     * Send sensor data to server (POST JSON)
     */
    //% weight=45
    //% subcategory="HTTP"
    //% block="POST sensor data|URL %url|temp %temp|humid %humid|light %light"
    //% url.defl="http://192.168.1.100/api/sensor"
    //% temp.defl=25
    //% humid.defl=60
    //% light.defl=500
    export function postSensorData(url: string, temp: number, humid: number, light: number): boolean {
        let json = "{\"temperature\":" + temp + 
                  ",\"humidity\":" + humid + 
                  ",\"light\":" + light + "}"
        
        let response = httpPost(url, json)
        return response.indexOf("200") >= 0 || response.indexOf("201") >= 0
    }
    
    /**
     * POST to Google Apps Script (HTTPS only)
     */
    //% weight=40
    //% subcategory="HTTP"
    //% block="POST to Google Script|ID %scriptId|JSON %jsonData"
    //% scriptId.defl="YOUR_SCRIPT_ID_HERE"
    //% jsonData.defl='{"temp":25}'
    export function postToGoogleScript(scriptId: string, jsonData: string): boolean {
        let url = "https://script.google.com/macros/s/" + scriptId + "/exec"
        let response = httpPost(url, jsonData)
        return response.indexOf("200") >= 0 || response.indexOf("302") >= 0
    }
    
    /**
     * POST sensor to Google Apps Script
     */
    //% weight=35
    //% subcategory="HTTP"
    //% block="POST sensor to Google|ID %scriptId|temp %temp|humid %humid|light %light"
    //% scriptId.defl="YOUR_SCRIPT_ID_HERE"
    //% temp.defl=25
    //% humid.defl=60
    //% light.defl=500
    export function postSensorToGoogle(scriptId: string, temp: number, humid: number, light: number): boolean {
        let json = "{\"temperature\":" + temp + 
                  ",\"humidity\":" + humid + 
                  ",\"light\":" + light + "}"
        return postToGoogleScript(scriptId, json)
    }
    
    // ==================== RESPONSE HELPERS ====================
    
    /**
     * Check if HTTP response is successful (200-299)
     */
    //% weight=30
    //% subcategory="HTTP"
    //% block="HTTP success|response %response"
    export function isHttpSuccess(response: string): boolean {
        return response.indexOf("200") >= 0 || 
               response.indexOf("201") >= 0 || 
               response.indexOf("204") >= 0
    }
    
    /**
     * Extract body from HTTP response
     */
    //% weight=25
    //% subcategory="HTTP"
    //% block="extract body from|response %response"
    export function extractBody(response: string): string {
        // Find double CRLF (end of headers)
        let bodyStart = response.indexOf("\r\n\r\n")
        if (bodyStart >= 0) {
            return response.substr(bodyStart + 4)
        }
        
        // Alternative: find first { for JSON
        let jsonStart = response.indexOf("{")
        if (jsonStart >= 0) {
            return response.substr(jsonStart)
        }
        
        return ""
    }
    
    /**
     * Get HTTP status code from response
     */
    //% weight=20
    //% subcategory="HTTP"
    //% block="get status code|response %response"
    export function getStatusCode(response: string): number {
        // Look for "HTTP/1.1 XXX"
        let httpIndex = response.indexOf("HTTP/1.1 ")
        if (httpIndex >= 0) {
            let codeStr = response.substr(httpIndex + 9, 3)
            let code = 0
            for (let i = 0; i < 3; i++) {
                let char = codeStr.charAt(i)
                if (char >= "0" && char <= "9") {
                    code = code * 10 + (char.charCodeAt(0) - 48)
                }
            }
            return code
        }
        return 0
    }
}
