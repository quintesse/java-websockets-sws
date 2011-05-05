/* 
 * Copyright 2010 Tako Schotanus <tako@codejive.org>.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * under the License.
 */

function App(config) {
    var _self = this;
    
    // ****************************************************************
    // "PUBLIC" METHODS
    // ****************************************************************

    _self.start = function() {
        setStatus('Connecting...');
        _sws = new StableWebSocket(config.url);
        _sws.onopen.bind(_onSocketOpen);
        _sws.ondisconnect.bind(_onSocketDisconnect);
        _sws.onreconnect.bind(_onSocketReconnect);
        _sws.onclose.bind(_onSocketClose);
        _openClientChannel();
    }

    _self.stop = function() {
        if (_sws) {
            _sws.close();
            _sws = undefined;
        }
    }
    
    _self.setStatus = function(msg, error, again) {
        $('#gamestatus').text(msg);
        if (error) {
            $('#gameform').addClass('error')
        } else {
            $('#gameform').removeClass('error')
        }
        if (again) {
            $('#playagainbutton').fadeIn();
        } else {
            $('#playagainbutton').fadeOut();
        }
    }

    _self.createService = function() {
        if (config.accept) {
            $('#startform').hide('fast');
            $('#waitform').fadeIn();
            setWaitStatus('Waiting for other player to connect...');
            var name = getPlayerName();
            var id = config.name + '$' + _sws.id();
            var title = config.title.replace("{name}", name);
            _clientChannel.services().register(id, title, _serviceAccept);
        }
    }
    
    _self.cancelService = function() {
        if (config.accept) {
            _clientChannel.services().unregister(config.name + '$' + _sws.id());
            $('#waitform').fadeOut();
            $('#startform').show('fast');
        }
    }

    _self.joinService = function() {
        $('#startform').hide('fast');
        $('#waitform').fadeIn();
        setWaitStatus('Connecting to game...');
        var url = $('#games').val();
        var channel = new WebChannel(_sws, url);
        channel.logging = true;
        _addAppChannel(channel);
    }

    _self.leaveService = function() {
        $('#gameform').fadeOut();
        if (!_sws.isclosed()) {
            $('#startform').show('fast');
            for (var i = 0; i < _appChannels.length; i++) {
                _appChannels[i].close();
            }
            _appChannels = [];
        }
    }

    _self.broadcast = function(msg) {
        for (var i = 0; i < _appChannels.length; i++) {
            _appChannels[i].send(msg);
        }
    }
    
    // ****************************************************************
    // PRIVATE METHODS
    // ****************************************************************

    function _init() {
        if (hasWebSockets()) {
            if (config.init) config.init();
            // Make sure we shut down cleanly if the user closes the browser
            // or navigates away from the page
            window.onbeforeunload = function() {
                if (app) app.stop();
            }
        }
    }

    function _onSocketOpen(channel) {
        $('#connectbutton').fadeOut();
        $('#disconnectbutton').fadeIn();
        $('#startform').fadeIn();
        updategui();
        setStatus('Connected');
    }

    function _onSocketDisconnect(channel) {
        setStatus('Connection problems! Trying to re-establish the connection...', true);
    }

    function _onSocketReconnect(channel) {
        setStatus('Reconnected');
    }

    function _onSocketClose(channel) {
        $('#connectbutton').fadeIn();
        $('#disconnectbutton').fadeOut();
        $('#startform').fadeOut();
        $('#waitform').fadeOut();
        $('#gameform').fadeOut();
        setStatus('Disconnected');
    }

    function _openClientChannel() {
        var service = config.clientService || '//sys/clients';
        _clientChannel = new WebChannel(_sws, service);
        _clientChannel.logging = true;
        _clientChannel.onmessage.bind(_onClientChannelMessage);
        _clientChannel.onclose.bind(_onClientChannelClose);
    }

    function _onClientChannelMessage(channel, msg) {
        var select = $('#games');
        select.empty();
        if (msg.clients) {
            for (var i = 0; i < msg.clients.length; i++) {
                var client = msg.clients[i];
                if (client.services && client.id != _sws.id()) {
                    for (var j in client.services) {
                        var srv = client.services[j];
                        if (srv.name.indexOf(config.name + '$') == 0) {
                            var url = '//' + client.id + '/' + srv.name;
                            select.append($(document.createElement("option")).attr("value", url).text(sanitize(srv.description)));
                        }
                    }
                }
            }
        } else if (msg.games) {
            for (var k = 0; k < msg.games.length; k++) {
                var game = msg.games[k];
                var gameUrl = config.gameService + '{"game":"' + game.name + '"}';
                select.append($(document.createElement("option")).attr("value", gameUrl).text(sanitize(game.description)));
            }
        }
        $('#joingamebutton').attr('disabled', true);
        if (select.children().size() > 0) {
            select.show('fast');
            $('#joingamebutton').fadeIn();
        } else {
            select.hide('fast');
            $('#joingamebutton').fadeOut();
        }
    }

    function _onClientChannelClose(channel) {
        _clientChannel = undefined;
        if (!_sws.isclosed()) {
            // Retry connection to server in 5 seconds
            setTimeout(_openClientChannel, 5000);
        }
    }

    function _serviceAccept(service, channel, pkt) {
        var result = true;
        if (config.accept) {
            result = config.accept(service, channel, pkt);
        }
        if (result) {
            _addAppChannel(channel);
        }
        return result;
    }
    
    function _onAppChannelOpen(channel) {
        $('#waitform').hide('fast');
        $('#gameform').show('fast');
        _self.setStatus('Connected. Setting up...');
        if (config.onopen) config.onopen(_self, channel);
    }

    function _onAppChannelMessage(channel, msg) {
        if (config.onmessage) config.onmessage(_self, channel, msg);
    }

    function _onAppChannelDisconnect(channel) {
        if (config.ondisconnect) config.ondisconnect(_self, channel);
    }

    function _onAppChannelReconnect(channel) {
        if (config.onreconnect) config.onreconnect(_self, channel);
    }

    function _onAppChannelClose(channel) {
        _removeAppChannel(channel);
        if (config.onclose) config.onclose(_self, channel);
    }
    
    function _addAppChannel(channel) {
        _appChannels.push(channel);
        channel.onopen.bind(_onAppChannelOpen);
        channel.onmessage.bind(_onAppChannelMessage);
        channel.ondisconnect.bind(_onAppChannelDisconnect);
        channel.onreconnect.bind(_onAppChannelReconnect);
        channel.onclose.bind(_onAppChannelClose);
    }
    
    function _removeAppChannel(channel) {
        var idx = indexOf(_appChannels, channel);
        _appChannels.splice(idx, 1);
    }

    var _sws = undefined;
    var _clientChannel = undefined;
    var _appChannels = [];

    _init();
}

function getPlayerName() {
    return $('#name').val();
}

function selectApp() {
    $('#joingamebutton').attr('disabled', getPlayerName() == '');
}

function hasWebSockets() {
    return !!window.WebSocket;
}

function setStatus(msg, error) {
    $('#status').text(msg);
    if (error) {
        $('#connectform').addClass('error')
    } else {
        $('#connectform').removeClass('error')
    }
}

function setWaitStatus(msg, error) {
    $('#waitstatus').text(msg);
    if (error) {
        $('#waitform').addClass('error')
    } else {
        $('#waitform').removeClass('error')
    }
}

function servletLocation(servletName) {
    var path = document.location.pathname;
    var p = path.lastIndexOf('/');
    path = path.substring(0, p + 1);
    var location = 'ws://' + document.location.host + path + servletName;
    return location;
}

function sanitize(txt) {
    return txt.substr(0, 20).replace(/[&<>]/g, '');
}

function updategui() {
    var name = $('#name').val();
    $('#newgamebutton').attr('disabled', name == '');
    $('#joingamebutton').attr('disabled', name == '' || $('#games').val() == null);
}
