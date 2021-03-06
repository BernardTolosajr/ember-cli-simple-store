import Ember from "ember";

function factory(obj) {
    return obj.get("constructor.ClassMixin.ownerConstructor");
}

function attrs(obj) {
    var all = [];
    factory(obj).eachComputedProperty(function (key, meta) {
        if (meta.isAttribute) {
            all.push(key);
        }
    });
    return all;
}

function clone(obj) {
    var copy = {};
    factory(obj).eachComputedProperty(function (key, meta) {
        if (meta.isAttribute) {
            copy[key] = obj.get(key);
        }
    });
    return copy;
}

var attr = function() {
    var meta = {isAttribute: true};
    return function(key, value) {
        var data = this.get("_data") || {};
        var dirty = this.get("_dirty") || {};
        if (arguments.length === 2) {
            if (!this.get("isDirty") && !this.get("isPrimed")) {
                var oldState = clone(this);
                this.set("_oldState", oldState);
            }
            var primed = value === "" && data[key] === undefined;
            if(!primed) {
                this.set("isPrimed", true);
                dirty["%@:isDirty".fmt(key)] = true;
                data[key] = value;
            }
        }
        return data[key];
    }.property("_data").meta(meta);
};

var Model = Ember.Object.extend({
    init: function() {
        this.set("_data", {});
        this._reset();
        this._setup();
    },
    rollback: function() {
        var oldState = this.get("_oldState");
        for(var key in oldState){
            this.set(key, oldState[key]);
        }
        this._reset();
    },
    save: function() {
        var oldState = clone(this);
        this.set("_oldState", oldState);
        this._reset();
    },
    _reset: function() {
        this.set("isPrimed", false);
        this.set("_dirty", {});
    },
    _setup: function() {
        var self = this;
        var attributes = attrs(this);
        attributes.forEach(function(attrName) {
            var dynamicKey = "%@IsDirty".fmt(attrName);
            Ember.defineProperty(self, dynamicKey, Ember.computed(function() {
                var current = this.get(attrName);
                var original = this.get("_oldState." + attrName);
                var dirty = this.get("_dirty");
                var dirtyKey = "%@:isDirty".fmt(attrName);
                var dirtyCheck = (original === current) || (original === undefined && current === "");
                return dirtyCheck ? undefined : dirty[dirtyKey];
            }).property("_dirty", "" + attrName));
        });
        var modelIsDirtyAttrs = [];
        attributes.forEach(function(attr) {
            modelIsDirtyAttrs.push(attr + "IsDirty");
        });
        Ember.defineProperty(this, "isDirty", Ember.computed(function() {
            var modelAttrs = modelIsDirtyAttrs.filter(function(attr){
                return self.get(attr) === true;
            });
            return modelAttrs.length > 0;
        }).property("" + modelIsDirtyAttrs));
    }
});

export { attr, Model };
