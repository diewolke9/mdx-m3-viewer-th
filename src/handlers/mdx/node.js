var defaultTransformations = {
    translation: [0, 0, 0],
    rotation: [0, 0, 0, 1],
    scaling: [1, 1, 1]
};

Mdx.Node = function (object, model, pivots) {
    this.name = object.name;
    this.objectId = object.objectId;
    this.parentId = object.parentId;
    this.pivot = pivots[object.objectId] || [0, 0, 0];
    this.billboarded = object.billboarded;
    this.modelSpace = object.modelSpace;
    this.xYQuad = object.xYQuad;
    this.sd = Mdx.parseSDTracks(object.tracks, model);

    if (object.objectId === object.parentId) {
        this.parentId = -1;
    }
};

Mdx.Node.prototype = {
    getTranslation: function (sequence, frame, counter) {
        if (this.sd.translation) {
            return this.sd.translation.getValue(sequence, frame, counter);
        } else {
            return defaultTransformations.translation;
        }
    },

    getRotation: function (sequence, frame, counter) {
        if (this.sd.rotation) {
            return this.sd.rotation.getValue(sequence, frame, counter);
        } else {
            return defaultTransformations.rotation;
        }
    },

    getScale: function (sequence, frame, counter) {
        if (this.sd.scaling) {
            return this.sd.scaling.getValue(sequence, frame, counter);
        } else {
            return defaultTransformations.scaling;
        }
    }  
};

// Used by each copy of a skeleton to hold the node hierarchy
// Keeps a reference to the actual node containing the animation data, that the model owns
Mdx.ShallowNode = function (node) {
    BaseNode.call(this);

    this.nodeImpl = node;
    this.objectId = node.objectId;
    this.parentId = node.parentId;
    
    vec3.copy(this.pivot, node.pivot);
    
    this.externalWorldMatrix = mat4.create();
}

Mdx.ShallowNode.prototype = extend(BaseNode.prototype, {
    getTransformation: function () {
        var m = this.externalWorldMatrix;

        mat4.copy(m, this.worldMatrix);
        mat4.translate(m, m, this.pivot);

        return m;
    }
});