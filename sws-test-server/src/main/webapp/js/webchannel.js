
// ****************************************************************
// WebChannel
// ****************************************************************

function WebChannel(socket, service, arg1, arg2) {
    var _self = this;

    // ****************************************************************
    // "PUBLIC" METHODS
    // ****************************************************************

    // Returns the id of the channel
    _self.id = function() {
        return _id;
    }

    // Returns the current state of the channel
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

    // Returns the connection state of the channel
    _self.isconnected = function() {
        return _connected;
    }

    // Returns true if the channel has been closed
    _self.isready = function(pkt) {
        return _ready && _socket.isready();
    }

    // Returns true if the channel has been closed
    _self.isclosed = function() {
        return _closed;
    }

    // Sends a message to the peer
    _self.send = function(pkt) {
        _send(pkt);
    }

    // Closes the channel
    _self.close = function() {
        if (_id) {
            if (_self.logging && console) console.log("Channel", _id, "sending close message to peer");
            _send({$cmd : "close"});
        }
        _close();
    }

    // ****************************************************************
    // PRIVILEDGED METHODS
    // ****************************************************************

    // Handles initialization of the web socket
    _self._onInit = function() {
        _open();
    }

    // Handles opening of the web socket
    _self._onOpen = function(peerId) {
        if (_self.logging && console) console.log("Channel", _id, "opened to peer", peerId);
        _peerId = peerId;
        _connected = true;
        _ready = true;
        _closed = false;
        _self.onopen.fire(_self);
    }

    // Handles incoming messages
    _self._onMessage = function(msg) {
        if (_self.logging && console) console.log("Channel", _id, "received message", msg);
        _recvCount++;
        _self.onmessage.fire(_self, msg);
    }

    // Handles socket disconnects
    _self._onDisconnect = function() {
        if (_self.logging && console) console.log("Channel", _id, "disconnected");
        _ready = false;
        _self.ondisconnect.fire(_self);
    }

    // Handles socket reconnects
    _self._onReconnect = function() {
        if (_self.logging && console) console.log("Channel", _id, "reconnected");
        _ready = true;
        _self.onreconnect.fire(_self);
    }

    // Handles closing of the web socket
    _self._onClose = function() {
        if (_self.logging && console) console.log("Channel", _id, "closing");
        _close();
    }

    // ****************************************************************
    // PRIVATE METHODS
    // ****************************************************************

    // Initializes the channel and socket
    function _init() {
        _manager = WebChannelManager.associate(_socket);
        _id = _manager.addChannel(_self);
        _closed = false;
        
        if (_socket.isready()) {
            _self._onInit();
        }
    }

    // Opens a channel to the peer
    function _open() {
        var pkt = {
            $cmd : 'open',
            service : _service
        };
        _send(pkt);
    }

    // Sends a packet to the peer
    function _send(pkt) {
        if (_socket.isready()) {
            pkt.$src = _id;
            pkt.$dst = _peerId || _peerSocketId;
            if (_self.logging && console) console.log("Channel", _id, "sending message", pkt);
            _socket.send(JSON.stringify(pkt));
            _sendCount++;
        } else {
            if (_self.logging && console) console.log("Underlying socket not ready for channel", _id, "NOT sending message", pkt);
        }
    }

    function _close() {
        if (!_closed) {
            if (_manager) {
                _manager.removeChannel(_self);
            }
            if (_connected) {
                if (_self.logging && console) console.log("Channel", _id, "closed");
            } else {
                if (_self.logging && console) console.log("Channel", _id, "closed before connection could be established");
            }
            _connected = false;
            _ready = false;
            _closed = true;
            _self.onclose.fire(_self);
            _id = undefined;
        }
    }

    var _id = undefined;
    var _peerId = undefined;
    var _manager = undefined;
    var _connected = false;
    var _closed = true;
    var _ready = false;
    var _recvCount = 0;
    var _sendCount = 0;
    
    var _socket = socket;
    var _service = service;
    var _peerSocketId = "sys";

    _self.logging = false;
    _self.onopen = new EventDispatcher();
    _self.onclose = new EventDispatcher();
    _self.ondisconnect = new EventDispatcher();
    _self.onreconnect = new EventDispatcher();
    _self.onmessage = new EventDispatcher();

    if (arg2) {
        // Connection already established
        _peerId = arg1;
        _id = arg2;
    } else {
        // Next step: establish connection
        _peerSocketId = arg1;
        setTimeout(_init, 0);
    }
}


