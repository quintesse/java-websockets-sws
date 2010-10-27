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

package org.codejive.web.sws;

import java.io.IOException;
import java.util.Timer;
import java.util.TimerTask;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 *
 * @author Tako Schotanus <tako@codejive.org>
 */
public class StableWebSocket implements WebSocket, WebSocketEventListener {

    public enum SwsState { created, connecting, connected, reconnecting, closing, closed };

    private String id;
    private SwsManager manager;
    private SwsEventListener listener;
    private WebSocketAdapter socket;

    private Timer disconnectTimer;

    private SwsState state;

    private final String sws_session;
    private final String sws_ping;
    private final String sws_reconnect;
    private final String sws_close;

    private static final String SWS_COOKIE = "<<SWS:INIT>>1";
    private static final String SWS_SESSION = "<<SWS:SESSION>>";
    private static final String SWS_RECONNECT = "<<SWS:RECONNECT>>";
    private static final String SWS_PING = "<<SWS:PING>>";
    private static final String SWS_CLOSE = "<<SWS:CLOSE>>";

    private static final long DISCONNECT_DELAY = 60000;

    private static final Logger log = LoggerFactory.getLogger(StableWebSocket.class);

    public StableWebSocket(SwsManager manager, SwsEventListener listener) {
        this.id = UUID.randomUUID().toString();
        this.manager = manager;
        this.listener = listener;
        socket = null;
        state = SwsState.created;
        sws_session = SWS_SESSION + id;
        sws_ping = SWS_PING + id;
        sws_reconnect = SWS_RECONNECT + id;
        sws_close = SWS_CLOSE + id;
        log.info("SWS initialized. State CREATED. Id {}", id);
    }

    public String getId() {
        return id;
    }

    public void setSocket(WebSocketAdapter socket) {
        this.socket = socket;
        socket.setEventListener(this);
    }

    @Override
    public boolean isOpen() {
        return state == SwsState.connected || state == SwsState.reconnecting;
    }

    @Override
    public void sendMessage(String msg) throws IOException {
        if (isOpen()) {
            socket.sendMessage(msg);
        } else {
            throw new IOException("Socket not open");
        }
    }

    @Override
    public void close() {
        log.info("Disconnecting SWS. State CLOSED. Id {}", id);
        try {
            socket.sendMessage(sws_close);
        } catch (IOException ex) {
            log.error("Could not send CLOSE message to client", ex);
        }
        _close();
        try {
            socket.close();
        } catch (IOException ex) {
            // Ignore
        }
    }

    @Override
    public void onOpen() {
        log.info("Underlying socket connected. State CONNECTING. Id {}", id);
        state = SwsState.connecting;
    }

    @Override
    public void onMessage(String msg) {
        if (SWS_COOKIE.equals(msg)) {
            // Handle connect request
            handleConnect();
        } else if (msg.startsWith(SWS_RECONNECT)) {
            // Handle reconnect request
            handleReconnect(msg);
        } else if (sws_ping.equals(msg)) {
            // PING message, nothing to do
            log.debug("Received PING message from client");
        } else if (sws_close.equals(msg)) {
            // Client wants to close the connection
            handleClose();
        } else {
            if (state == SwsState.connected) {
                if (listener != null) {
                    // ALL other messages go to the listener
                    listener.onMessage(this, msg);
                }
            } else {
                log.error("Received unexpected message. Ignoring. State {}", state);
                close();
            }
        }
    }

    private void handleConnect() {
        if (state == SwsState.connecting) {
            try {
                socket.sendMessage(sws_session);
                state = SwsState.connected;
                log.info("Received protocol cookie. State CONNECTED. Id {}", id);
                if (listener != null) {
                    listener.onOpen(this);
                }
            } catch (Throwable th) {
                log.error("Could not establish connection with client", th);
                close();
            }
        } else {
            log.error("Received unexpected connect request. Ignoring. State {}", state);
            close();
        }
    }

