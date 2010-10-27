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

import org.codejive.web.channel.services.ClientsService;
import org.codejive.web.channel.services.ServicesService;
import org.codejive.web.sws.adapters.JettyWebSocketAdapter;

import java.io.IOException;
import javax.servlet.ServletConfig;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.codejive.web.channel.ServiceManager;
import org.codejive.web.channel.SimpleServiceManager;
import org.codejive.web.channel.WebChannelManager;
import org.codejive.web.channel.services.EchoService;
import org.codejive.web.channel.services.TimeService;
import org.codejive.web.sws.StableWebSocket;
import org.codejive.web.sws.SwsManager;
import org.codejive.web.sws.WebSocketAdapter;

import org.eclipse.jetty.websocket.WebSocket;
import org.eclipse.jetty.websocket.WebSocketServlet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 *
 * @author Tako Schotanus <tako@codejive.org>
 */
public class JettySwsServlet extends WebSocketServlet {
    private SwsManager swsManager;
    private ServiceManager serviceManager;
    private WebChannelManager webChannelManager;
    
    private static final Logger log = LoggerFactory.getLogger(JettySwsServlet.class);

    @Override
    public void init(ServletConfig config) throws ServletException {
        super.init(config);

        swsManager = new SwsManager();
        
        SimpleServiceManager sm = new SimpleServiceManager();

        // A couple of hard-coded services
        sm.register("echo", new EchoService());
        sm.register("time", new TimeService());
        sm.register("services", new ServicesService(sm));
        sm.register("clients", new ClientsService(swsManager));

        serviceManager = sm;
        
        webChannelManager = new WebChannelManager(swsManager, serviceManager);
    }

    @Override
    public void destroy() {
        super.destroy();
        swsManager.shutdown();
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws javax.servlet.ServletException, IOException {
        response.getOutputStream().println("<html><body><h2>A StableWebSocket lives here</h2></body></html>");
    }

    @Override
    protected WebSocket doWebSocketConnect(HttpServletRequest request, String protocol) {
        return new DangerZoneWebSocket();
    }
    
    class DangerZoneWebSocket implements WebSocket {
        private WebSocketAdapter adapter;
        
        @Override
        public void onConnect(Outbound outbound) {
            log.info(this + " onConnect - creating JettyWebSocketAdapter");
            adapter = new JettyWebSocketAdapter(outbound);
            StableWebSocket sws = new StableWebSocket(swsManager, webChannelManager);
            sws.setSocket(adapter);
            swsManager.addSocket(sws);
            adapter.onOpen();
        }

        @Override
        public void onMessage(byte frame, byte[] data, int offset, int length) {
            // Log.info(this+" onMessage: "+TypeUtil.toHexString(data,offset,length));
        }

        @Override
        public void onMessage(byte frame, String msg) {
            adapter.onMessage(msg);
        }

        @Override
        public void onDisconnect() {
            adapter.onClose();
            adapter = null;
        }
    }
}
