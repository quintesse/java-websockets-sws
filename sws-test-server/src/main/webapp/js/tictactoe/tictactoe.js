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
    startDemo();
    $('.disabled').attr('disabled', true);
});

var cellWidth = 80;
var cellHeight = 82;

// Initializes the board moving all the elements to their
// correct positions
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

    // Prevent the images from being dragged
    // (not really necessary but clicking sometimes tunrs into
    // a drag which looks a bit messy)
    $('.cell').mousedown(function(event) {event.preventDefault();})
    $('.stoke').mousedown(function(event) {event.preventDefault();})
    $('#board').mousedown(function(event) {event.preventDefault();})

    // Showing each of the strokes once because it positions them
    // correctly on the board.
    showWinHorizontal(0);
    showWinVertical(0);
    showWinDiagonal(true);

    clearBoard();
}

// Resets the board to its initial state
function clearBoard() {
    $('.cell').addClass('selectable');
    $('.cell').removeClass('nought cross');
    $('#strokeh,#strokev,#stroked').css('visibility', 'hidden');
}

function enableMove(classname) {
    $('.selectable').bind('mouseenter', function() {
        $(this).addClass(classname);
    }).bind('mouseleave', function() {
        $(this).removeClass(classname);
    }).bind('click', function() {
        disableMove();
        $(this).removeClass('selectable');
        var x = $(this).attr('xpos');
        var y = $(this).attr('ypos');
        makeMove(x, y);
    });
}

function disableMove() {
    $('.cell').unbind('mouseenter mouseleave click');
}

