/*
 * Copyright 2011 Telefonica1.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.codejive.web.swstestserver.hound;

import org.json.simple.JSONObject;

/**
 *
 * @author tako@codejive.org
 */
public class DObjectEntry<T extends DObject> {
    private Integer id;
    private T object;
    private T backup;

    public DObjectEntry(Integer id, T object) {
        this.object = create(object);
        this.id = id;
    }

    Integer getId() {
        return id;
    }

    T getObject() {
        return object;
    }

    void sync() {
        if (backup == null) {
            this.backup = create(object);
        }
        backup.copy(object);
    }

    JSONObject toJson(boolean full) {
        JSONObject json = object.toJson((full) ? null : backup);
        if (json != null) {
            json.put("id", id);
        }
        return json;
    }

    @Override
    public boolean equals(Object obj) {
        if (obj instanceof DObjectEntry) {
            return id.equals(((DObjectEntry)obj).id);
        }
        return false;
    }

    @Override
    public int hashCode() {
        return id.hashCode();
    }

    private T create(T object) {
        try {
            T newObject = (T) object.getClass().newInstance();
            newObject.copy(object);
            return newObject;
        } catch (InstantiationException ex) {
            throw new RuntimeException("Could not create clone of DObject", ex);
        } catch (IllegalAccessException ex) {
            throw new RuntimeException("Could not create clone of DObject", ex);
        }
    }
}
