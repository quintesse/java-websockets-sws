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

import java.io.Serializable;
import org.json.simple.JSONObject;

/**
 *
 * @author Telefonica1
 */
public class StaticItem implements DObject, Serializable {
    private int type;
    private double x;
    private double y;

    public StaticItem() {
    }

    public StaticItem(int type, double x, double y) {
        this.type = type;
        this.x = x;
        this.y = y;
    }

    public int getType() {
        return type;
    }

    public void setType(int type) {
        this.type = type;
    }

    public double getX() {
        return x;
    }

    public void setX(double x) {
        this.x = x;
    }

    public double getY() {
        return y;
    }

    public void setY(double y) {
        this.y = y;
    }

    @Override
    public boolean isEqual(DObject object) {
        if (object != null && object.getClass() == getClass()) {
            StaticItem item = (StaticItem)object;
            return (type == item.type) && (x == item.x) && (y == item.y);
        }
        return false;
    }

    @Override
    public void copy(DObject object) {
        StaticItem item = (StaticItem)object;
        type = item.type;
        x = item.x;
        y = item.y;
    }

    @Override
    public JSONObject toJson(DObject oldObject) {
        JSONObject json = null;

        if (!isEqual(oldObject)) {
            json = new JSONObject();
            StaticItem item = (StaticItem)oldObject;
            if (item == null || type != item.type) {
                json.put("type", type);
            }
            if (item == null || x != item.x) {
                json.put("x", x);
            }
            if (item == null || y != item.y) {
                json.put("y", y);
            }
        }

        return json;
    }

}
