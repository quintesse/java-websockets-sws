package org.codejive.web.swstestserver;

import javax.inject.Inject;
import javax.websocket.CloseReason;
import javax.websocket.EndpointConfig;
import javax.websocket.OnClose;
import javax.websocket.OnError;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;

import org.codejive.web.sws.adapters.JeeWebSocketAdapter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@ServerEndpoint(value="/swsdemo")
public class JeeSwsEndpoint {
    private JeeWebSocketAdapter adapter;
    
    @Inject SwsService swsService;
    
    private static final Logger log = LoggerFactory.getLogger(JeeSwsEndpoint.class);
    
    @OnOpen
    public void onOpen(Session session, EndpointConfig conf) {
        log.info(this + " onConnect - creating JeeWebSocketAdapter");
        adapter = new JeeWebSocketAdapter(session);
        swsService.addConnection(adapter);
        adapter.onOpen();
    }

    @OnMessage
    public void onMessage(Session session, String msg) {
        adapter.onMessage(msg);
    }
    
    @OnError
    public void onError(Session session, Throwable error) {
        // Not implemented
    }
    
    @OnClose
    public void onClose(Session session, CloseReason reason) {
        adapter.onClose();
    }
}
