package org.codejive.web.swstestserver;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import javax.ejb.Singleton;
import javax.ejb.Startup;

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
import org.codejive.web.sws.WebSocketAdapter;
import org.codejive.web.swstestserver.hound.HoundService;

@Startup
@Singleton
public class SwsService {
    private SwsManager swsManager;
    private ServiceManager serviceManager;
    private WebChannelManager webChannelManager;
    private StableWebSocket localSocket;

    @PostConstruct
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
        sm.register("hound", new HoundService());
    }
    
    @PreDestroy
    public void destroy() {
        localSocket.close();
        swsManager.shutdown();
    }
    
    public void addConnection(WebSocketAdapter adapter) {
        NetworkStableWebSocket sws = new NetworkStableWebSocket(swsManager, webChannelManager);
        sws.setSocket(adapter);
    }
}
