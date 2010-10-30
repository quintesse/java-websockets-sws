
// ****************************************************************
// SWS - Stable Web Socket
// ****************************************************************

function StableWebSocket(url) {
    var _self = this;

    // ****************************************************************
    // "PUBLIC" METHODS
    // ****************************************************************

    // Returns the current session Id.
    _self.id = function() {
        return _sessionId;
    };

    // Returns the current state of the socket
    _self.status = function() {
        if (_self.isclosed()) {
            return "closed";
        } else {
            if (_self.isready()) {
                return "connected";
            } else {
                if (_self.isconnected()) {
                    return "reconnecting";
                } else {
                    return "connecting";
                }
            }
        }
    };

    // Returns the current connection state, connected or not.
    _self.isconnected = function() {
        return !_closed && _connected;
    };

    // Returns if the socket is ready to send data or not.
    _self.isready = function() {
        return !_closed && _connected && !_reconnecting;
    };

    // Returns if the socket is ready to send data or not.
    _self.isclosed = function() {
        return _closed;
    };

    // Sends data to the server.
    _self.send = function(msg) {
        if (_self.isready()) {
            _send(msg);
        } else {
            if (_self.logging && console) console.log("Socket not ready to send message", msg);
        }
    };

    // Sets the keep-alive timeout
    _self.setKeepAlive = function(timeout) {
        this.keepaliveTimeout = timeout;
        _startKeepalive();
    };

    // Closes the connection with the server.
    _self.close = function() {
        if (!_self.isclosed()) {
            if (_self.logging && console) console.log("Client is closing connection", _sessionId);

            try {
                // We send a close message to the server
                _send("<<SWS:CLOSE>>" + _sessionId);
            } catch (ex) {
                // Ignore
            }

            _close();
        }
    };

    // ****************************************************************
    // PRIVILEDGED METHODS
    // ****************************************************************

    // FOR DEBUG PURPOSES ONLY
    // Disconnects underlying websocket
    _self._disconnect = function() {
        if (_socket) {
            _socket.close();
        }
    };

    // ****************************************************************
    // PRIVATE METHODS
    // ****************************************************************

    function _open() {
        _socket = new WebSocket(_self.url);
        _socket.onopen = _onOpen;
        _socket.onmessage = _onConnectMessage;
        _socket.onclose = _onClose;
    }

    // Handle opening of the web socket
    function _onOpen() {
        if (_self.logging && console) console.log("Underlying Web Socket connected to", _self.url);
        if (_reconnecting) {
            // We send a reconnect request to the server
            _send("<<SWS:RECONNECT>>" + _sessionId);
        } else {
            // We send a protocol identification cookie to the server
            _send("<<SWS:INIT>>1");
        }
        _stopReconnect();
        _startAutoDisconnect();
    }

    // Handle the first message as it comes in over the web socket.
    // It will contain a unique session ID that can be used to reconnect
    // with the server in case of a network disruption.
    function _onConnectMessage(msg) {
        if (_self.logging && console) console.log("Received message", msg);
        _stopAutoDisconnect();
        if (msg.data) {
            if (msg.data.substr(0, 15) == "<<SWS:SESSION>>") {
                _sessionId = msg.data.substr(15);

                // Make sure all future messages get handled by _onMessage()
                _socket.onmessage = _onMessage;

                _closed = false;
                if (_reconnecting) {
                    // Reconnecting an existing session
                    if (_self.logging && console) console.log("Session reconnected correctly", _sessionId);
                    _reconnecting = false;
                    _reconnectCount = 0;
                    _self.onreconnect.fire(_self);
                } else {
                    // This is a new session
                    if (_self.logging && console) console.log("Received session ID", _sessionId);
                    _connected = true;
                    _reconnect = true;
                    _self.onopen.fire(_self);
                }

                _startKeepalive();
            } else if (msg.data.substr(0, 13) == "<<SWS:CLOSE>>"
            && msg.data.substr(13) == _sessionId) {
                // Received a proper close message from the server, shutting down
                if (_self.logging && console) console.log("Received close message for session", _sessionId, "Connect aborted");
                _close();
            } else {
                if (_self.logging && console) console.log("Unknown message received! Closing", msg.data);
                _close();
            }
        }
    }

    // Handle each message as it comes in over the web socket
    function _onMessage(msg) {
        if (_self.logging && console) console.log("Received message", msg);
        _recvCount++;
        if (msg.data) {
            if (msg.data.substr(0, 13) == "<<SWS:CLOSE>>"
            && msg.data.substr(13) == _sessionId) {
                // Received a proper close message from the server, shutting down
                if (_self.logging && console) console.log("Received close message for session", _sessionId);
                _close();
            }

            _self.onmessage.fire(_self, msg);
        }
    }

    // Handle closing of the web socket
    function _onClose() {
        _socket = null;
        _stopReconnect();
        if (_connected) {
            if (_reconnect) {
                _reconnectCount++;
                if (_self.maxReconnect < 0 || _reconnectCount <= _self.maxReconnect) {
                    if (_self.logging && console) console.log("Underlying Web Socket closed unexpectedly. Reconnecting");
                    _self.ondisconnect.fire(_self);
                    _startReconnect();
                    if (!_reconnecting) {
                        // First time so we try to reconnect immediately
                        _open();
                    }
                    _reconnecting = true;
                } else {
                    if (_self.logging && console) console.log("Maximum connect retries reached. Shutting down");
                    _connected = false;
                    _closed = true;
                    _self.onclose.fire(_self);
                }
            } else {
                if (_self.logging && console) console.log("Underlying Web Socket closed properly. Shutting down");
                _connected = false;
                _closed = true;
                _self.onclose.fire(_self);
            }
        } else {
            if (_self.logging && console) console.log("Underlying Web Socket closed before establishing connection");
            _connected = false;
            _closed = true;
            _self.onclose.fire(_self);
        }
        _stopKeepalive();
        _stopAutoDisconnect();
    }

    // Sends data to the server.
    function _send(msg) {
        if (_self.logging && console) console.log("Sending message", msg);
        _socket.send(msg);
        _sendCount++;
    }

    // Closes the connection with the server.
    function _close() {
        if (_self.logging && console) console.log("Closing session", _sessionId);

        // Make sure we don't try to reconnect
        _reconnecting = false;
        _reconnect = false;

        if (_socket) {
            _socket.close();
        } else {
            _onClose();
        }
    }

    // Starts the auto disconnect timer
    function _startAutoDisconnect() {
        _stopAutoDisconnect();
        if (_self.autoDisconnectTimeout > 0) {
            _autoDisconnectTimer = setTimeout(_autoDisconnect, _self.autoDisconnectTimeout);
            if (_self.logging && console) console.log("Started auto-disconnect timer, waiting", _self.autoDisconnectTimeout, "ms");
        }
    }

    // Stops the auto disconnect timer
    function _stopAutoDisconnect() {
        if (_autoDisconnectTimer) {
            clearTimeout(_autoDisconnectTimer);
            _autoDisconnectTimer = undefined;
            if (_self.logging && console) console.log("Stopped auto-disconnect timer");
        }
    }

    // Automatically disconnect if no response was received from the
    // server within the alotted time
    function _autoDisconnect() {
        if (_self.logging && console) console.log("Auto-disconnect timer fired, closing...");
        _socket.close();
    }

    // Starts the auto disconnect timer
    function _startKeepalive() {
        _stopKeepalive();
        if (_self.keepaliveTimeout > 0) {
            _keepaliveTimer = setInterval(_keepalive, _self.keepaliveTimeout);
            if (_self.logging && console) console.log("Started keep-alive timer, waiting", _self.keepaliveTimeout, "ms");
        }
    }

    // Stops the keep-alive timer
    function _stopKeepalive() {
        if (_keepaliveTimer) {
            clearInterval(_keepaliveTimer);
            _keepaliveTimer = undefined;
            if (_self.logging && console) console.log("Stopped keep-alive timer");
        }
    }

    // Sens a PING message to the server to keep the connection from closing
    function _keepalive() {
        if (_self.logging && console) console.log("Keep-alive timer fired");
        if (_self.isready()) {
            if ((_recvCount + _sendCount) == _keepaliveCount) {
                if (_self.logging && console) console.log("Sending PING message");
                _send("<<SWS:PING>>" + _sessionId);
            }
            _keepaliveCount = _recvCount + _sendCount;
        }
    }

    // Starts the reconnect timer
    function _startReconnect() {
        _stopReconnect();
        _reconnectTimer = setTimeout(_open, _self.reconnectDelay);
        if (_self.logging && console) console.log("Started reconnect timer, waiting", _self.reconnectDelay, "ms");
    }

    // Stops the keep-alive timer
    function _stopReconnect() {
        if (_reconnectTimer) {
            clearTimeout(_reconnectTimer);
            _reconnectTimer = undefined;
            if (_self.logging && console) console.log("Stopped reconnect timer");
        }
    }

    var _socket = null;
    var _sessionId = undefined;
    var _connected = false;
    var _reconnecting = false;
    var _closed = true;
    var _reconnect = false;
    var _recvCount = 0;
    var _sendCount = 0;
    var _reconnectCount = 0;
    var _keepaliveCount = 0;
    var _reconnectTimer = undefined;
    var _autoDisconnectTimer = undefined;
    var _keepaliveTimer = undefined;

    _self.url = url;
    _self.logging = false;
    _self.autoDisconnectTimeout = 20000;
    _self.keepaliveTimeout = 30000;
    _self.reconnectDelay = 3000;
    _self.maxReconnect = 10;

    _self.onopen = new EventDispatcher();
    _self.onclose = new EventDispatcher();
    _self.ondisconnect = new EventDispatcher();
    _self.onreconnect = new EventDispatcher();
    _self.onmessage = new EventDispatcher();

    _open();
}

//
// Utility classes and methods
//

Object.prototype.clone = function(){
    var newObj = {};
    for (var i in this) {
        if (this[i] && typeof this[i] == "object")
            newObj[i] = this[i].clone();
        else
            newObj[i] = this[i];
    }
    return newObj;
};

Array.prototype.clone = function(){
    var newObj = [];
    for (var i = 0, len = this.length; i < len; i++) {
        if (this[i] && typeof this[i] == "object")
            newObj[i] = this[i].clone();
        else
            newObj[i] = this[i];
    }
    return newObj;
};

function EventDispatcher() {
    var _self = this;

    // ****************************************************************
    // "PUBLIC" METHODS
    // ****************************************************************

    _self.bind = function(handler) {
        _handlers.push(handler);
    }

    _self.unbind = function(handler) {
        var idx = _handlers.indexOf(handler);
        if (idx >= 0) {
            _handlers.splice(idx, 1);
        }
    }

    _self.fire = function() {
        var handlers = _handlers.clone();
        for (var i = 0, len = handlers.length; i < len; i++) {
            try {
                handlers[i].apply(null, arguments);
            } catch (ex) {
                // Ignore
            }
        }
    }

    var _handlers = [];
}
