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

import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 *
 * @author Tako Schotanus <tako@codejive.org>
 */
public class SwsManager {
    private Map<String, StableWebSocket> sockets;
    private EventDispatcher<SwsManagerChangeEventListener> changeListeners;

    private static final Logger log = LoggerFactory.getLogger(SwsManager.class);

    public SwsManager() {
        log.info("Initializing the SwsManager");
        sockets = new ConcurrentHashMap<String, StableWebSocket>();
        changeListeners = new EventDispatcher<SwsManagerChangeEventListener>() {};
    }

    public Map<String, StableWebSocket> getSockets() {
        return Collections.unmodifiableMap(sockets);
    }

    public StableWebSocket findSocket(String swsId) {
        return sockets.get(swsId);
    }

    public WebSocketEventListener addSocket(StableWebSocket sws) {
        if (sockets.put(sws.getId(), sws) == null) {
            changeListeners.fire().onSocketAdd(this, sws);
        }
        return sws;
    }
    
    public void removeSocket(String swsId) {
        StableWebSocket sws = sockets.remove(swsId);
        if (sws != null) {
            changeListeners.fire().onSocketRemove(this, sws);
        }
    }

    public void addChangeListener(SwsManagerChangeEventListener listener) {
        changeListeners.addListener(listener);
    }

    public void removeChangeListener(SwsManagerChangeEventListener listener) {
        changeListeners.removeListener(listener);
    }

    public void shutdown() {
        log.info("Shutting down the SwsManager");
        for (StableWebSocket sws : sockets.values()) {
            sws.close();
        }
    }
}
