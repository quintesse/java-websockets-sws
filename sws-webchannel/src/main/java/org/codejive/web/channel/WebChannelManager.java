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

package org.codejive.web.channel;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.codejive.web.sws.StableWebSocket;
import org.codejive.web.sws.SwsEventListener;
import org.codejive.web.sws.SwsManager;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 *
 * @author Tako Schotanus <tako@codejive.org>
 */
public class WebChannelManager implements SwsEventListener {
    private SwsManager swsManager;
    private ServiceManager serviceManager;

    private Map<String, WebChannel> channels;
    private long nextChannelId;

    private static final String ATTR_SRC = "$src";
    private static final String ATTR_DST = "$dst";
    private static final String ATTR_CMD = "$cmd";
    
    private static final String CMD_OPEN = "open";
    private static final String CMD_OPEN_OK = "open-ok";
    private static final String CMD_OPEN_FAIL = "open-fail";
    private static final String CMD_CLOSE = "close";

    private static final Logger log = LoggerFactory.getLogger(WebChannelManager.class);

    public WebChannelManager(SwsManager swsManager, ServiceManager serviceManager) {
        this.swsManager = swsManager;
        this.serviceManager = serviceManager;
        channels = new ConcurrentHashMap<String, WebChannel>();
        nextChannelId = 1;
    }

    @Override
    public void onOpen(StableWebSocket socket) {
        // Nothing to do here
    }

    @Override
    public void onMessage(StableWebSocket socket, String msgTxt) {
        try {
            JSONParser parser = new JSONParser();
            JSONObject msg = (JSONObject) parser.parse(msgTxt);

            String from = attribute(msg, ATTR_SRC);
            String to = attribute(msg, ATTR_DST);
            if (to != null) {
                // Check if we received a command message
                String command = attribute(msg, ATTR_CMD);
                if (command != null) {
                    handleCommand(socket, msg, from, to, command);
                } else {
                    // All other messages will be passed to their respective channels
                    distributeMessage(socket, msg, from, to);
                }
            } else {
                log.error("Malformed message received");
            }
        } catch (ParseException ex) {
            log.error("Couldn't parse incoming message", ex);
        }
    }

    private void distributeMessage(StableWebSocket socket, JSONObject msg, String from, String to) {
        WebChannel channel = channels.get(to);
        if (channel != null) {
            channel.onMessage(msg);
        } else {
            log.warn("Received message for unknown channel");
            sendReply(socket, CMD_CLOSE, from, "Unknown channel");
        }
    }

    private void handleCommand(StableWebSocket socket, JSONObject msg, String from, String to, String command) {
        if (CMD_OPEN.equals(command)) {
            handleOpen(socket, msg, from, to);
        } else {
            WebChannel channel = channels.get(to);
            if (channel != null) {
                handleChannelCommand(msg, from, channel, command);
            } else {
                log.warn("Received command for unknown channel {}", to);
                if (CMD_OPEN_OK.equals(command)) {
                    sendReply(socket, CMD_CLOSE, from, "Unknown channel");
                }
            }
        }
    }

    private void handleChannelCommand(JSONObject msg, String from, WebChannel channel, String command) {
        if (CMD_OPEN_OK.equals(command)) {
            log.info("Received 'open-ok' message for {}", channel);
            channel.onMessage(msg);
            channel.onOpen(from);
        } else if (CMD_OPEN_FAIL.equals(command)) {
            log.info("Received 'open-fail' message for {}", channel);
            channel.onMessage(msg);
            channel.onClose();
        } else if (CMD_CLOSE.equals(command)) {
            log.info("Received 'close' message for {}", channel);
            channel.onClose();
        } else {
            log.warn("Unknown channel command received {}", command);
        }
    }

    private void handleOpen(StableWebSocket socket, JSONObject msg, String from, String to) {
        String serviceName = attribute(msg, "service");
        if (serviceName != null) {
            // Is this request for us?
            if ("sys".equals(to)) {
                handleLocalOpen(socket, msg, from, serviceName);
            } else {
                handleRemoteOpen(socket, msg, from, to);
            }
        } else {
            log.error("Missing 'service' attribute for 'open'");
            sendReply(socket, CMD_OPEN_FAIL, from, "Malformed request");
        }
    }