    private void handleReconnect(String msg) {
        if (state == SwsState.connecting) {
            String sesId = msg.substring(SWS_RECONNECT.length());
            log.info("Received reconnect request from client for SWS {}", sesId);
            if (!reattachSocket(sesId)) {
                log.error("Trying to re-establish connection with unknown SWS");
                close();
            } else {
                log.debug("Shutting down temporary handler");
                _close();
            }
        } else if (state == SwsState.reconnecting && sws_reconnect.equals(msg)) {
            try {
                if (disconnectTimer != null) {
                    disconnectTimer.cancel();
                }
                socket.sendMessage(sws_session);
                state = SwsState.connected;
                log.info("Re-established connection with client. State CONNECTED. Id {}", id);
                if (listener != null) {
                    listener.onReconnect(this);
                }
            } catch (Throwable th) {
                log.error("Could not re-establish connection with client", th);
                close();
            }
        } else {
            log.error("Received unexpected reconnect request. Ignoring. State {}", state);
            close();
        }
    }

    private void handleClose() {
        log.info("Received close message from client");
        _close();
    }

/*
    @Override
    public void onMessage(String msg) {
        switch (state) {
            case connecting:
                // Waiting for first message from client
                if (SWS_COOKIE.equals(msg)) {
                    try {
                        socket.sendMessage(sws_session);
                        state = SwsState.connected;
                        log.info("Received protocol cookie. State CONNECTED. Id {}", id);
                        if (listener != null) {
                            listener.onOpen(this);
                        }
                    } catch (Throwable th) {
                        log.error("Could not establish connection with client", th);
                        close();
                    }
                } else if (msg.startsWith(SWS_RECONNECT)) {
                    String sesId = msg.substring(SWS_RECONNECT.length());
                    log.info("Received reconnect request from client for SWS {}", sesId);
                    if (!reattachSocket(sesId)) {
                        log.error("Trying to re-establish connection with unknown SWS");
                        close();
                    } else {
                        log.debug("Shutting down temporary handler");
                        _close();
                    }
                } else {
                    log.error("Received unexpected message");
                    close();
                }
                break;
            case reconnecting:
                // Waiting for reconnect message from client
                if (sws_reconnect.equals(msg)) {
                    try {
                        if (disconnectTimer != null) {
                            disconnectTimer.cancel();
                        }
                        socket.sendMessage(sws_session);
                        state = SwsState.connected;
                        log.info("Re-established connection with client. State CONNECTED. Id {}", id);
                        if (listener != null) {
                            listener.onReconnect(this);
                        }
                    } catch (Throwable th) {
                        log.error("Could not re-establish connection with client", th);
                        close();
                    }
                } else {
                    log.error("Received unexpected message");
                    close();
                }
                break;
            case connected:
                if (sws_ping.equals(msg)) {
                    // PING message, nothing to do
                    log.debug("Received PING message from client");
                } else if (SWS_COOKIE.equals(msg)) {
                    log.info("Received unexpected init message from client, ignoring");
                } else if (sws_reconnect.equals(msg)) {
                    log.info("Received unexpected reconnect message from client, ignoring");
                } else if (sws_close.equals(msg)) {
                    // Client wants to close the connection
                    log.info("Received close message from client");
                    _close();
                } else {
                    if (listener != null) {
                        // ALL other messages go to the listener
                        listener.onMessage(this, msg);
                    }
                }
                break;
            default:
                log.info("Received unexpected message. Ignoring. State {}", state);
        }
    }
*/

    @Override
    public void onClose() {
        if (state != SwsState.closed) {
            log.info("Underlying socket disconnected unexpectedly. State RECONNECTING. Id {}", id);
            state = SwsState.reconnecting;

            // Start the disconnect timer
            disconnectTimer = new Timer();
            disconnectTimer.schedule(new TimerTask() {
                @Override
                public void run() {
                    log.info("Disconnect timer fired. Id {}", id);
                    _close();
                    try {
                        socket.close();
                    } catch (IOException ex) {
                        // Ignore
                    }
                }
            }, DISCONNECT_DELAY);

            if (listener != null) {
                listener.onDisconnect(this);
            }
        }
    }

    private void _close() {
        log.info("SWS shut down. State CLOSED. Id {}", id);
        state = SwsState.closed;
        if (listener != null) {
            listener.onClose(this);
            listener = null;
        }
        manager.removeSocket(id);
        manager = null;
        if (socket != null) {
            socket.setEventListener(null);
        }
    }

    private boolean reattachSocket(String swsId) {
        StableWebSocket sws = manager.findSocket(swsId);
        if (sws != null) {
            sws.setSocket(socket);
            socket = null;
            sws.onMessage(sws.sws_reconnect);
        }
        return (sws != null);
    }

    @Override
    public String toString() {
        return "StableWebSocket(" + id + ")";
    }
}
