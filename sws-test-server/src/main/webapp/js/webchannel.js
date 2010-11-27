
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

    // Retrieves the ServiceManager associated with this channel
    // (or more corectly this channel's socket)'
    _self.services = function() {
        return ServiceManager.forSocket(_socket);
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
        _manager = WebChannelManager.forSocket(_socket);
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
        if (arg1) {
            _peerSocketId = arg1;
        } else if (_service.substr(0, 2) == '//') {
            // service name really is a //peer/service url
            var tmp = service.split("/", 4);
            _peerSocketId = tmp[2];
            _service = tmp[3];
        }
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
                    var service = ServiceManager.forSocket(socket).find(serviceName) ;
                    if (service) {
                        var id = _nextChannelId++;
                        var channel = new WebChannel(_socket, serviceName, from, id);
                        channel.logging = true;
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

WebChannelManager.forSocket = function(socket) {
    if (!socket._channelManager) {
        socket._channelManager = new WebChannelManager(socket);
        socket.onclose.bind(function() { delete socket._channelManager; })
    }
    return socket._channelManager;
}


// ****************************************************************
// ServiceManager
// ****************************************************************

function ServiceManager() {
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
        _self.onchange.fire(service, true);
    };

    _self.unregister = function(arg) {
        var name;
        var service;
        if (arg instanceof String) {
            name = arg;
            service = _services[name];
        } else {
            name = _name(arg);
            service = arg;
        }
        if (name) {
            delete _services[name];
            _self.onchange.fire(service, false);
        }
    };

    _self.find = function(name) {
        if (_self != GlobalServiceManager) {
            return _services[name] || GlobalServiceManager.find(name);
        } else {
            return _services[name];
        }
    };

    _self.list = function(lst) {
        var ss = lst || [];
        if (_self != GlobalServiceManager) {
            GlobalServiceManager.list(ss);
        }
        for (var s in _services) {
            ss.push(_services[s].info);
        }
        return ss;
    }

    // ****************************************************************
    // PRIVATE METHODS
    // ****************************************************************

    // Find the name associated with the service or handler being passed
    function _name(arg) {
        for (var nm in _services) {
            var s = _services[nm];
            if (s == arg || s.handler == arg) {
                return nm;
            }
        }
        return undefined;
    }
    
    var _services = {};

    _self.onchange = new EventDispatcher();

    if (GlobalServiceManager && _self != GlobalServiceManager) {
        GlobalServiceManager.onchange.bind(function(name, added) {
            _self.onchange.fire(name, added);
        });
    }
}

ServiceManager.forSocket = function(socket) {
    if (!socket._serviceManager) {
        socket._serviceManager = new ServiceManager();
        socket.onclose.bind(function() { delete socket._serviceManager; })
    }
    return socket._serviceManager;
}

var GlobalServiceManager = new ServiceManager();


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
        channel.services().onchange.bind(function() {
            _sendServices(channel);
        });
    };

    // ****************************************************************
    // PRIVATE METHODS
    // ****************************************************************

    function _sendServices(channel) {
        var pkt = {
            services : channel.services().list()
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

GlobalServiceManager.register("echo", "Echoes all sent messages", EchoService.accept);
GlobalServiceManager.register("time", "Sends time updates", TimeService.accept);
GlobalServiceManager.register("services", "Informs about available services", ServicesService.accept);
