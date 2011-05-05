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

package org.codejive.web.swstestserver.hound;

import java.io.IOException;
import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.ConcurrentHashMap;
import org.codejive.web.channel.Service;
import org.codejive.web.channel.WebChannel;
import org.codejive.web.channel.WebChannelAdapter;
import org.codejive.web.channel.WebChannelListener;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 *
 * @author Tako Schotanus <tako@codejive.org>
 */
public class HoundService implements Service {
    private Map<String, HoundListServiceHandler> listClients;
    private Map<String, HoundGameServiceHandler> gameClients;
    private Timer timer;
    private TimerTask task;
    private DObjectHandler universe;

    private DObjectEntry<MovingItem> movingEntry;

    private static final Logger log = LoggerFactory.getLogger(HoundService.class);

    @Override
    public String getDescription() {
        return "Server for the 'hound' game";
    }

    @Override
    public void init() {
        listClients = new ConcurrentHashMap<String, HoundListServiceHandler>();
        gameClients = new ConcurrentHashMap<String, HoundGameServiceHandler>();

        universe = new DObjectHandler();
        movingEntry = universe.addObject(new MovingItem(1, 50, 200, 10, 0));
        universe.addObject(new StaticItem(2, 100, 100));
        universe.addObject(new StaticItem(3, 150, 150));
    }

    @Override
    public void shutdown() {
        if (timer != null) {
            timer.cancel();
            log.info("Canceling game update timer {}", timer);
        }

        for (HoundListServiceHandler handler : listClients.values()) {
            handler.channel.close();
        }

        for (HoundGameServiceHandler handler : gameClients.values()) {
            handler.channel.close();
        }
    }

    @Override
    public boolean accept(WebChannel channel, JSONObject msg) {
        log.info("Accepting connection");
        if (msg.get("list") != null) {
            channel.addWebChannelEventListener(new HoundListServiceHandler());
        } else {
            channel.addWebChannelEventListener(new HoundGameServiceHandler());
        }
        return true;
    }

    private void sendGameListAll() {
        for (HoundListServiceHandler handler : listClients.values()) {
            handler.sendGamesList();
        }
    }

    private class HoundListServiceHandler extends WebChannelAdapter {
        private WebChannel channel;

        @Override
        public void onOpen(WebChannel channel, JSONObject init) {
            this.channel = channel;

            // Adding client to the update list
            listClients.put(channel.getUniqueId(), this);

            sendGamesList();
        }

        @Override
        public void onReconnect(WebChannel channel) {
            sendGamesList();
        }

        @Override
        public void onClose(WebChannel channel) {
            listClients.remove(channel.getUniqueId());
        }

        private void sendGamesList() {
            JSONObject result = makeGamesList();

            try {
                channel.send(result);
            } catch (IOException ex) {
                // Ignore
            }
        }

        // Make an object containing a list of all the current games
        protected JSONObject makeGamesList() {
            JSONArray list = new JSONArray();
//            for (String name : serviceManager.listNames()) {
//                Service service = serviceManager.find(name);
                JSONObject info = new JSONObject();
                info.put("name", "test");
                info.put("description", "Test Game");
                list.add(info);
//            }
            JSONObject result = new JSONObject();
            result.put("games", list);
            return result;
        }
    }

    private class HoundGameServiceHandler implements WebChannelListener {
        private WebChannel channel;
        private boolean fullUpdate;

        @Override
        public void onOpen(WebChannel channel, JSONObject init) {
            this.channel = channel;

            // Adding client to the update list
            gameClients.put(channel.getUniqueId(), this);
            fullUpdate = true;

            // First connection? Start game thread
            if (timer == null) {
                timer = new Timer();
                task = new GameUpdateThread();
                timer.scheduleAtFixedRate(task, 1000L, 1000L);
                log.info("Started game update timer {}", timer);
            }
        }

        @Override
        public void onMessage(WebChannel channel, JSONObject msg) {
            // Not implemented yet!
        }

        @Override
        public void onDisconnect(WebChannel channel) {
            // Removing this client from the list of clients
            // so we won't unnecesarily send it updates
            gameClients.remove(channel.getUniqueId());
        }

        @Override
        public void onReconnect(WebChannel channel) {
            // Re-adding client to the update list
            fullUpdate = true;
            gameClients.put(channel.getUniqueId(), this);
        }

        @Override
        public void onClose(WebChannel channel) {
            timer.cancel();
            timer = null;
            log.info("Stopped timer {}", timer);

            gameClients.remove(channel.getUniqueId());
            if (gameClients.isEmpty()) {
                timer.cancel();
                log.info("No clients left, temporarily canceling game update timer {}", timer);
            }
        }
    }

    private class GameUpdateThread extends TimerTask {
        @Override
        public void run() {
            // Simulate the universe
            MovingItem item = movingEntry.getObject();
            double newX = item.getX() + item.getVx();
            if (newX < 50) {
                newX = 50;
                item.setVx(10);
            }
            if (newX > 2000) {
                newX = 2000;
                item.setVx(-10);
            }
            item.setX(newX);
            universe.markModified(movingEntry);

            // Send updates to clients
            JSONObject fullMsg = null;
            JSONObject diffMsg = null;
            for (HoundGameServiceHandler client : gameClients.values()) {
                JSONObject msg;
                if (client.fullUpdate) {
                    client.fullUpdate = false;
                    if (fullMsg == null) {
                        fullMsg = new JSONObject();
                        fullMsg.put("universe", universe.toJson(true));
                        fullMsg.put("cmd", "update");
                    }
                    msg = fullMsg;
                } else {
                    if (diffMsg == null) {
                        diffMsg = new JSONObject();
                        diffMsg.put("universe", universe.toJson(false));
                        diffMsg.put("cmd", "update");
                    }
                    msg = diffMsg;
                }
                try {
                    client.channel.send(msg);
                } catch (IOException ex) {
                    log.error("Couldn't send update message to peer", ex);
                }
            }
            universe.clearModified();
        }
    }
}
