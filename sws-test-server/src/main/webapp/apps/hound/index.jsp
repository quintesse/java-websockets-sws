<%-- 
    Document   : hound
    Created on : Nov 26, 2010, 7:55:36 PM
    Author     : Tako Schotanus <tako@codejive.org>
--%>

<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
   "http://www.w3.org/TR/html4/loose.dtd">

<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>Hound</title>
        <link type="text/css" href="../css/styles.css" rel="stylesheet" />
        <link type="text/css" href="css/hound.css" rel="stylesheet" />
        <link type="text/css" href="../../css/jquery-ui-1.8.2.custom.css" rel="stylesheet" />
        <script type='text/javascript' src="../../js/jquery-1.4.2.min.js"></script>
        <script type='text/javascript' src="../../js/jquery-ui-1.8.2.custom.min.js"></script>
        <script type='text/javascript' src="../../js/sws.js"></script>
        <script type='text/javascript' src="../../js/webchannel.js"></script>
        <script type='text/javascript' src="../js/connect.js"></script>
        <script type='text/javascript' src="js/hound.js"></script>
    </head>
    <body id="main">
        <h1>Hound</h1>

        <p class="warningbox nowebsocket">
            Sorry, your browser does not support WebSockets, which means that you will not be
            able to use the application on this page. You can find information about compatible
            browsers <a href="http://en.wikipedia.org/wiki/WebSockets" target="_blank">here</a>
        </p>

        <p class="warningbox nocanvas">
            Sorry, your browser does not support the Canvas tag, which means that you will not be
            able to use the application on this page. You can find information about compatible
            browsers <a href="http://en.wikipedia.org/wiki/Canvas_element" target="_blank">here</a>
        </p>

        <div class="has_websocket_canvas">
            <p id="connectform" class="formbox">
                <input id="connectbutton" type="button" value="Connect" onClick="app.start()">
                <span id="status">Click button to connect</span>
                <input id="disconnectbutton" type="button" value="Disconnect" class="hidden" onClick="app.stop()">
            </p>

            <p id="waitform" class="formbox hidden">
                <input id="stopwaitbutton" type="button" value="Stop Waiting" onClick="app.cancelService()">
                <span id="waitstatus"></span>
            </p>

            <p id="gameform" class="formbox hidden">
                <input id="leavegamebutton" type="button" value="Leave Game" onClick="app.leaveService()">
                <span id="gamestatus"></span>
                <input id="playagainbutton" class="hidden" type="button" value="Play Again" onClick="replayGame()">
            </p>

            <p id="startform" class="formbox hidden">
                Name <input id="name" type="text" size="20" maxlength="20" onkeyup="updategui()"><br>
                <select id="games" size="8" class="hidden" onChange="selectApp()">
                </select><br>
                <input id="newgamebutton" type="button" value="New Game" class="disabled" onClick="newGame()">
                <input id="joingamebutton" type="button" value="Join Game" class="hidden disabled" onClick="joinGame()">
            </p>
        </div>

        <div id="container">
            <canvas id="board" width="800" height="600"></canvas>
        </div>

    </body>
</html>
