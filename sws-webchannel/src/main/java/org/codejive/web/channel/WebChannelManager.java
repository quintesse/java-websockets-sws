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
    public void onMessage(StableWebSocket socket, String msg) {
        try {
            JSONParser parser = new JSONParser();
            JSONObject info = (JSONObject) parser.parse(msg);

            Object from = info.get("$src");
            Object to = info.get("$dst");
            if (to != null) {
                // Check if we received a command message
                Object command = info.get("$cmd");
                if (command != null) {
                    if (CMD_OPEN.equals(command)) {
                        Object serviceName = info.get("service");
                        if (serviceName != null) {
                            // Is this request for us?
                            if ("sys".equals(to)) {
                                log.info("Incoming channel request for service '{}'", serviceName);
                                Service service = serviceManager.find(serviceName.toString());
                                if (service != null) {
                                    WebChannel channel = createChannel(socket, from.toString());
                                    if (service.accept(channel, info)) {
                                        log.info("Channel connection accepted");
                                        try {
                                            JSONObject reply = new JSONObject();
                                            reply.put("$cmd", CMD_OPEN_OK);
                                            channel.send(reply);
                                            channel.onOpen(from.toString());
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
                            } else {
                                // Send the request on to its proper destiny
                                log.info("Forward channel request to '{}'", to);
                                StableWebSocket destSocket = swsManager.findSocket(to.toString());
                                if (destSocket != null) {
                                    WebChannel channel1 = createChannel(socket, from.toString());
                                    WebChannel channel2 = createChannel(destSocket, "sys");
                                    createBridge(channel1, channel2);
                                    try {
                                        channel2.send(info);
                                    } catch (IOException ex) {
                                        log.warn("Error sending open message to peer, failed to establish channel", ex);
                                        sendReply(socket, CMD_OPEN_FAIL, from, "Error communicating with peer");
                                    }
                                } else {
                                    log.warn("Unknown peer '{}'", to);
                                    sendReply(socket, CMD_OPEN_FAIL, from, "Unknown peer");
                                }
                            }
                        } else {
                            log.error("Missing 'service' attribute for 'open'");
                            sendReply(socket, CMD_OPEN_FAIL, from, "Malformed request");
                        }
                    } else {
                        WebChannel channel = channels.get(to.toString());
                        if (channel != null) {
                            if (CMD_OPEN_OK.equals(command)) {
                                log.info("Received 'open-ok' message for {}", channel);
                                channel.onMessage(info);
                                channel.onOpen(from.toString());
                            } else if (CMD_OPEN_FAIL.equals(command)) {
                                log.info("Received 'open-fail' message for {}", channel);
                                channel.onMessage(info);
                                channel.onClose();
                            } else if (CMD_CLOSE.equals(command)) {
                                log.info("Received 'close' message for {}", channel);
                                channel.onClose();
                            } else {
                                log.warn("Unknown channel command received {}", command);
                            }
                        } else {
                            log.warn("Received command for unknown channel {}", to);
                            if (CMD_OPEN_OK.equals(command)) {
                                sendReply(socket, CMD_CLOSE, from, "Unknown channel");
                            }
                        }
                    }
                } else {
                    // All other messages will be passed to their respective channels
                    WebChannel channel = channels.get(to.toString());
                    if (channel != null) {
                        channel.onMessage(info);
                    } else {
                        log.warn("Received message for unknown channel");
                        sendReply(socket, CMD_CLOSE, from, "Unknown channel");
                    }
                }
            } else {
                log.error("Malformed message received");
            }
        } catch (ParseException ex) {
            log.error("Couldn't parse incoming message", ex);
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
            reply.put("$cmd", command);
            reply.put("$dst", dstId);
            reply.put("reason", reason);
            socket.sendMessage(reply.toJSONString());
        } catch (IOException ex) {
            log.warn("Error sending reply", ex);
        }
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
