package org.codejive.web.sws.adapters;

import com.sun.grizzly.tcp.Request;
import com.sun.grizzly.websockets.WebSocket;
import com.sun.grizzly.websockets.WebSocketApplication;
import com.sun.grizzly.websockets.WebSocketListener;
import java.io.IOException;
import java.util.Arrays;
import org.codejive.web.channel.ServiceManager;
import org.codejive.web.channel.SimpleServiceManager;
import org.codejive.web.channel.WebChannelManager;
import org.codejive.web.channel.services.ClientsService;
import org.codejive.web.channel.services.EchoService;
import org.codejive.web.channel.services.ServicesService;
import org.codejive.web.channel.services.TimeService;
import org.codejive.web.sws.LocalStableWebSocket;
import org.codejive.web.sws.NetworkStableWebSocket;
import org.codejive.web.sws.StableWebSocket;
import org.codejive.web.sws.SwsManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class GFSwsApplication extends WebSocketApplication {
    private SwsManager swsManager;
    private ServiceManager serviceManager;
    private WebChannelManager webChannelManager;
    private StableWebSocket localSocket;

    private static final Logger log = LoggerFactory.getLogger(GFSwsApplication.class);

    @Override
    public boolean isApplicationRequest(Request request) {
        final String uri = request.requestURI().toString();
        return uri.endsWith("/swsdemo");
    }

    @Override
    public WebSocket createSocket(WebSocketListener[] listeners) throws IOException {
        GFWebSocketAdapter adapter = new GFWebSocketAdapter();
        WebSocketListener[] newListeners = Arrays.copyOf(listeners, listeners.length + 1);
        newListeners[listeners.length] = adapter;
        WebSocket socket = new GFSwsWebSocket(newListeners);
        adapter.setSocket(socket);
        NetworkStableWebSocket sws = new NetworkStableWebSocket(swsManager, webChannelManager);
        sws.setSocket(adapter);
        return socket;
    }

    public void init() {
        swsManager = new SwsManager();

        SimpleServiceManager sm = new SimpleServiceManager();

        serviceManager = sm;

        webChannelManager = new WebChannelManager(swsManager, serviceManager);

        localSocket = new LocalStableWebSocket(swsManager, webChannelManager);

        // A couple of hard-coded services
        sm.register("echo", new EchoService());
        sm.register("time", new TimeService());
        sm.register("services", new ServicesService(sm));
        sm.register("clients", new ClientsService(swsManager, webChannelManager));
    }

    public void destroy() {
        localSocket.close();
        swsManager.shutdown();
    }
}
