/***************************************************
 * ESP8266 MakeCode Library (NO DEBUG / NO LED)
 ***************************************************/
namespace esp8266 {
    let esp8266Initialized = false
    let rxData = ""

    function error(code: number) {
        // debugging & LED dihilangkan
    }

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

    //% weight=30
    //% block="initialize ESP8266 Tx %tx Rx %rx Baud %baudrate"
    export function init(tx: SerialPin, rx: SerialPin, baudrate: BaudRate) {
        serial.redirect(tx, rx, baudrate)

        if (!sendCommand("AT+RST", "ready", 5000)) return
        if (!sendCommand("ATE0", "OK")) return
        if (!sendCommand("AT+CWMODE=1", "OK")) return

        esp8266Initialized = true
    }

    //% weight=20
    //% block="get raw data from server IP %serverIp WiFi %ssid Pass %password Path %path"
    export function getRawFromServer(
        serverIp: string,
        ssid: string,
        password: string,
        path: string
    ): string {

        if (!esp8266Initialized) return ""

        rxData = ""
        serial.readString()

        // WiFi
        sendCommand(
            "AT+CWJAP=\"" + ssid + "\",\"" + password + "\"",
            "WIFI GOT IP",
            20000
        )

        // TCP
        sendCommand(
            "AT+CIPSTART=\"TCP\",\"" + serverIp + "\",80",
            "CONNECT",
            8000
        )

        let httpRequest =
            "GET " + path + " HTTP/1.1\r\n" +
            "Host: " + serverIp + "\r\n" +
            "Connection: close\r\n\r\n"

        sendCommand("AT+CIPSEND=" + (httpRequest.length + 2), ">", 5000)
        serial.writeString(httpRequest)

        let start = input.runningTime()
        while (input.runningTime() - start < 8000) {
            rxData += serial.readString()
            basic.pause(200)
        }

        sendCommand("AT+CIPCLOSE")
        return rxData
    }

    //% weight=25
    //% block="send to server IP %serverIp WiFi %ssid Pass %password Data %data"
    export function sendToServer(
        serverIp: string,
        ssid: string,
        password: string,
        data: string
    ) {
        if (!esp8266Initialized) return

        // WiFi
        if (!sendCommand(
            "AT+CWJAP=\"" + ssid + "\",\"" + password + "\"",
            "WIFI GOT IP",
            20000
        )) return

        // TCP
        if (!sendCommand(
            "AT+CIPSTART=\"TCP\",\"" + serverIp + "\",80",
            "CONNECT",
            8000
        )) return

        let httpRequest =
            "GET /tes.php?" + data + " HTTP/1.1\r\n" +
            "Host: " + serverIp + "\r\n" +
            "Connection: close\r\n\r\n"

        let len = httpRequest.length + 2

        if (!sendCommand("AT+CIPSEND=" + len, ">", 5000)) return

        serial.writeString(httpRequest)
        basic.pause(4000)
        sendCommand("AT+CIPCLOSE")
    }
}
