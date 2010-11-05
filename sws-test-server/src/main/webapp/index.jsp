<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
   "http://www.w3.org/TR/html4/loose.dtd">

<html>
    <head>
        <title>StableWebSocket Test</title>
        <style type='text/css'>
            body {
                font: 62.5% "Trebuchet MS", sans-serif;
            }
            .spinner {
                background-image: url(images/spinner.gif);
                background-position: center;
                background-repeat: no-repeat
            }
        </style>
        <link type="text/css" href="css/jquery-ui-1.8.2.custom.css" rel="stylesheet" />
        <script type='text/javascript' src="js/jquery-1.4.2.min.js"></script>
        <script type='text/javascript' src="js/jquery-ui-1.8.2.custom.min.js"></script>
        <script type='text/javascript' src="js/sws.js"></script>
        <script type='text/javascript' src="js/webchannel.js"></script>
        <script type='text/javascript'>
            if (!window.WebSocket) {
                alert('Sorry, you need a browser that supports WebSockets');
            }

            var channelCount = 4;

            var sws = null;
            var wch = [];
            $(document).ready(function() {
                setSwsStatusMessage("Disonnected");
                for (var idx = 0; idx < channelCount; idx++) {
                    setWchStatusMessage(idx, "Disonnected");
                }
                updategui();
            });

            function updategui() {
                $('#openbutton').attr('disabled', (sws != null && !sws.isclosed()));
                $('#closebutton').attr('disabled', (sws == null || !sws.isconnected()));
                $('#disconnectbutton').attr('disabled', (sws == null || !sws.isready()));

                for (var idx = 0; idx < channelCount; idx++) {
                    $('#wchopenbutton' + idx).attr('disabled', (sws == null || !sws.isconnected() || (wch[idx] != null && !wch[idx].isclosed())));
                    $('#wchclosebutton' + idx).attr('disabled', (sws == null || !sws.isconnected() || wch[idx] == null || !wch[idx].isconnected()));
                    $('#wchextra' + idx).find('*').attr('disabled', (sws == null || !sws.isconnected() || wch[idx] == null || !wch[idx].isconnected()));
                }
            }

            function swsOpen() {
                var location = 'ws://' + document.location.host + document.location.pathname + 'swsdemo';
                sws = new StableWebSocket(location);
                sws.logging = true;
                sws.onopen.bind(swsOnOpen);
                sws.onclose.bind(swsOnClose);
                sws.ondisconnect.bind(swsOnDisconnect);
                sws.onreconnect.bind(swsOnReconnect);

                // The following line enables us to receive channel requests
                // (otherwise we would have to wait until we opened the
                // first channel from this side)
                WebChannelManager.associate(sws);

                $('#main').addClass('spinner');
                $('#openbutton').attr('disabled', true);
                setSwsStatusMessage("Connecting...");
            }

            function swsOnOpen() {
                $('#main').removeClass('spinner');
                setSwsStatusMessage("Connected [" + sws.id() + "]");
                updategui();
            }

            function swsOnDisconnect() {
                $('#main').addClass('spinner');
                setSwsStatusMessage("Connection problems...");
                updategui();
            }

            function swsOnReconnect() {
                $('#main').removeClass('spinner');
                setSwsStatusMessage("Reconnected");
                updategui();
            }

            function swsOnClose() {
                $('#main').removeClass('spinner');
                setSwsStatusMessage("Disonnected");
                updategui();
            }

            function setSwsStatusMessage(txt) {
                $('#status').text(txt);
            }

            function toggleKeepAlive() {
                if ($('#keepalive').is(':checked')) {
                    sws.setKeepAlive(30000);
                } else {
                    sws.setKeepAlive(0);
                }
            }

            function wchOpen(idx, service, msgfunc) {
                var peer = $('#wchpeer' + idx).val();
                wch[idx] = new WebChannel(sws, service, peer);
                wch[idx].logging = true;
                wch[idx].onopen.bind(function(channel) { wchOnOpen(idx) });
                wch[idx].onclose.bind(function(channel) { wchOnClose(idx) });
                wch[idx].ondisconnect.bind(function(channel) { wchOnDisconnect(idx) });
                wch[idx].onreconnect.bind(function(channel) { wchOnReconnect(idx) });
                if (msgfunc) {
                    wch[idx].onmessage.bind(msgfunc);
                } else {
                    wch[idx].onmessage.bind(function(channel, msg) { setWchOutputMessage(idx, JSON.stringify(msg)) });
                }
                $('#main').addClass('spinner');
                $('#wchopenbutton').attr('disabled', true);
                setWchStatusMessage("Connecting...");
            }

            function wchOnOpen(idx) {
                $('#main').removeClass('spinner');
                setWchStatusMessage(idx, "Connected");
                updategui();
            }

            function wchOnDisconnect(idx) {
                $('#main').addClass('spinner');
                setWchStatusMessage(idx, "Connection problems...");
                updategui();
            }

            function wchOnReconnect(idx) {
                $('#main').removeClass('spinner');
                setWchStatusMessage(idx, "Reconnected");
                updategui();
            }

            function wchOnClose(idx) {
                $('#main').removeClass('spinner');
                setWchStatusMessage(idx, "Disonnected");
                updategui();
            }

            function setWchStatusMessage(idx, txt) {
                $('#wchstatus' + idx).text(txt);
            }

            function setWchOutputMessage(idx, txt) {
                $('#wchoutput' + idx).text(txt);
            }

            function echoSend() {
                var txt = $('#echotxt').val();
                wch[0].send({ echo : txt });
            }

            function register() {
                ServiceManager.register("foobar", function() { /* do nothing */ });
            }

            function unregister() {
                ServiceManager.unregister("foobar");
            }
        </script>
    </head>
    <body id="main">
        <h1>StableWebSocket Test</h1>
        <span id="status">...</span><br>
        <input id="openbutton" type="button" onclick="swsOpen()" value="Open">
        <input id="closebutton" type="button" onclick="sws.close()" value="Close">
        <input id="disconnectbutton" type="button" onclick="sws._disconnect()" value="Simulate Disconnect">
        <input id="terminatebutton" type="button" onclick="sws.maxReconnect = 0; sws._disconnect()" value="Terminate Connection">
        <input id="keepalive" type="checkbox" onclick="toggleKeepAlive()" checked>Keep-alive

        <p><br>
        <h1>WebChannel Test 1 - Echo</h1>
        <span id="wchstatus0">...</span><br>
        <input id="wchpeer0" type="text" size="40" value="sys"><br>
        <input id="wchopenbutton0" type="button" onclick="wchOpen(0, 'echo')" value="Open">
        <input id="wchclosebutton0" type="button" onclick="wch[0].close()" value="Close">
        <span id="wchextra0">
        <input id="echotxt" type="text">
        <input id="echobutton" type="button" onclick="echoSend()" value="Send">
        </span>
        <br><span id="wchoutput0">...</span>

        <p><br>
        <h1>WebChannel Test 2 - Time</h1>
        <span id="wchstatus1">...</span><br>
        <input id="wchpeer1" type="text" size="40" value="sys"><br>
        <input id="wchopenbutton1" type="button" onclick="wchOpen(1, 'time')" value="Open">
        <input id="wchclosebutton1" type="button" onclick="wch[1].close()" value="Close">
        <span id="wchextra1"></span>
        <br><span id="wchoutput1">...</span>

        <p><br>
        <h1>WebChannel Test 3 - Clients</h1>
        <span id="wchstatus2">...</span><br>
        <input id="wchpeer2" type="text" size="40" value="sys"><br>
        <input id="wchopenbutton2" type="button" onclick="wchOpen(2, 'clients')" value="Open">
        <input id="wchclosebutton2" type="button" onclick="wch[2].close()" value="Close">
        <span id="wchextra2"></span>
        <br><span id="wchoutput2">...</span>

        <p><br>
        <h1>WebChannel Test 4 - Services</h1>
        <span id="wchstatus3">...</span><br>
        <input id="wchpeer3" type="text" size="40" value="sys"><br>
        <input id="wchopenbutton3" type="button" onclick="wchOpen(3, 'services')" value="Open">
        <input id="wchclosebutton3" type="button" onclick="wch[3].close()" value="Close">
        <span id="wchextra3"></span>
        <br><span id="wchoutput3">...</span>

        <p><br>
        <input id="wchregister" type="button" onclick="register()" value="Register">
        <input id="wchunregister" type="button" onclick="unregister()" value="Unregister">
    </body>
</html>
