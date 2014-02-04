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

package org.codejive.web.sws.adapters;

import java.io.IOException;

import javax.websocket.SendHandler;
import javax.websocket.SendResult;
import javax.websocket.Session;

import org.codejive.web.sws.WebSocketAdapter;
import org.codejive.web.sws.WebSocketEventListener;

/**
 *
 * @author Tako Schotanus <tako@codejive.org>
 */
public class JeeWebSocketAdapter implements WebSocketAdapter, SendHandler {
    private Session session;
    private WebSocketEventListener listener;

    public JeeWebSocketAdapter(Session session) {
        this.session = session;
    }

    // ***************************************************************************
    // SWS WebSocketEventListener
    // ***************************************************************************

    @Override
    public boolean isOpen() {
        return session.isOpen();
    }

    @Override
    public void close() throws IOException {
        session.close();
    }

    @Override
    public void sendMessage(String msg) throws IOException {
        session.getAsyncRemote().sendText(msg, this);
    }

    // ***************************************************************************
    // SWS WebSocketAdapter
    // ***************************************************************************

    @Override
    public void setEventListener(WebSocketEventListener listener) {
        this.listener = listener;
    }

    // ***************************************************************************
    // JEE JSR-356 WebSocketListener
    // ***************************************************************************

    @Override
    public void onOpen() {
        if (listener != null) {
            listener.onOpen();
        }
    }

    @Override
    public void onMessage(String msg) {
        if (listener != null) {
            listener.onMessage(msg);
        }
    }

    @Override
    public void onClose() {
        if (listener != null) {
            listener.onClose();
        }
    }

    // ***************************************************************************
    // JEE JSR-356 SendHandler
    // ***************************************************************************

    @Override
    public void onResult(SendResult arg0) {
        // Not interested
    }
}
