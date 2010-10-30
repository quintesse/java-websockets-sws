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
import java.util.UUID;

/**
 *
 * @author Tako Schotanus <tako@codejive.org>
 */
public final class LocalStableWebSocket implements StableWebSocket {
    private SwsManager manager;
    private SwsEventListener listener;
    
    private String id;
    private boolean open;

    public LocalStableWebSocket(SwsManager manager, SwsEventListener listener) {
        this.manager = manager;
        this.listener = listener;
        id = "sys";
        open = true;
        onOpen();
    }

    @Override
    public String getId() {
        return id;
    }

    @Override
    public boolean isOpen() {
        return open;
    }

    @Override
    public void sendMessage(String msg) throws IOException {
        onMessage(msg);
    }

    @Override
    public void close() {
        if (open) {
            open = false;
            onClose();
        }
    }

    @Override
    public void onOpen() {
        manager.addSocket(this);
        if (listener != null) {
            listener.onOpen(this);
        }
    }

    @Override
    public void onMessage(String msg) {
        if (listener != null) {
            listener.onMessage(this, msg);
        }
    }

    @Override
    public void onClose() {
        if (listener != null) {
            listener.onClose(this);
        }
        manager.removeSocket(id);
        manager = null;
    }

    @Override
    public String toString() {
        return "LocalStableWebSocket(" + id + ")";
    }

}
