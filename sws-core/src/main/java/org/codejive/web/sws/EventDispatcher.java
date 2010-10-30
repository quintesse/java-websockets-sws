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

package org.codejive.web.sws;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Proxy;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 *
 * @author Tako Schotanus <tako@codejive.org>
 */
public abstract class EventDispatcher<L> {
    private Set<L> listeners;

    private L proxiedListener;

    private static final Logger log = LoggerFactory.getLogger(EventDispatcher.class);

    public EventDispatcher() {
        listeners = new CopyOnWriteArraySet<L>();
        Class<L> listenerClass = (Class<L>) ((ParameterizedType) getClass().getGenericSuperclass()).getActualTypeArguments()[0];
        proxiedListener = (L) Proxy.newProxyInstance(
                listenerClass.getClassLoader(),
                new Class[] { listenerClass },
                new ProxyHandler());
    }

    public void addListener(L listener) {
        listeners.add(listener);
    }

    public void removeListener(L listener) {
        listeners.remove(listener);
    }

    public void removeAllListeners() {
        listeners.clear();
    }

    public L fire() {
        return proxiedListener;
    }

    private class ProxyHandler implements InvocationHandler {
        @Override
        public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            for (L listener : listeners) {
                try {
                    method.invoke(listener, args);
                } catch (Throwable th) {
                    log.warn("An error occurred firing event '" + method.getName() + "' on an object", th);
                }
            }
            return null;
        }

    }
}