// ****************************************************************
// WebChannelManager
// ****************************************************************

function WebChannelManager(socket) {
    var _self = this;

    // ****************************************************************
    // "PUBLIC" METHODS
    // ****************************************************************

    // Adds a new channel to manage
    _self.addChannel = function(channel) {
        var id = _nextChannelId++;
        _channels[id] = channel;
        return id;
    }

    // Removes a channel
    _self.removeChannel = function(channel) {
        delete _channels[channel.id()];
    }

    // ****************************************************************
    // PRIVATE METHODS
    // ****************************************************************

    function _onOpen(socket) {
        if (_self.logging && console) console.log("WebChannelManager's underlying socket opened");
        _for(function(channel) {
            channel._onInit();
        });
    }

    function _onClose(socket) {
        if (_self.logging && console) console.log("WebChannelManager's underlying socket closed");
        _for(function(channel) {
            channel._onClose();
        });
    }

    function _onDisconnect(socket) {
        if (_self.logging && console) console.log("WebChannelManager's underlying socket disconnected");
        _for(function(channel) {
            channel._onDisconnect();
        });
    }

    function _onReconnect(socket) {
        if (_self.logging && console) console.log("WebChannelManager's underlying socket reconnected");
        _for(function(channel) {
            channel._onReconnect();
        });
    }

    function _onMessage(socket, msg) {
        var pkt = JSON.parse(msg.data);
        if (_self.logging && console) console.log("WebChannelManager received message", pkt);
        var from = pkt["$src"];
        var to = pkt["$dst"];
        var command = pkt["$cmd"];
        if (command) {
            if (command == "open") {
                var serviceName = pkt["service"];
                if (serviceName) {
                    var service = ServiceManager.find(serviceName) ;
                    if (service) {
                        var id = _nextChannelId++;
                        var channel = new WebChannel(_socket, serviceName, from, id);
                        _channels[id] = channel;
                        if (service.handler(channel, pkt)) {
                            if (_self.logging && console) console.log("Channel connection accepted");
                            channel.send({$cmd : "open-ok"});
                            channel._onOpen(from);
                        } else {
                            if (_self.logging && console) console.log("Channel connection refused");
                            _sendReply("open-fail", from, "Connection refused");
                        }
                    } else {
                        if (_self.logging && console) console.log("Unknown service", serviceName);
                        _sendReply("open-fail", from, "Unknown service");
                    }
                } else {
                    if (_self.logging && console) console.log("Missing 'service' attribute for 'open'");
                    _sendReply("open-fail", from, "Malformed request");
                }
            } else {
                var channel = _channels[to];
                if (channel) {
                    if (command == "open-ok") {
                        if (_self.logging && console) console.log("Received 'open-ok' message for channel", to);
                        channel._onOpen(from);
                    } else if (command == "open-fail") {
                        if (_self.logging && console) console.log("Received 'open-fail' message for channel", to, "because", pkt["reason"]);
                        channel._onClose();
                    } else if (command == "close") {
                        if (_self.logging && console) console.log("Received 'close' message for channel", to);
                        channel._onClose();
                    } else if (command == "peer-disconnect") {
                        if (_self.logging && console) console.log("Received 'peer-disconnect' message for channel", to);
                        channel._onDisconnect();
                    } else if (command == "peer-reconnect") {
                        if (_self.logging && console) console.log("Received 'peer-reconnect' message for channel", to);
                        channel._onReconnect();
                    } else {
                        if (_self.logging && console) console.log("Unknown channel command", command, "received for", to);
                    }
                } else {
                    if (_self.logging && console) console.log("Command received for unknown channel", to);
                    if (command == "open-ok") {
                        _sendReply("close", "Unknown channel");
                    }
                }
            }
        } else {
            // Send message to appropiate channel
            var channel = _channels[to];
            if (channel) {
                channel._onMessage(pkt);
            } else {
                channel.send({$cmd : "close"});
            }
        }
    }

    function _sendReply(command, dstId, reason) {
        var pkt = {
            $cmd : command,
            $dst : dstId,
            reason : reason
        };
        _socket.send(JSON.stringify(pkt));
    }

    function _for(func) {
        var channels = clone(_channels);
        for (var i in channels) {
            var channel = channels[i];
            func(channel);
        }
    }

    var _socket = socket;
    var _channels = {};
    var _nextChannelId = 1;
    
    _self.logging = true;
    
    _socket.onopen.bind(_onOpen);
    _socket.onclose.bind(_onClose);
    _socket.ondisconnect.bind(_onDisconnect);
    _socket.onreconnect.bind(_onReconnect);
    _socket.onmessage.bind(_onMessage);
}

