function VoxelEngine() {
    this.player = new Player();
    this.lastTick = Date.now();
    this.glh = null;

    this.paused = false;

    this.playerDisplay = document.getElementById("playerDisplay");
    this.engineDisplay = document.getElementById("engineDisplay");
}

VoxelEngine.prototype.renderSetup = function(glHelper) {
    this.glh = glHelper;

    //this.chunkManager.glBufferCreator = this.glh.createBuffer.bind(this.glh);
    //this.chunkManager.glBufferDeleter = this.glh.gl.deleteBuffer;

    //this.chunkManager.chunkGenerator.priorityFunction = this.player.chunkPriority.bind(this.player);

    /*var vertexShaderSource = "attribute vec4 aPos; attribute vec4 aColor; uniform mat4 uTransform; varying vec4 vColor; void main(void) { gl_Position = uTransform * aPos; vColor = aColor; }"
    var fragmentShaderSource = "precision mediump float; varying vec4 vColor; void main(void) { gl_FragColor = vColor; }"
    var vertexShader = this.glh.loadShaderString(vertexShaderSource, this.glh.gl.VERTEX_SHADER);
    var fragmentShader = this.glh.loadShaderString(fragmentShaderSource, this.glh.gl.FRAGMENT_SHADER);
    this.shaderProgram = this.glh.linkShaderProgram(vertexShader, fragmentShader);
    this.glh.readUniforms(this.shaderProgram, ["uTransform"]);
    this.glh.readVertexAttribs(this.shaderProgram, ["aPos", "aColor"]);*/

    this.fullscreenQuad = this.glh.createBuffer(new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]));
    var fsV = this.glh.loadShaderDOM("fullscreen_vs");

    var fsFNearest = this.glh.loadShaderDOM("fullscreen_fs_nearest");
    this.nearestShader = this.glh.linkShaderProgram(fsV, fsFNearest);
    this.glh.readUniforms(this.nearestShader, ["uSampler", "uTopLeft", "uBottomRight", "uImageSize"]);
    this.glh.readVertexAttribs(this.nearestShader, ["aPos"]);

    var fsFbilinear = this.glh.loadShaderDOM("fullscreen_fs_bilinear");
    this.bilinearShader = this.glh.linkShaderProgram(fsV, fsFbilinear);
    this.glh.readUniforms(this.bilinearShader, ["uSampler", "uTopLeft", "uBottomRight", "uImageSize"]);
    this.glh.readVertexAttribs(this.bilinearShader, ["aPos"]);

    var fsFbicubic = this.glh.loadShaderDOM("fullscreen_fs_bicubic");
    this.bicubicShader = this.glh.linkShaderProgram(fsV, fsFbicubic);
    this.glh.readUniforms(this.bicubicShader, ["uSampler", "uTopLeft", "uBottomRight", "uImageSize"]);
    this.glh.readVertexAttribs(this.bicubicShader, ["aPos"]);

    this.fullscreenShaderProgram = this.bicubicShader;
    this.texture = this.glh.loadTextureDOM("input_image");

    this.glh.gl.clearColor(0,0,0, 1.0);
}

VoxelEngine.prototype.updateTexture = function(domId) {
    var newTexture = this.glh.loadTextureDOM(domId);
    if (this.texture) {
        this.glh.gl.deleteTexture(this.texture);
        this.texture = newTexture;
    }
}

