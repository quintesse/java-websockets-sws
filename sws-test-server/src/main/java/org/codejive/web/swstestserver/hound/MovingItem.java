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
 * @author Telefonica1
 */
public class MovingItem extends StaticItem {
    private double vx;
    private double vy;

    public MovingItem() {
    }

    public MovingItem(int type, double x, double y, double vx, double vy) {
        super(type, x, y);
        this.vx = vx;
        this.vy = vy;
    }

    public double getVx() {
        return vx;
    }

    public void setVx(double vx) {
        this.vx = vx;
    }

    public double getVy() {
        return vy;
    }

    public void setVy(double vy) {
        this.vy = vy;
    }

    @Override
    public void copy(DObject object) {
        super.copy(object);
        MovingItem item = (MovingItem)object;
        vx = item.vx;
        vy = item.vy;
    }

    @Override
    public JSONObject toJson(DObject oldObject) {
        JSONObject json = super.toJson(oldObject);

        MovingItem item = (MovingItem)oldObject;
        if (oldObject == null || vx != item.vx) {
            json = (json == null) ? new JSONObject() : json;
            json.put("vx", vx);
        }
        if (oldObject == null || vy != item.vy) {
            json = (json == null) ? new JSONObject() : json;
            json.put("vy", vy);
        }
        
        return json;
    }

}