    private void handleLocalOpen(StableWebSocket socket, JSONObject msg, String from, String serviceName) {
        log.info("Incoming channel request for service '{}'", serviceName);
        Service service = serviceManager.find(serviceName);
        if (service != null) {
            WebChannel channel = createChannel(socket, from);
            if (service.accept(channel, msg)) {
                log.info("Channel connection accepted");
                try {
                    JSONObject reply = new JSONObject();
                    reply.put(ATTR_CMD, CMD_OPEN_OK);
                    channel.send(reply);
                    channel.onOpen(from);
                } catch (IOException ex) {
                    log.warn("Error sending open-ok message, failed to establish channel", ex);
                }
            } else {
                log.info("Channel connection refused");
                sendReply(socket, CMD_OPEN_FAIL, from, "Connection refused");
            }
        } else {
            log.warn("Unknown service '{}'", serviceName);
            sendReply(socket, CMD_OPEN_FAIL, from, "Unknown service");
        }
    }

    private void handleRemoteOpen(StableWebSocket socket, JSONObject msg, String from, String to) {
        // Send the request on to its proper destiny
        log.info("Forward channel request to '{}'", to);
        StableWebSocket destSocket = swsManager.findSocket(to);
        if (destSocket != null) {
            WebChannel channel1 = createChannel(socket, from);
            WebChannel channel2 = createChannel(destSocket, "sys");
            createBridge(channel1, channel2);
            try {
                channel2.send(msg);
            } catch (IOException ex) {
                log.warn("Error sending open message to peer, failed to establish channel", ex);
                sendReply(socket, CMD_OPEN_FAIL, from, "Error communicating with peer");
            }
        } else {
            log.warn("Unknown peer '{}'", to);
            sendReply(socket, CMD_OPEN_FAIL, from, "Unknown peer");
        }
    }

    private WebChannel createChannel(StableWebSocket socket, String peerId) {
        String id = Long.toString(nextChannelId++);
        WebChannel channel = new WebChannel(socket, peerId, id);
        channels.put(id, channel);
        // Just to make sure we clean up after ourselves
        channel.addWebChannelEventListener(new WebChannelAdapter() {
            @Override
            public void onClose(WebChannel channel) {
                channels.remove(channel.getId());
            }
        });
        return channel;
    }

    @Override
    public void onDisconnect(StableWebSocket socket) {
        for (WebChannel channel : channels.values()) {
            channel.onDisconnect();
        }
    }

    @Override
    public void onReconnect(StableWebSocket socket) {
        for (WebChannel channel : channels.values()) {
            channel.onReconnect();
        }
    }

    @Override
    public void onClose(StableWebSocket socket) {
        for (WebChannel channel : channels.values()) {
            channel.onClose();
        }
    }

    private void sendReply(StableWebSocket socket, String command, Object dstId, String reason) {
        try {
            JSONObject reply = new JSONObject();
            reply.put(ATTR_CMD, command);
            reply.put(ATTR_DST, dstId);
            reply.put("reason", reason);
            socket.sendMessage(reply.toJSONString());
        } catch (IOException ex) {
            log.warn("Error sending reply", ex);
        }
    }

    private String attribute(JSONObject msg, String name) {
        Object value = msg.get(name);
        return (value != null) ? value.toString() : null;
    }

    private void createBridge(WebChannel channel1, WebChannel channel2) {
        WebChannelBridge bridge = new WebChannelBridge(channel1, channel2);
        channel1.addWebChannelEventListener(bridge);
        channel2.addWebChannelEventListener(bridge);
    }

    private class WebChannelBridge extends WebChannelAdapter {
        private WebChannel channel1;
        private WebChannel channel2;

        private ThreadLocal<Boolean> skip;

        public WebChannelBridge(WebChannel channel1, WebChannel channel2) {
            this.channel1 = channel1;
            this.channel2 = channel2;
            
            skip = new ThreadLocal<Boolean>();
        }

        @Override
        public void onMessage(WebChannel channel, JSONObject msg) {
            if (skip.get() == null) {
                skip.set(Boolean.TRUE);
                try {
                    otherChannel(channel).send(msg);
                } catch (IOException ex) {
                    log.warn("Channel bridge could not pass message", ex);
                } finally {
                    skip.set(null);
                }
            }
        }

        @Override
        public void onClose(WebChannel channel) {
            if (skip.get() == null) {
                skip.set(Boolean.TRUE);
                try {
                    otherChannel(channel).close();
                } finally {
                    skip.set(null);
                }
            }
        }

        // Given one channel of the pair this method will return the other
        private WebChannel otherChannel(WebChannel channel) {
            return (channel == channel1) ? channel2 : channel1;
        }
    }
}