function cell(x, y) {
    return $('.selectable[xpos=' + x + '][ypos=' + y + ']');
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
    stroke.css('visibility', 'visible');
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
    stroke.css('visibility', 'visible');
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
    stroke.css('visibility', 'visible');
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

function setGameStatus(msg, error, again) {
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

function getPlayerName() {
    return $('#name').val();
}

var peerName;
function getPeerName() {
    return peerName;
}

var isMaster;
function newGame() {
    isMaster = true;
    stopDemo();
    $('#startform').hide('fast');
    $('#waitform').fadeIn();
    setWaitStatus('Waiting for other player to connect...');
    var name = getPlayerName();
    var id = "tictactoe$" + sws.id();
    var service = new TicTacToeGameService(id, name);
    clientChannel.services().register(id, name + "'s TicTacToe game", service.accept);
}

function stopWait() {
    clientChannel.services().unregister("tictactoe$" + sws.id());
    $('#waitform').fadeOut();
    $('#startform').show('fast');
}

function selectGame() {
    $('#joingamebutton').attr('disabled', false);
}

var gameChannel;
function joinGame() {
    isMaster = false;
    stopDemo();
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

function replayGame() {
    gameChannel.send({
        cmd: 'replay'
    });
    setupReplay();
}

function setupReplay() {
    var won = hasWon();
    clearBoard();
    if (won) {
        toggleTurn();
    } else {
        setupTurn();
    }
    updateGameStatus();
}

function onGameChannelOpen(channel) {
    $('#waitform').hide('fast');
    $('#gameform').show('fast');
    setGameStatus('Connected. Setting up...');
    if (isMaster) {
        startMaster();
    } else {
        startSlave();
    }
}

var turn;
var state;
function onGameChannelMessage(channel, msg) {
    var cmd = msg.cmd;
    if (cmd == 'start' && !isMaster && state == 'connecting') {
        peerName = sanitize(msg.name);
        turn = msg.start;
        updateGameStatus();
        gameChannel.send({
            cmd: 'startok',
            name: getPlayerName()
        });
        setupTurn();
        state = 'playing';
    } else if (cmd == 'startok' && isMaster && state == 'connecting') {
        peerName = sanitize(msg.name);
        updateGameStatus();
        setupTurn();
        state = 'playing';
    } else if (cmd == 'move' && state == 'playing' && !isMyTurn() && cell(msg.x, msg.y).size() == 1) {
        makeMove(msg.x, msg.y);
    } else if (cmd == 'replay') {
        if (gameOver()) {
            setupReplay();
        }
    } else {
        if (console) console.log('Unknown or wrong message received',  msg);
        gameChannel.close();
    }
}

function onGameChannelClose(channel) {
    setGameStatus(getPlayerName() + ' left the game', true);
    gameChannel = undefined;
    state = undefined;
    startDemo();
}

function startMaster() {
    state = 'connecting';
    if (Math.floor(Math.random() * 2)) {
        turn = 'cross';
    } else {
        turn = 'nought';
    }
    gameChannel.send({
        cmd: 'start',
        name: getPlayerName(),
        start: turn
    });
    clearBoard();
}

function startSlave() {
    state = 'connecting';
    clearBoard();
}

function isMine(ply) {
    return ((ply == "cross" && isMaster) || (ply == "nought" && !isMaster));
}

function isMyTurn() {
    return !demo && isMine(turn);
}

function setupTurn() {
    if (isMyTurn()) {
        enableMove(turn);
    } else {
        disableMove();
    }
}

function toggleTurn() {
    if (turn == 'cross') {
        turn = 'nought';
    } else {
        turn = 'cross';
    }
    setupTurn();
}

function makeMove(x, y) {
    var c = cell(x, y);
    if (isMyTurn()) {
        gameChannel.send({
            cmd: 'move',
            x: x,
            y: y
        });
    } else {
        c.addClass(turn);
    }
    c.removeClass('selectable');
    if (hasWon()) {
        disableMove();
    } else {
        toggleTurn();
    }
    updateGameStatus();
}

function hasWon(ply) {
    if (!ply) {
        return hasWon('cross') || hasWon('nought');
    } else {
        var res;
        for (var i = 0; i < 3 && !res; i++) {
            if ($('.' + ply + '[ypos=' + i + ']').size() == 3) {
                showWinHorizontal(i);
                res = ply;
            }
            if (!res && $('.' + ply + '[xpos=' + i + ']').size() == 3) {
                showWinVertical(i);
                res = ply;
            }
        }
        if (!res && $('.' + ply + '.diagtd').size() == 3) {
            showWinDiagonal(true);
            res = ply;
        }
        if (!res && $('.' + ply + '.diagdt').size() == 3) {
            showWinDiagonal(false);
            res = ply;
        }
        return res;
    }
}

function gameOver() {
    return (hasWon() != undefined) || ($('.selectable').size() == 0);
}

var demo = false;
var demoTimer;
function startDemo() {
    demo = true;
    demoTimer = setTimeout(initDemo, 10000);
}

function initDemo() {
    turn = 'cross';
    clearBoard();
    demoTimer = setTimeout(makeDemoMove, 2000);
}

function makeDemoMove() {
    if (demo) {
        // The demo is very stupid, it just makes a random move
        // First get all available legal moves left
        var cells = $('.selectable');
        // Choose one at random
        var mv = Math.floor(Math.random() * cells.size());
        // And make the move
        var c = $(cells[mv]);
        var x = c.attr('xpos');
        var y = c.attr('ypos');
        makeMove(x, y);

        if (gameOver()) {
            startDemo();
        } else {
            demoTimer = setTimeout(makeDemoMove, 2000);
        }
    }
}

function stopDemo() {
    if (demo) {
        demo = false;
        clearTimeout(demoTimer);
    }
}

function updateGameStatus() {
    if (!demo) {
        var again = false;
        var txt = "You're playing with " + getPeerName();
        if (gameOver()) {
            var ply = hasWon();
            if (isMine(ply)) {
                txt = txt + " - YOU WON!"
            } else if (ply) {
                txt = txt + " - You lose."
            } else {
                txt = txt + " - It's a draw!"
            }
            again = true;
        } else if (isMyTurn()) {
            txt = txt + " - It's YOUR turn to play";
        } else {
            txt = txt + " - It's their turn to play";
        }
        setGameStatus(txt, false, again);
    }
}

function sanitize(txt) {
    return txt.substr(0, 20).replace(/[&<>]/g, '');
}

function updategui() {
    var name = $('#name').val();
    $('#newgamebutton').attr('disabled', name == '');
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
        channel.services().unregister(id);
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
