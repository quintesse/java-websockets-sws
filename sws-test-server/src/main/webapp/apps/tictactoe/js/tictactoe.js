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
    initApp({
        name : 'tictactoe',
        title : "{name}'s TicTacToe game",
        accept : onGameChannelAccept,
        onopen : onGameChannelsOpen,
        onmessage : onGameChannelsMessage,
        onclose : onGameChannelsClose
    });
    initBoard();
    startDemo();
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
        stroke.attr('src', 'images/stroketb.png');
    } else {
        stroke.attr('src', 'images/strokebt.png');
    }
    stroke.css('visibility', 'visible');
}

var isMaster;
function newGame() {
    isMaster = true;
    stopDemo();
    appCreateService();
}

function joinGame() {
    isMaster = false;
    stopDemo();
    appJoinService();
}

function replayGame() {
    appChannels[0].send({
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

function onGameChannelAccept(service, channel, pkt) {
    channel.services().unregister(service);
    return true;
}

function onGameChannelsOpen(channel) {
    if (isMaster) {
        startMaster();
    } else {
        startSlave();
    }
}

var turn;
var state;
function onGameChannelsMessage(channel, msg) {
    var cmd = msg.cmd;
    if (cmd == 'start' && !isMaster && state == 'connecting') {
        peerName = sanitize(msg.name);
        turn = msg.start;
        updateGameStatus();
        channel.send({
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
        channel.close();
    }
}

function onGameChannelsClose(channel) {
    setAppStatus(getPlayerName() + ' left the game', true);
    state = undefined;
    startDemo();
}

var peerName;
function getPeerName() {
    return peerName;
}

function startMaster() {
    state = 'connecting';
    if (Math.floor(Math.random() * 2)) {
        turn = 'cross';
    } else {
        turn = 'nought';
    }
    appChannels[0].send({
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
        appChannels[0].send({
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
        setAppStatus(txt, false, again);
    }
}
