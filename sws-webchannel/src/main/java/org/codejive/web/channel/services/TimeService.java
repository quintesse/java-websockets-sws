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
import java.util.Date;
import java.util.Timer;
import java.util.TimerTask;
import org.codejive.web.channel.Service;
import org.codejive.web.channel.WebChannel;
import org.codejive.web.channel.WebChannelListener;
import org.json.simple.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 *
 * @author Tako Schotanus <tako@codejive.org>
 */
public class TimeService implements Service {

    private static final Logger log = LoggerFactory.getLogger(EchoService.class);

    @Override
    public void init() {
        // Nothing to do
    }

    @Override
    public void shutdown() {
        // Nothing to do
    }

    @Override
    public boolean accept(WebChannel channel, JSONObject msg) {
        log.info("Accepting connection");
        channel.addWebChannelEventListener(new TimeServiceHandler());
        return true;
    }

    private class TimeServiceHandler implements WebChannelListener {
        private WebChannel channel;
        private Timer timer;
        private TimerTask task;

        @Override
        public void onOpen(WebChannel channel) {
            this.channel = channel;
            timer = new Timer();
            task = new TimeServiceThread();
            timer.scheduleAtFixedRate(task, 1000L, 1000L);
            log.info("Started timer {}", timer);
        }

        @Override
        public void onMessage(WebChannel channel, JSONObject msg) {
            // We're not interested in messages from the client
        }

        @Override
        public void onDisconnect(WebChannel channel) {
            task.cancel();
            log.info("Temporarily canceled timer {}", timer);
        }

        @Override
        public void onReconnect(WebChannel channel) {
            task = new TimeServiceThread();
            timer.scheduleAtFixedRate(task, 1000L, 1000L);
            log.info("Restarted timer {}", timer);
        }

        @Override
        public void onClose(WebChannel channel) {
            timer.cancel();
            timer = null;
            log.info("Stopped timer {}", timer);
        }

        class TimeServiceThread extends TimerTask {
            @Override
            public void run() {
                Date dt = new Date();
                JSONObject msg = new JSONObject();
                msg.put("time", dt.toGMTString());
                try {
                    channel.send(msg);
                } catch (IOException ex) {
                    log.error("Couldn't send time message to peer", ex);
                }
            }
        }
    }
}
