<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
   "http://www.w3.org/TR/html4/loose.dtd">

<html>
    <head>
        <title>Tic Tac Toe</title>
        <style type='text/css'>
            body {
                font: normal normal normal 12px/normal 'helvetica neue', helvetica, arial, verdana, tahoma, 'sans serif';
                min-width: 40em;
                max-width: 73em;
            }
            p {
                margin: 0px;
                padding: 0px;
                font-size: 14px;
                margin-bottom: 1.5em;
            }
            .spinner {
                background-image: url(images/spinner.gif);
                background-position: center;
                background-repeat: no-repeat
            }
            .warningbox {
                border: 3px solid red;
                padding: 1em;
                border-radius: 8px;
            }
            .cell {
                position: absolute;
                left: 0px; top: 0px;
            }
        </style>
        <link type="text/css" href="css/jquery-ui-1.8.2.custom.css" rel="stylesheet" />
        <script type='text/javascript' src="js/jquery-1.4.2.min.js"></script>
        <script type='text/javascript' src="js/jquery-ui-1.8.2.custom.min.js"></script>
        <script type='text/javascript' src="js/sws.js"></script>
        <script type='text/javascript' src="js/webchannel.js"></script>
        <script type='text/javascript'>
            $(document).ready(function() {
                initBoard();
            });

            function initBoard() {
                var p = $('#board').offset();
                var boardLeft = p.left + 50;
                var boardTop = p.top + 50;
                var cellWidth = 100;
                var cellHeight = 100;
                for (var y = 0; y < 3; y++) {
                    for (var x = 0; x < 3; x++) {
                        var cell = $('#cell' + x + y);
                        var px = boardLeft + cellWidth * x;
                        var py = boardTop + cellHeight * y;
                        cell.offset({
                            top: py,
                            left: px
                        });
                    }
                }
            }
        </script>
    </head>
    <body id="main">
        <h1>Tic Tac Toe</h1>

        <p class="warningbox">
            Sorry, your browser does not support WebSockets, you will not be able to use
            the application on this page. You can find information about compatible
            browsers <a href="http://en.wikipedia.org/wiki/WebSockets" target="_blank">here</a>
        </p>

        <img id="board" src="images/tictactoe/tictactoe.png">
        <img id="cell00" class="cell" src="images/tictactoe/nought.png" width="60px" height="60px">
        <img id="cell10" class="cell" src="images/tictactoe/cross.png" width="60px" height="60px">
        <img id="cell20" class="cell" src="images/tictactoe/nought.png" width="60px" height="60px">
        <img id="cell01" class="cell" src="images/tictactoe/cross.png" width="60px" height="60px">
        <img id="cell11" class="cell" src="images/tictactoe/nought.png" width="60px" height="60px">
        <img id="cell21" class="cell" src="images/tictactoe/cross.png" width="60px" height="60px">
        <img id="cell02" class="cell" src="images/tictactoe/nought.png" width="60px" height="60px">
        <img id="cell12" class="cell" src="images/tictactoe/cross.png" width="60px" height="60px">
        <img id="cell22" class="cell" src="images/tictactoe/nought.png" width="60px" height="60px">
        
    </body>
</html>
