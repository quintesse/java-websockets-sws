<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
   "http://www.w3.org/TR/html4/loose.dtd">

<html>
    <head>
        <title>Tic Tac Toe</title>
        <link type="text/css" href="css/tictactoe/tictactoe.css" rel="stylesheet" />
        <link type="text/css" href="css/jquery-ui-1.8.2.custom.css" rel="stylesheet" />
        <script type='text/javascript' src="js/jquery-1.4.2.min.js"></script>
        <script type='text/javascript' src="js/jquery-ui-1.8.2.custom.min.js"></script>
        <script type='text/javascript' src="js/sws.js"></script>
        <script type='text/javascript' src="js/webchannel.js"></script>
        <script type='text/javascript' src="js/tictactoe/tictactoe.js"></script>
    </head>
    <body id="main">
        <h1>Tic Tac Toe</h1>

        <p class="warningbox unsupported">
            Sorry, your browser does not support WebSockets, which means that you will not be
            able to use the application on this page. You can find information about compatible
            browsers <a href="http://en.wikipedia.org/wiki/WebSockets" target="_blank">here</a>
        </p>

        <div class="supported">
            <p id="connectform" class="formbox">
                <input id="connectbutton" type="button" value="Connect" onClick="serverConnect()">
                <span id="status">Click button to connect</span>
                <input id="disconnectbutton" type="button" value="Disconnect" class="hidden" onClick="serverDisconnect()">
            </p>

            <p id="startform" class="formbox hidden">
                Name <input id="name" type="text" size="20" maxlength="20" onkeyup="updategui()"><br>
                <select id="games" size="8" class="hidden" onChange="selectGame()">
                </select><br>
                <input id="newgamebutton" type="button" value="New Game" class="disabled" onClick="newGame()">
                <input id="joingamebutton" type="button" value="Join Game" class="hidden disabled" onClick="joinGame()">
            </p>

            <p id="waitform" class="formbox hidden">
                <input id="stopwaitbutton" type="button" value="Stop Waiting" onClick="stopWait()">
                <span id="waitstatus"></span>
            </p>

            <p id="gameform" class="formbox hidden">
                <input id="leavegamebutton" type="button" value="Leave Game" onClick="leaveGame()">
                <span id="gamestatus"></span>
                <input id="playagainbutton" class="hidden" type="button" value="Play Again" onClick="replayGame()">
            </p>
        </div>

        <div id="board">
            <img id="cell00" class="cell diagtd" xpos="0" ypos="0" src="images/blank.gif" width="60px" height="60px">
            <img id="cell10" class="cell" xpos="1" ypos="0" src="images/blank.gif" width="60px" height="60px">
            <img id="cell20" class="cell diagdt" xpos="2" ypos="0" src="images/blank.gif" width="60px" height="60px">
            <img id="cell01" class="cell" xpos="0" ypos="1" src="images/blank.gif" width="60px" height="60px">
            <img id="cell11" class="cell diagtd diagdt" xpos="1" ypos="1" src="images/blank.gif" width="60px" height="60px">
            <img id="cell21" class="cell" xpos="2" ypos="1" src="images/blank.gif" width="60px" height="60px">
            <img id="cell02" class="cell diagdt" xpos="0" ypos="2" src="images/blank.gif" width="60px" height="60px">
            <img id="cell12" class="cell" xpos="1" ypos="2" src="images/blank.gif" width="60px" height="60px">
            <img id="cell22" class="cell diagtd" xpos="2" ypos="2" src="images/blank.gif" width="60px" height="60px">

            <!-- Strokes for winning combination : horizontal, vertical and diagonal -->
            <img id="strokeh" class="stroke" src="images/tictactoe/strokeh.png" width="226px" height="24px">
            <img id="strokev" class="stroke" src="images/tictactoe/strokev.png" width="24px" height="226px">
            <img id="stroked" class="stroke" src="images/tictactoe/stroketb.png" width="226px" height="226px">
        </div>

    </body>
</html>
