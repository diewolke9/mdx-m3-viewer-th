/**
 * @class
 * @classdesc A scene.
 *            Scenes allow to render different model views with different cameras.
 */
function Scene(env) {
    let canvas = env.canvas,
        camera = new Camera();

    /** @member {ModelViewer} */
    this.env = env;
    /** @member {ModelView[]} */
    this.modelViews = [];
    /** @member {Camera} */
    this.camera = camera;

    // Default the camera's viewport to the whole canvas used by the viewer
    camera.setViewport([0, 0, canvas.width, canvas.height]);
    camera.setPerspective(Math.PI / 4, 1, 8, 100000);
}

Scene.prototype = {
    /** @member {string} */
    get objectType() {
        return "scene";
    },

    /**
     * @method
     * @desc Adds a new view to this scene, while setting the view's scene to this scene.
     * @param {ModelView} modelView The model view to add.
     */
    addView(modelView) {
        if (modelView && modelView.objectType === "modelview") {
            let views = this.modelViews;

            if (!views.has(modelView)) {
                views.push(modelView);

                return true;
            }
        }

        return false;
    },

    /**
     * @method
     * @desc Removes the given view from this scene, if it was in it.
     * @param {ModelView} modelView The model view to remove.
     */
    removeView(modelView) {
        if (modelView && modelView.objectType === "modelview") {
            let views = this.modelViews;

            if (views.has(modelView)) {
                views.delete(modelView);

                return true;
            }
        }

        return false;
    },

    /**
     * @method
     * @desc Clears all of the model views in this scene.
     */
    clear() {
        /*
        let views = this.modelViews;

        for (let i = 0, l = views.length; i < l; i++) {
            views[i].clear();
        }

        this.modelViews = [];
        */
    },

    update() {
        let views = this.modelViews;

        for (let i = 0, l = views.length; i < l; i++) {
            views[i].update(this);
        }
    },

    renderOpaque() {
        let views = this.modelViews;

        this.setViewport();

        for (let i = 0, l = views.length; i < l; i++) {
            views[i].renderOpaque(this);
        }
    },

    renderTranslucent() {
        let views = this.modelViews;

        this.setViewport();

        for (let i = 0, l = views.length; i < l; i++) {
            views[i].renderTranslucent(this);
        }
    },

    renderEmitters() {
        let views = this.modelViews;
            
        this.setViewport();

        for (let i = 0, l = views.length; i < l; i++) {
            views[i].renderEmitters(this);
        }
    },

    setViewport() {
        let viewport = this.camera.viewport;

        this.env.gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3]);
    }
};
