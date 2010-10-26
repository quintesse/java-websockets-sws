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
package org.codejive.web.swstestserver;

import com.sun.grizzly.tcp.Request;
import com.sun.grizzly.websockets.NetworkHandler;
import com.sun.grizzly.websockets.WebSocket;
import com.sun.grizzly.websockets.WebSocketApplication;
import com.sun.grizzly.websockets.WebSocketEngine;
import com.sun.grizzly.websockets.WebSocketListener;
import java.io.IOException;
import java.util.Arrays;
import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import org.codejive.web.channel.ServiceManager;
import org.codejive.web.channel.SimpleServiceManager;
import org.codejive.web.channel.WebChannelManager;
import org.codejive.web.channel.services.ClientsService;
import org.codejive.web.channel.services.EchoService;
import org.codejive.web.channel.services.ServicesService;
import org.codejive.web.channel.services.TimeService;
import org.codejive.web.sws.StableWebSocket;
import org.codejive.web.sws.SwsManager;
import org.codejive.web.sws.adapters.GFSwsWebSocket;
import org.codejive.web.sws.adapters.GFWebSocketAdapter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 *
 * @author Tako Schotanus <tako@codejive.org>
 */
public class GlassfishSwsServlet extends HttpServlet {
    private SwsManager swsManager;
    private ServiceManager serviceManager;

    private static final Logger log = LoggerFactory.getLogger(GFSwsWebSocketApp.class);

    private final GFSwsWebSocketApp app = new GFSwsWebSocketApp();

    @Override
    public void init(ServletConfig config) throws ServletException {
        WebSocketEngine.getEngine().register(app);

        swsManager = new SwsManager();

        SimpleServiceManager sm = new SimpleServiceManager();

        // A couple of hard-coded services
        sm.register("echo", new EchoService());
        sm.register("time", new TimeService());
        sm.register("services", new ServicesService(sm));
        sm.register("clients", new ClientsService(swsManager));

        serviceManager = sm;
    }

    class GFSwsWebSocketApp extends WebSocketApplication {
        @Override
        public boolean isApplicationRequest(Request request) {
            return request.requestURI().equals("/swsdemo");
        }
        
        @Override
        public WebSocket createSocket(WebSocketListener... listeners) throws IOException {
            WebSocket socket = new GFSwsWebSocket(listeners);
//            GFWebSocketAdapter adapter = new GFWebSocketAdapter();
//            WebSocketListener[] newListeners = Arrays.copyOf(listeners, listeners.length + 1);
//            newListeners[listeners.length] = adapter;
//            WebSocket socket = new GFSwsWebSocket(newListeners);
//            adapter.setSocket(socket);
//            WebChannelManager webChannelManager = new WebChannelManager(swsManager, serviceManager);
//            StableWebSocket sws = new StableWebSocket(swsManager, webChannelManager);
//            sws.setSocket(adapter);
//            swsManager.addSocket(sws);
            return socket;
        }
    }
}
