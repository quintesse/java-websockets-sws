/* 
 *  Copyright 2010 Tako Schotanus <tako@codejive.org>.
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *       http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *  under the License.
 */

$(document).ready(function() {
    if (window.WebSocket) {
        $('.supported').fadeIn();
        $('.unsupported').fadeOut();
        initBoard();
    } else {
        $('.supported').fadeOut();
        $('.unsupported').fadeIn();
    }
    $('.disabled').attr('disabled', true);
});

var cellWidth = 80;
var cellHeight = 82;

function initBoard() {
    var p = $('#board').offset();
    var boardLeft = p.left + 50;
    var boardTop = p.top + 46;
    $('.cell').each(function(i) {
        var px = boardLeft + cellWidth * $(this).attr('xpos');
        var py = boardTop + cellHeight * $(this).attr('ypos');
        $(this).offset({
            top: py,
            left: px
        });
    });

    clearBoard();
    makeMove('cross');
}

function clearBoard() {
    $('.cell').attr('class', 'cell selectable');
}

function makeMove(classname) {
    $('.selectable').bind('mouseenter', function() {
        $(this).addClass(classname);
    }).bind('mouseleave', function() {
        $(this).removeClass(classname);
    }).bind('click', function() {
        $('.selectable').unbind('mouseenter mouseleave');
        $(this).removeClass('selectable');
    });
}

function showWinHorizontal(row) {
    var p = $('#board').offset();
    var strokeLeft = p.left + 50;
    var strokeTop = p.top + 64;
    var stroke = $('#strokeh');
    var py = strokeTop + cellHeight * row;
    stroke.offset({
        top: py,
        left: strokeLeft
    });
    stroke.show('fast');
}

function showWinVertical(column) {
    var p = $('#board').offset();
    var strokeLeft = p.left + 68;
    var strokeTop = p.top + 46;
    var stroke = $('#strokev');
    var px = strokeLeft + cellWidth * column;
    stroke.offset({
        top: strokeTop,
        left: px
    });
    stroke.show('fast');
}

function showWinDiagonal(isTopDown) {
    var p = $('#board').offset();
    var strokeLeft = p.left + 50;
    var strokeTop = p.top + 46;
    var stroke = $('#stroked');
    stroke.offset({
        top: strokeTop,
        left: strokeLeft
    });
    if (isTopDown) {
        stroke.attr('src', 'images/tictactoe/stroketb.png');
    } else {
        stroke.attr('src', 'images/tictactoe/strokebt.png');
    }
    stroke.show('fast');
}

var sws, clientChannel;
function serverConnect() {
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

function openClientChannel() {
    clientChannel = new WebChannel(sws, 'clients', 'sys');
    clientChannel.logging = true;
    clientChannel.onmessage.bind(onClientChannelMessage);
    clientChannel.onclose.bind(onClientChannelClose);
}

function serverDisconnect() {
    sws.close();
}

function onSocketOpen(channel) {
    $('#connectbutton').fadeOut();
    $('#disconnectbutton').fadeIn();
    $('#startform').fadeIn();
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

function onClientChannelMessage(channel, msg) {
    var select = $('#games');
    select.empty();
    if (msg.clients) {
        for (var i = 0; i < msg.clients.length; i++) {
            var client = msg.clients[i];
            if (client.services && client.id != sws.id()) {
                for (var j in client.services) {
                    var srv = client.services[j];
                    if (srv.name.indexOf('tictactoe$') == 0) {
                        var url = '//' + client.id + '/' + srv.name;
                        select.append($(document.createElement("option")).attr("value", url).text(srv.description));
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

function setGameStatus(msg, error) {
    $('#gamestatus').text(msg);
    if (error) {
        $('#gameform').addClass('error')
    } else {
        $('#gameform').removeClass('error')
    }
}

function newGame() {
    $('#startform').hide('fast');
    $('#waitform').fadeIn();
    setWaitStatus('Waiting for other player to connect...');
    var name = $('#name').val();
    var id = "tictactoe$" + sws.id();
    var service = new TicTacToeGameService(id, name);
    ServiceManager.register(id, name + "'s TicTacToe game", service.accept);
}

function stopWait() {
    ServiceManager.unregister("tictactoe$" + sws.id());
    $('#waitform').fadeOut();
    $('#startform').show('fast');
}

function selectGame() {
    $('#joingamebutton').attr('disabled', false);
}

var gameChannel;
function joinGame() {
    $('#startform').hide('fast');
    $('#waitform').fadeIn();
    setWaitStatus('Connecting to game...');
    var url = $('#games').val();
    gameChannel = new WebChannel(sws, url);
    gameChannel.logging = true;
    gameChannel.onopen.bind(onGameChannelOpen);
    gameChannel.onmessage.bind(onGameChannelMessage);
    gameChannel.onclose.bind(onGameChannelClose);
}

function leaveGame() {
    $('#gameform').fadeOut();
    if (!sws.isclosed()) {
        $('#startform').show('fast');
        if (gameChannel) {
            gameChannel.close();
        }
    }
}

function onGameChannelOpen(channel) {
    $('#waitform').hide('fast');
    $('#gameform').show('fast');
    setGameStatus('Connected. Setting up...');
}

function onGameChannelMessage(channel, msg) {
}

function onGameChannelClose(channel) {
    setGameStatus('Game disconnected', true);
    gameChannel = undefined;
}

// ****************************************************************
// TicTacToeGameService
// ****************************************************************

function TicTacToeGameService(id, name) {
    var _self = this;

    // ****************************************************************
    // "PUBLIC" METHODS
    // ****************************************************************

    _self.accept = function(channel, pkt) {
        gameChannel = channel;
        channel.onopen.bind(_self.onOpen);
        channel.onmessage.bind(_self.onMessage);
        channel.onclose.bind(_self.onClose);
        ServiceManager.unregister(id);
        return true;
    };

    _self.onOpen = function(channel) {
        onGameChannelOpen(channel);
    };

    _self.onMessage = function(channel, msg) {
        onGameChannelMessage(channel, msg);
    };

    _self.onClose = function(channel) {
        onGameChannelClose(channel);
    };
};
