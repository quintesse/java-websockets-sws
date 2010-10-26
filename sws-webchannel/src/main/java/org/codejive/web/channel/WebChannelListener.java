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

import org.json.simple.JSONObject;

/**
 *
 * @author Tako Schotanus <tako@codejive.org>
 */
public interface WebChannelListener {

    public void onOpen(WebChannel channel);

    public void onMessage(WebChannel channel, JSONObject msg);

    public void onDisconnect(WebChannel channel);

    public void onReconnect(WebChannel channel);

    public void onClose(WebChannel channel);

}
