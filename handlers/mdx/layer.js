/**
 * @constructor
 * @param {MdxParserLayer} layer
 * @param {number} layerId
 * @param {number} priorityPlane
 * @param {MdxModel} model
 */
function MdxLayer(layer, layerId, priorityPlane, model) {
    let filterMode = Math.min(layer.filterMode, 6),
        textureAnimationId = layer.textureAnimationId,
        gl = model.gl;

    this.gl = gl;
    this.index = layerId;
    this.priorityPlane = priorityPlane;
    this.filterMode = filterMode;
    this.textureId = layer.textureId;
    this.coordId = layer.coordId;
    this.alpha = layer.alpha;
    this.renderOrder = MdxLayer.filterModeToRenderOrder[filterMode];
    this.sd = new MdxSdContainer(layer.tracks, model);

    var flags = layer.flags;

    this.unshaded = flags & 1;
    this.sphereEnvironmentMap = flags & 2;
    this.twoSided = flags & 16;
    this.unfogged = flags & 32;
    this.noDepthTest = flags & 64;
    this.noDepthSet = flags & 128;

    if (textureAnimationId !== -1) {
        let textureAnimation = model.textureAnimations[textureAnimationId];

        if (textureAnimation) {
            this.textureAnimation = textureAnimation;
        } else {
            console.warn("Layer " + layerId + " is referencing a nonexistent texture animation " + textureAnimationId);
        }
    }

    this.depthMaskValue = (filterMode === 0 || filterMode === 1) ? 1 : 0;
    this.alphaTestValue = (filterMode === 1) ? 1 : 0;
    this.blendValue = (filterMode > 1) ? true : false;

    if (this.blendValue) {
        switch (filterMode) {
            case 2:
                this.blendSrc = gl.SRC_ALPHA;
                this.blendDst = gl.ONE_MINUS_SRC_ALPHA;
                break;
            case 3:
                this.blendSrc = gl.ONE;
                this.blendDst = gl.ONE;
                break;
            case 4:
                this.blendSrc = gl.SRC_ALPHA;
                this.blendDst = gl.ONE;
                break;
            case 5:
                this.blendSrc = gl.ZERO;
                this.blendDst = gl.SRC_COLOR;
                break;
            case 6:
                this.blendSrc = gl.DST_COLOR;
                this.blendDst = gl.SRC_COLOR;
                break;
        }
    }

    this.uvDivisor = new Float32Array([1, 1]);
    this.isTextureAnim = false;
}

MdxLayer.filterModeToRenderOrder = {
    0: 0, // Opaque
    1: 1, // 1bit Alpha
    2: 2, // 8bit Alpha
    3: 3, // Additive
    4: 3, // Add Alpha (according to Magos)
    5: 3, // Modulate
    6: 3  // Modulate 2X
};

MdxLayer.prototype = {
    bind(shader) {
        const gl = this.gl;

        gl.uniform1f(shader.uniforms.get("u_alphaTest"), this.alphaTestValue);

        if (this.blendValue) {
            gl.enable(gl.BLEND);
            gl.blendFunc(this.blendSrc, this.blendDst);
        } else {
            gl.disable(gl.BLEND);
        }

        if (this.twoSided) {
            gl.disable(gl.CULL_FACE);
        } else {
            gl.enable(gl.CULL_FACE);
        }

        if (this.noDepthTest) {
            gl.disable(gl.DEPTH_TEST);
        } else {
            gl.enable(gl.DEPTH_TEST);
        }

        if (this.noDepthSet) {
            gl.depthMask(0);
        } else {
            gl.depthMask(this.depthMaskValue);
        }
    },

    setAtlas(atlas) {
        this.textureId = atlas.textureId;
        this.uvDivisor.set([atlas.columns, atlas.rows]);
        this.isTextureAnim = true;
    },

    getAllTextureIds() {
        var kmtf = this.sd.KMTF;

        if (kmtf) {
            var values = kmtf.getValues();

            // Remove duplicate elements but keep the unique ones in order
            return values.unique();
        } else {
            return [this.textureId];
        }
    },

    getAlpha(instance) {
        return this.sd.getValue("KMTA", instance, this.alpha);
    },

    isAlphaVariant(sequence) {
        return this.sd.isVariant("KMTA", sequence);
    },

    getTextureId(instance) {
        return this.sd.getValue("KMTF", instance, this.textureId);
    }
};
