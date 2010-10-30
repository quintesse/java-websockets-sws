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

package org.codejive.web.channel.services;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.codejive.web.channel.Service;
import org.codejive.web.channel.WebChannel;
import org.codejive.web.channel.WebChannelAdapter;
import org.codejive.web.channel.WebChannelManager;
import org.codejive.web.sws.StableWebSocket;
import org.codejive.web.sws.SwsManager;
import org.codejive.web.sws.SwsManagerChangeEventListener;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 *
 * @author Tako Schotanus <tako@codejive.org>
 */
public class ClientsService extends WebChannelAdapter implements Service, SwsManagerChangeEventListener {
    private SwsManager swsManager;
    private WebChannelManager wchManager;

    private Map<String, WebChannel> acceptedServices;
    private Map<String, JSONObject> clientInfo;
    private Map<String, WebChannel> updateChannels;

    private static final Logger log = LoggerFactory.getLogger(ClientsService.class);

    public ClientsService(SwsManager swsManager, WebChannelManager wchManager) {
        this.swsManager = swsManager;
        this.wchManager = wchManager;
        acceptedServices = new ConcurrentHashMap<String, WebChannel>();
        clientInfo = new ConcurrentHashMap<String, JSONObject>();
        updateChannels = new ConcurrentHashMap<String, WebChannel>();
    }

    @Override
    public String getDescription() {
        return "Informs about connected clients";
    }

    @Override
    public void init() {
        swsManager.addChangeListener(this);
        for (StableWebSocket socket : swsManager.getSockets().values()) {
            addClientInfoUpdater(socket);
        }
    }

    @Override
    public boolean accept(WebChannel channel, JSONObject msg) {
        log.info("Accepting connection");
        channel.addWebChannelEventListener(this);
        acceptedServices.put(channel.getUniqueId(), channel);
        return true;
    }

    @Override
    public void shutdown() {
        swsManager.removeChangeListener(this);
    }

    @Override
    public void onOpen(WebChannel channel) {
        sendClientList(channel);
    }

    @Override
    public void onClose(WebChannel channel) {
        acceptedServices.remove(channel.getUniqueId());
    }

    @Override
    public void onSocketAdd(SwsManager manager, StableWebSocket socket) {
        sendClientListToAll();
        addClientInfoUpdater(socket);
    }

    @Override
    public void onSocketRemove(SwsManager manager, StableWebSocket socket) {
        removeClientInfoUpdater(socket);
        sendClientListToAll();
    }

    private void sendClientListToAll() {
        for (WebChannel channel : acceptedServices.values()) {
            sendClientList(channel);
        }
    }
    
    private void sendClientList(WebChannel channel) {
        // Make an object containing a list of all the client IDs
        JSONArray list = new JSONArray();
        for (String id : swsManager.getSockets().keySet()) {
            list.add(createClientInfo(id));
        }
        JSONObject result = new JSONObject();
        result.put("clients", list);
        try {
            channel.send(result);
        } catch (IOException ex) {
            // Ignore
        }
    }

    private JSONObject createClientInfo(String id) {
        JSONObject info = new JSONObject();
        info.put("id", id);
        JSONObject ci = clientInfo.get(id);
        if (ci != null) {
            Object ss = ci.get("services");
            if (ss != null) {
                info.put("services", ss);
            }
        }
        return info;
    }

    private void addClientInfoUpdater(StableWebSocket socket) {
        WebChannel channel = wchManager.createChannel(socket);
        updateChannels.put(socket.getId(), channel);
        ClientInfoUpdater updater = new ClientInfoUpdater(socket.getId());
        channel.addWebChannelEventListener(updater);
        try {
            channel.open("services");
        } catch (IOException ex) {
            channel.close();
        }
    }

    private void removeClientInfoUpdater(StableWebSocket socket) {
        WebChannel channel = updateChannels.get(socket.getId());
        if (channel != null) {
            channel.close();
        }
    }

    private class ClientInfoUpdater extends WebChannelAdapter {
        String socketId;

        public ClientInfoUpdater(String socketId) {
            this.socketId = socketId;
        }

        @Override
        public void onMessage(WebChannel channel, JSONObject msg) {
            Object ss = msg.get("services");
            if (ss != null) {
                clientInfo.put(socketId, msg);
                sendClientListToAll();
            }
        }

        @Override
        public void onClose(WebChannel channel) {
            updateChannels.values().remove(channel);
        }
    }
}
