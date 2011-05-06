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

var universe = {};
var gameTime = 0;

$(document).ready(function() {
    var location = servletLocation('swsdemo');
    app = new App({
        name : 'hound',
        title : "{name}'s Hound game",
        url : location,
        clientService : '//sys/hound{"list":1}',
        gameService : '//sys/hound',
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

function joinGame() {
    app.joinService();
    startGameLoop();
}

function onGameChannelAccept(service, channel, pkt) {
    return true;
}

function onGameChannelsOpen(app, channel) {
    startSlave(channel);
}

var state;
function onGameChannelsMessage(app, channel, msg) {
    var cmd = msg.cmd;
    if (cmd == 'startok' && state == 'connecting') {
        peerName = sanitize(msg.name);
        updateGameStatus();
        setupTurn();
        state = 'playing';
    } else if (cmd == 'create') {
        universe = {};
        var updates = msg.universe;
        updateUniverse(updates);
    } else if (cmd == 'update') {
        var updates = msg.universe;
        updateUniverse(updates);
    } else {
        if (console) console.log('Unknown or wrong message received', msg);
        channel.close();
    }
}

function updateUniverse(updates) {
    for (var i = 0; i < updates.length; i++) {
        var upd = updates[i];
        if (upd['$cmd'] != 'remove') {
            var obj = universe[upd.id];
            if (obj) {
                updateObject(obj, upd);
            } else {
                createObject(upd);
            }
        } else {
            removeObject(upd.id);
        }
    }
    gameTime = (new Date()).getTime();
}

function createObject(upd) {
    var obj = {};
    for (var attr in upd) {
        obj[attr] = upd[attr];
    }
    universe[upd.id] = obj;
    if (console) console.log('CREATED', obj);
}

function updateObject(obj, upd) {
    for (var attr in upd) {
        obj[attr] = upd[attr];
    }
    if (console) console.log('UPDATED', upd);
}

function removeObject(id) {
    delete universe[id];
    if (console) console.log('REMOVED', id);
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
    var now = (new Date()).getTime();
    var dt = (now - gameTime) / 1000;
    handleInput(dt);
    sendUpdates();
    simulateUniverse(dt);
    draw();
    gameTime = now;
}

function handleInput(dt) {
    var ply = players[0];
    
    var turned = Math.round(TURN_RATE * dt);
    if (turnLeft) {
        ply.r = (ply.r + (UNIT - turned)) % UNIT;
    } else if (turnRight) {
        ply.r = (ply.r + turned) % UNIT;
    }    
    var rad = 2 * Math.PI * ply.r / UNIT;
    
    var dist = Math.round(MOVE_SPEED * dt);
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

function simulateUniverse(dt) {
    for (var idx in universe) {
        var obj = universe[idx];
        if (obj.vx) {
            obj.x += obj.vx * dt;
        }
        if (obj.vy) {
            obj.y += obj.vy * dt;
        }
    }
}

function draw() {
    clear();
    drawPlayer(players[0]);
    drawUniverse();
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

function drawUniverse() {
    for (var idx in universe) {
        var obj = universe[idx];
        if (obj.type == 1) {
            drawCircle(obj);
        } else if (obj.type == 2) {
            drawBox(obj);
        } else if (obj.type == 3) {
            drawTriangle(obj);
        } else {
            if (console) console.log('Unknown universe object type', obj.type);
        }
    }
}

function drawCircle(obj) {
    ctx.save();
    ctx.translate(obj.x / PREC, obj.y / PREC);
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
}

function drawBox(obj) {
    ctx.save();
    ctx.translate(obj.x / PREC, obj.y / PREC);
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
}

function drawTriangle(obj) {
    ctx.save();
    ctx.translate(obj.x / PREC, obj.y / PREC);
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
}