VoxelEngine.prototype.render = function() {
    this.glh.gl.clear(this.glh.gl.COLOR_BUFFER_BIT);

    this.glh.enableVertexAttribArray(this.fullscreenShaderProgram);
    this.glh.gl.useProgram(this.fullscreenShaderProgram);
    this.glh.gl.uniform1i(this.fullscreenShaderProgram.uniforms.uSampler, 0);
    this.glh.gl.uniform2f(this.fullscreenShaderProgram.uniforms.uTopLeft, this.player.viewX - this.player.offsetH, this.player.viewY - this.player.offsetV);
    this.glh.gl.uniform2f(this.fullscreenShaderProgram.uniforms.uBottomRight, this.player.viewX + this.player.offsetH, this.player.viewY + this.player.offsetV);
    //this.glh.gl.uniform2f(this.fullscreenShaderProgram.uniforms.uTopLeft, 0,0);
    //this.glh.gl.uniform2f(this.fullscreenShaderProgram.uniforms.uBottomRight, ,16);
    this.glh.gl.uniform2f(this.fullscreenShaderProgram.uniforms.uImageSize, this.texture.width, this.texture.height);
    this.glh.gl.activeTexture(this.glh.gl.TEXTURE0);
    this.glh.gl.bindTexture(this.glh.gl.TEXTURE_2D, this.texture);
    this.glh.gl.bindBuffer(this.glh.gl.ARRAY_BUFFER, this.fullscreenQuad);
    this.glh.gl.vertexAttribPointer(this.fullscreenShaderProgram.vertexAttribs.aPos, 2, this.glh.gl.FLOAT, false, 2 * 4, 0);
    this.glh.gl.drawArrays(this.glh.gl.TRIANGLES, 0, this.fullscreenQuad.numItems / 8);
    this.glh.disableVertexAttribArray(this.fullscreenShaderProgram);
}

VoxelEngine.prototype.tick = function() {
    var now = performance.now();
    var dt;
    if (true) {
        dt = now - this.lastTick;
        dt = Math.min(dt, 1.0 / 20.0);
    }
    this.lastTick = now;

    //this.chunkManager.deleteFarChunks(this.player);
    //this.chunkManager.loadNearChunks(this.player);

    this.player.tick(dt);
    this.render();
    this.playerDisplay.textContent = "x:" + this.player.viewX + " y:"+this.player.viewY;

    if (!this.paused) requestAnimationFrame(this.tick.bind(this));
}

function Player(chunkSize) {
    this.chunkSize = chunkSize;
    this.viewResX = 1280;
    this.viewResY = 720;
    this.viewX = 0;
    this.viewY = 0;
    this.zoom = 16;

    /*this.chunkPos = vec3.create();
    this.pos = vec3.create();
    this.view = vec3.create();
    this.viewRight = vec3.fromValues(1,0,0);
    this.viewUp = vec3.fromValues(0,0,1);
    this.viewForward = vec3.fromValues(0,1,0);
    this.viewFocus = vec3.fromValues(0,1,0);
    this.cameraMatrix = mat4.create();
    mat4.lookAt(this.cameraMatrix, this.pos, this.viewForward, this.viewUp);
    this.viewQuat = quat.create();
    quat.fromMat3(this.viewQuat, this.cameraMatrix);

    this.tempVec3 = vec3.create();*/
}

Player.prototype.normalizePosition = function() {
    modulo = function(a, n) {
        res = a % n;
        if (a < 0) res += n;
        return res;
    }
    var n = this.chunkSize;
    this.chunkCoordinate.x += Math.floor(this.localCoordinate.x / n);
    this.chunkCoordinate.y += Math.floor(this.localCoordinate.y / n);
    this.chunkCoordinate.z += Math.floor(this.localCoordinate.z / n);

    this.localCoordinate.x = modulo(this.localCoordinate.x, n);
    this.localCoordinate.y = modulo(this.localCoordinate.y, n);
    this.localCoordinate.z = modulo(this.localCoordinate.z, n);
}

Player.prototype.tick = function(dt) {
    if (typeof(dt) != "number") dt = 1.0 / 60.0;
    //get rotation input
    if (mouse.lastClick == true && mouse.click == true) {
        var dx = (mouse.x - mouse.lastX) / this.zoom;
        var dy = (mouse.y - mouse.lastY) / this.zoom;
        this.viewX -= dx;
        this.viewY -= dy;
    }
    mouse.lastClick = mouse.click;
    mouse.lastX = mouse.x;
    mouse.lastY = mouse.y;

    this.offsetH = (this.viewResX / 2) / this.zoom;
    this.offsetV = (this.viewResY / 2) / this.zoom;
}
