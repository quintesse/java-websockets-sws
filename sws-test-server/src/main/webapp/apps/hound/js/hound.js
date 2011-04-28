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
var canvas;
var ctx;
var gameLoop;

var width = 800;
var height = 600;

var SECOND = 1000;
var TICKS_PER_SECOND = 20;

var PREC = 10;
var UNIT = PREC * SECOND;
var TURN_RATE = UNIT; // Time for one full turn
var MOVE_SPEED = 1000; // Time to move 1000 pixels

var turnLeft = false;
var turnRight = false;
var forward = false;
var backward = false;
var fire = false;

var players = [
    {x: 100, y: 100, r: 0}
];

$(document).ready(function() {
    var location = servletLocation('swsdemo');
    app = new App({
        name : 'hound',
        title : "{name}'s Hound game",
        url : location,
        accept : onGameChannelAccept,
        onopen : onGameChannelsOpen,
        onmessage : onGameChannelsMessage,
        onclose : onGameChannelsClose
    });
    initBoard();
    
//    startGameLoop();
});

// Initializes the game area
function initBoard() {
    canvas = $('#board')[0];
    ctx = canvas.getContext('2d');
    $('.hidden').hide();
    if (ctx) {
        $('.hascanvas').fadeIn();
        $('.nocanvas').fadeOut();
    } else {
        $('.hascanvas').fadeOut();
        $('.nocanvas').fadeIn();
    }
    
    if (hasWebSockets()) {
        $('.websocket').fadeIn();
        $('.nowebsocket').fadeOut();
    } else {
        $('.websocket').fadeOut();
        $('.nowebsocket').fadeIn();
    }
    $('.disabled').attr('disabled', true);

    if (hasWebSockets() && canvas.getContext) {
        $('.has_websocket_canvas').fadeIn();
        $(document).keydown(function(ev) {
            if (ev.keyCode == 65) {
                turnLeft = true;
            } else if (ev.keyCode == 68) {
                turnRight = true;
            } else if (ev.keyCode == 87) {
                forward = true;
            } else if (ev.keyCode == 83) {
                backward = true;
            }
        }).keyup(function(ev) {
            if (ev.keyCode == 65) {
                turnLeft = false;
            } else if (ev.keyCode == 68) {
                turnRight = false;
            } else if (ev.keyCode == 87) {
                forward = false;
            } else if (ev.keyCode == 83) {
                backward = false;
            }
        });
    }
}

var isMaster;
function newGame() {
    isMaster = true;
    app.createService();
    startGameLoop();
}

function joinGame() {
    isMaster = false;
    app.joinService();
    startGameLoop();
}

function onGameChannelAccept(service, channel, pkt) {
    return true;
}

function onGameChannelsOpen(app, channel) {
    if (isMaster) {
        startMaster(channel);
    } else {
        startSlave(channel);
    }
}

var state;
function onGameChannelsMessage(app, channel, msg) {
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

function onGameChannelsClose(app, channel) {
    var txt;
    if (channel.isbroken()) {
        txt = "Connection broken";
    } else if (channel.isclosedRemotely) {
        txt = getPeerName() + ' left the game';
    } else {
        txt = getPlayerName() + ' left the game';
    }
    app.setStatus(txt, true);
    state = undefined;
}

function startGameLoop() {
    gameLoop = setInterval(doTick, SECOND / TICKS_PER_SECOND);
}

function stopGameLoop() {
    if (gameLoop) cancelInterval(gameLoop);
    gameLoop = undefined;
}

function doTick() {
    var dt = SECOND / TICKS_PER_SECOND; // realmente deberíamos usar el reloj!
    handleInput(dt);
    sendUpdates();
    draw();
}

function handleInput(dt) {
    var ply = players[0];
    
    var turned = Math.round(TURN_RATE * dt / SECOND);
    if (turnLeft) {
        ply.r = (ply.r + (UNIT - turned)) % UNIT;
    } else if (turnRight) {
        ply.r = (ply.r + turned) % UNIT;
    }    
    var rad = 2 * Math.PI * ply.r / UNIT;
    
    var dist = Math.round(MOVE_SPEED * dt / SECOND);
    var dx = dist * Math.sin(rad);
    var dy = dist * -Math.cos(rad);
    if (forward) {
        ply.x += dx;
        ply.y += dy;
    } else if (backward) {
        ply.x -= dx;
        ply.y -= dy;
    }
}

function sendUpdates() {    
}

function draw() {
    clear();
    drawPlayer(players[0]);
}

function clear() {
    ctx.clearRect(0, 0, width, height);
}

function drawPlayer(ply) {
    ctx.save();
    ctx.translate(ply.x / PREC, ply.y / PREC);
    ctx.rotate(2 * Math.PI * ply.r / UNIT);
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(-3, 5);
    ctx.lineTo(3, 5);
    ctx.fill();
    ctx.restore();
}