WebChannelManager.associate = function(socket) {
    if (!socket._channelManager) {
        socket._channelManager = new WebChannelManager(socket);
    }
    return socket._channelManager;
}


// ****************************************************************
// ServiceManager
// ****************************************************************

var ServiceManager = new function ServiceManagerSingleton() {
    var _self = this;

    // ****************************************************************
    // "PUBLIC" METHODS
    // ****************************************************************

    _self.register = function(name, description, func) {
        var service = {
            info : {
                name : name,
                description : description
            },
            handler : func
        }
        _services[name] = service;
        _self.onchange.fire(name, true);
    };

    _self.unregister = function(name) {
        delete _services[name];
        _self.onchange.fire(name, false);
    };

    _self.find = function(name) {
        return _services[name];
    };

    _self.list = function() {
        var ss = [];
        for (var s in _services) {
            ss.push(_services[s].info);
        }
        return ss;
    }

    var _services = {};

    _self.onchange = new EventDispatcher();
};


// ****************************************************************
// ServicesService
//   Predefined service that keeps the peer informed of the services
//   that are defined on this side of the connection
// ****************************************************************

var ServicesService = new function ServicesServiceSingleton() {
    var _self = this;

    // ****************************************************************
    // "PUBLIC" METHODS
    // ****************************************************************

    _self.accept = function(channel, pkt) {
        channel.onopen.bind(ServicesService.onOpen);
        return true;
    };

    _self.onOpen = function(channel) {
        _sendServices(channel);
        ServiceManager.onchange.bind(function() {
            _sendServices(channel);
        });
    };

    // ****************************************************************
    // PRIVATE METHODS
    // ****************************************************************

    function _sendServices(channel) {
        var pkt = {
            services : ServiceManager.list()
        };
        channel.send(pkt);
    }
};


// ****************************************************************
// EchoService
//   Predefined service that simply returns the messages it receives
// ****************************************************************

var EchoService = {
    accept : function(channel, pkt) {
        channel.onmessage.bind(EchoService.onMessage);
        return true;
    },

    onMessage : function(channel, pkt) {
        channel.send(pkt);
    }
};


// ****************************************************************
// TimeService
//   Predefined service that sends the current time each second
// ****************************************************************

var TimeService = {
    accept : function(channel, pkt) {
        channel.onclose.bind(TimeService.onClose);
        channel._time_service_interval = setInterval(function() {
            channel.send({ time : new Date() });
        }, 1000);
        return true;
    },

    onClose : function(channel) {
        clearInterval(channel._time_service_interval);
    }
};

ServiceManager.register("services", "Informs about available services", ServicesService.accept);
ServiceManager.register("echo", "Echoes all sent messages", EchoService.accept);
ServiceManager.register("time", "Sends time updates", TimeService.accept);
