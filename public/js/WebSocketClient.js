/**
 * Created by Scurab on 27/02/2017.
 */
"use strict";


define(() => {
    return class WebSocketClient extends EventEmitter {
        constructor(url) {
            super();
            this._url = url;
            this._webSocket = null;
        }

        connect() {
            this.close();
            return new Promise((resolve, reject) => {
                this._webSocket = this._onCreateWebSocket(this._url, resolve);
            });
        }

        close() {
            if (this._webSocket) {
                try {
                    this._webSocket.close();
                } catch (e) {
                    console.error(e);
                }
            }
            this._webSocket = null;
        }

        login(username) {
            this._webSocket.send(JSON.stringify({type: "login", username: username}));
        }

        sendMessage(msg, from, to) {
            try {
                let value = {type: "msg", data:msg, from:from, to:to};
                this._webSocket.send(JSON.stringify(value));
                value.received = new Date().toISOString();
                return value;
            } catch (e) {
                console.error(e);
            }
        }

        logout() {
            if (this._webSocket) {
                try {
                    this._webSocket.send(JSON.stringify({type: "logout"}));
                } catch (e) {
                    console.error(e);
                }
            }
        }

        _onCreateWebSocket(url, resolve, reject) {
            let _this = this;
            var webSocket = new WebSocket(url);
            webSocket.onerror = function (event) {
                console.error(event);
            };

            webSocket.onopen = function (event) {
                console.log("Connected");
                console.log(event);
                resolve();
            };

            webSocket.onmessage = function (event) {
                try {
                    var obj = JSON.parse(event.data);
                    if (obj && obj.type) {
                        _this.emit(obj.type, obj);
                    }
                } catch (e) {
                    console.error(e);
                }
            };
            return webSocket;
        }
    }
});