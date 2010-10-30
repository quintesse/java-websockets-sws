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

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 *
 * @author Tako Schotanus <tako@codejive.org>
 */
public class SimpleServiceManager implements ServiceManager {
    private Map<String, Service> services;

    public SimpleServiceManager() {
        services = new ConcurrentHashMap<String, Service>();
    }

    public void register(String name, Service service) {
        services.put(name, service);
        service.init();
    }

    public void unregister(String name, Service service) {
        service.shutdown();
        services.remove(name);
    }

    @Override
    public Service find(String name) {
        return services.get(name);
    }

    @Override
    public Set<String> listNames() {
        return services.keySet();
    }

}
