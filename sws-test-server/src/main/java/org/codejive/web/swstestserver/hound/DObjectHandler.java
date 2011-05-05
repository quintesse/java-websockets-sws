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

import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

/**
 *
 * @author tako@codejive.org
 */
public class DObjectHandler {
    private Map<Integer, DObjectEntry> entries;
    private Set<DObjectEntry> modified;
    private int nextId;

    public DObjectHandler() {
        init();
    }

    private void init() {
        entries = new HashMap<Integer, DObjectEntry>();
        modified = new HashSet<DObjectEntry>();
        nextId = 1;
    }

    public DObjectEntry addObject(DObject newObject) {
        assert(newObject != null);

        DObjectEntry entry = new DObjectEntry(nextId++, newObject);
        entries.put(entry.getId(), entry);
        modified.add(entry);

        return entry;
    }

    public void removeObject(DObjectEntry entry) {
        assert(entry != null);

        entries.remove(entry.getId());
    }

    public void clear() {
        init();
    }

    public Collection<DObjectEntry> listObjects() {
        return Collections.unmodifiableCollection(entries.values());
    }

    public void markModified(DObjectEntry entry) {
        assert(entry != null);

        modified.add(entry);
    }
    
    public Collection<DObjectEntry> listModified() {
        return Collections.unmodifiableSet(modified);
    }

    public void clearModified() {
        // Sync the changes made in the modified object
        // with the set of cloned objects
        for (DObjectEntry entry : modified) {
            entry.sync();
        }
        // Now that the two sets are in sync we clear
        // the list of changes
        modified.clear();
    }

    public JSONArray toJson(boolean full) {
        JSONArray result = new JSONArray();
        for (DObjectEntry entry : entries.values()) {
            JSONObject obj = entry.toJson(full);
            if (obj != null) {
                result.add(obj);
            }
        }
        return result;
    }
}
