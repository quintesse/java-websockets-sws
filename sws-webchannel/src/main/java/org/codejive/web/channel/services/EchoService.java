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
import org.codejive.web.channel.Service;
import org.codejive.web.channel.WebChannel;
import org.codejive.web.channel.WebChannelAdapter;
import org.json.simple.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 *
 * @author Tako Schotanus <tako@codejive.org>
 */
public class EchoService extends WebChannelAdapter implements Service {

    private static final Logger log = LoggerFactory.getLogger(EchoService.class);

    @Override
    public String getDescription() {
        return "Echoes all sent messages";
    }

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
        channel.addWebChannelEventListener(this);
        return true;
    }

    @Override
    public void onMessage(WebChannel channel, JSONObject msg) {
        try {
            channel.send(msg);
        } catch (IOException ex) {
            channel.close();
        }
    }
}
