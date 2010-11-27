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

var app;
var sws;
var clientChannel;
var appChannels = [];

function initApp(apparg) {
    app = apparg;
    if (!app.init) app.init = function() {};
    
    var supported = hasWebSockets();
    if (supported) {
        $('.supported').fadeIn();
        $('.unsupported').fadeOut();
        app.init();
    } else {
        $('.supported').fadeOut();
        $('.unsupported').fadeIn();
    }
    $('.disabled').attr('disabled', true);
    return supported;
}

function startApp() {
    setStatus('Connecting...');
    var path = document.location.pathname;
    var p = path.lastIndexOf('/');
    path = path.substring(0, p + 1);
    var location = 'ws://' + document.location.host + path + 'swsdemo';
    sws = new StableWebSocket(location);
    sws.onopen.bind(onSocketOpen);
    sws.ondisconnect.bind(onSocketDisconnect);
    sws.onreconnect.bind(onSocketReconnect);
    sws.onclose.bind(onSocketClose);
    openClientChannel();
}

function stopApp() {
    sws.close();
}

function setAppStatus(msg, error, again) {
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

function onSocketOpen(channel) {
    $('#connectbutton').fadeOut();
    $('#disconnectbutton').fadeIn();
    $('#startform').fadeIn();
    updategui();
    setStatus('Connected');
}

function onSocketDisconnect(channel) {
    setStatus('Connection problems! Trying to re-establish the connection...', true);
}

function onSocketReconnect(channel) {
    setStatus('Reconnected');
}

function onSocketClose(channel) {
    $('#connectbutton').fadeIn();
    $('#disconnectbutton').fadeOut();
    $('#startform').fadeOut();
    $('#waitform').fadeOut();
    $('#gameform').fadeOut();
    setStatus('Disconnected');
}

function openClientChannel() {
    clientChannel = new WebChannel(sws, 'clients', 'sys');
    clientChannel.logging = true;
    clientChannel.onmessage.bind(onClientChannelMessage);
    clientChannel.onclose.bind(onClientChannelClose);
}

function onClientChannelMessage(channel, msg) {
    var select = $('#games');
    select.empty();
    if (msg.clients) {
        for (var i = 0; i < msg.clients.length; i++) {
            var client = msg.clients[i];
            if (client.services && client.id != sws.id()) {
                for (var j in client.services) {
                    var srv = client.services[j];
                    if (srv.name.indexOf(app.name + '$') == 0) {
                        var url = '//' + client.id + '/' + srv.name;
                        select.append($(document.createElement("option")).attr("value", url).text(sanitize(srv.description)));
                    }
                }
            }
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

function onClientChannelClose(channel) {
    select.hide('fast');
    $('#joingamebutton').fadeOut();
    clientChannel = undefined;
    if (!sws.isclosed()) {
        // Retry connection to server in 5 seconds
        setTimeout(openClientChannel, 5000);
    }
}

function getPlayerName() {
    return $('#name').val();
}

function appCreateService() {
    $('#startform').hide('fast');
    $('#waitform').fadeIn();
    setWaitStatus('Waiting for other player to connect...');
    var name = getPlayerName();
    var id = app.name + '$' + sws.id();
    var title = app.title.replace("{name}", name);
    clientChannel.services().register(id, title, _serviceAccept);
}

function appJoinService() {
    $('#startform').hide('fast');
    $('#waitform').fadeIn();
    setWaitStatus('Connecting to game...');
    var url = $('#games').val();
    appChannels[0] = new WebChannel(sws, url);
    appChannels[0].logging = true;
    appChannels[0].onopen.bind(_onAppChannelOpen);
    if (app.onmessage) appChannels[0].onmessage.bind(app.onmessage);
    if (app.ondisconnect) appChannels[0].ondisconnect.bind(app.ondisconnect);
    if (app.onreconnect) appChannels[0].onreconnect.bind(app.onreconnect);
    appChannels[0].onclose.bind(_onAppChannelClose);
}

function appLeaveService() {
    $('#gameform').fadeOut();
    if (!sws.isclosed()) {
        $('#startform').show('fast');
        for (var i = 0; i < appChannels.length; i++) {
            appChannels[i].close();
        }
        appChannels = [];
    }
}

function _serviceAccept(service, channel, pkt) {
    var result = true;
    if (app.accept) {
        result = app.accept(service, channel, pkt);
    }
    if (result) {
        appChannels.push(channel);
        channel.onopen.bind(_onAppChannelOpen);
        if (app.onmessage) channel.onmessage.bind(app.onmessage);
        if (app.ondisconnect) channel.ondisconnect.bind(app.ondisconnect);
        if (app.onreconnect) channel.onreconnect.bind(app.onreconnect);
        channel.onclose.bind(_onAppChannelClose);
    }
    return result;
}

function _onAppChannelOpen(channel) {
    $('#waitform').hide('fast');
    $('#gameform').show('fast');
    setAppStatus('Connected. Setting up...');
    if (app.onopen) app.onopen();
}

function _onAppChannelClose(channel) {
    var idx = indexOf(appChannels, channel);
    appChannels.splice(idx, 1);
    if (app.onclose) app.onclose();
}

function stopWait() {
    clientChannel.services().unregister(app.name + '$' + sws.id());
    $('#waitform').fadeOut();
    $('#startform').show('fast');
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

function sanitize(txt) {
    return txt.substr(0, 20).replace(/[&<>]/g, '');
}

function updategui() {
    var name = $('#name').val();
    $('#newgamebutton').attr('disabled', name == '');
    $('#joingamebutton').attr('disabled', name == '' || $('#games').val() == null);
}
