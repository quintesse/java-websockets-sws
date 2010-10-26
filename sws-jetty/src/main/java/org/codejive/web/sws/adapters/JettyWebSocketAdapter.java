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
import org.codejive.web.sws.WebSocketAdapter;
import org.codejive.web.sws.WebSocketEventListener;
import org.eclipse.jetty.websocket.WebSocket.Outbound;

/**
 *
 * @author Tako Schotanus <tako@codejive.org>
 */
public class JettyWebSocketAdapter implements WebSocketAdapter {
    private Outbound outbound;
    private WebSocketEventListener listener;

    public JettyWebSocketAdapter(Outbound outbound) {
        this.outbound = outbound;
    }

    @Override
    public boolean isOpen() {
        return outbound.isOpen();
    }

    @Override
    public void close() {
        outbound.disconnect();
    }

    @Override
    public void sendMessage(String msg) throws IOException {
        outbound.sendMessage(msg);
    }

    @Override
    public void setEventListener(WebSocketEventListener listener) {
        this.listener = listener;
    }

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
}
