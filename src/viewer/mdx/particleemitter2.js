function ParticleEmitter2(emitter, model, instance) {
  var i, l;
  var keys = Object.keys(emitter);
  
  for (i = keys.length; i--;) {
    this[keys[i]] = emitter[keys[i]];
  }
  
  this.model = model;
  this.texture = model.textures[this.textureId];
  
  this.lastCreation = 1;
  
  var particles;
  
  // This is the maximum number of particles that are going to exist at the same time
  if (this.tracks.emissionRate) {
    var tracks = this.tracks.emissionRate.tracks;
    var biggest = 0;
    
    for (i = 0, l = tracks.length; i < l; i++) {
      var track = tracks[i];
      
      if (track.vector > biggest) {
        biggest = track.vector;
      }
    }
    // For a reason I can't understand, biggest*lifespan isn't enough for emission rate tracks, multiplying by 2 seems to be the lowest reasonable value that works
    particles = Math.ceil(biggest) * Math.ceil(this.lifespan) * 2;
  } else {
    // +3 because for some reason rate*lifespan isn't working properly
    // Do I have a problem with the update loop?
    particles = Math.ceil(this.emissionRate) * Math.ceil(this.lifespan) + 3;
  }
  
  this.head = (this.headOrTail === 0 || this.headOrTail === 2);
  this.tail = (this.headOrTail === 1 || this.headOrTail === 2);
  
  if (this.head && this.tail) {
    particles *= 2;
  }
  
  this.particles = [];
  this.reusables = [];
  this.activeParticles = [];
    
  this.buffer = ctx.createBuffer();
  this.data = new Float32Array(30 * particles);
  
  ctx.bindBuffer(ctx.ARRAY_BUFFER, this.buffer);
  ctx.bufferData(ctx.ARRAY_BUFFER, this.data, ctx.DYNAMIC_DRAW);
  
  for (i = particles; i--;) {
    this.particles[i] = new Particle2();
    this.reusables.push(i);
  }
  
  var headInterval = emitter.headInterval;
  var headDecayInterval = emitter.headDecayInterval;
  var tailInterval = emitter.tailInterval;
  var tailDecayInterval = emitter.tailDecayInterval;
  
  var headFrames = 0;
  var headDecayFrames = 0;
  var tailFrames = 0;
  var tailDecayFrames = 0;
  
  // The repeat variables are probably not supposed to be used like this...
  if (this.head) {
    headFrames = (headInterval[1] - headInterval[0] + 1) * headInterval[2];
    headDecayFrames = (headDecayInterval[1] - headDecayInterval[0] + 1) * headDecayInterval[2];
  }
  
  if (this.tail) {
    tailFrames = (tailInterval[1] - tailInterval[0] + 1) * tailInterval[2];
    tailDecayFrames = (tailDecayInterval[1] - tailDecayInterval[0] + 1) * tailDecayInterval[2];
  }
  
  this.interval0Frames = headFrames;
  this.interval1Frames = headFrames + headDecayFrames;
  this.interval2Frames = headFrames + headDecayFrames + tailFrames;
  this.interval3Frames = headFrames + headDecayFrames + tailFrames + tailDecayFrames;
  
  this.interval0 = headInterval[1] - headInterval[0] + 1;
  this.interval1 = headDecayInterval[1] - headDecayInterval[0] + 1;
  this.interval2 = tailInterval[1] - tailInterval[0] + 1;
  this.interval3 = tailDecayInterval[1] - tailDecayInterval[0] + 1;

  this.interval0Start = 0;
  this.interval1Start = headFrames;
  this.interval2Start = headFrames + headDecayFrames;
  this.interval3Start = headFrames + headDecayFrames + tailFrames;
  
  this.interval0LocalStart = headInterval[0];
  this.interval1LocalStart = headDecayInterval[0];
  this.interval2LocalStart = tailInterval[0];
  this.interval3LocalStart = tailDecayInterval[0];
  
  this.numberOfFrames = this.interval3Frames;
  
  this.cellWidth = 1 / this.columns;
  this.cellHeight = 1 / this.rows;
  this.colors = [];
  
  var colors = this.segmentColor;
  var alpha = this.segmentAlpha;
  
  for (i = 0; i < 3; i++) {
    this.colors[i] = [Math.floor(colors[i][0] * 256), Math.floor(colors[i][1] * 256), Math.floor(colors[i][2] * 256), alpha[i]];
  }
  
  this.node = instance.skeleton.nodes[this.node];
  this.sd = parseSDTracks(emitter.tracks, model);
  
  this.pv1 = [-1, -1, 0];
  this.pv2 = [-1, 1, 0];
  this.pv3 = [1, 1, 0];
  this.pv4 = [1, -1, 0];
  
  this.csx = [1, 0, 0];
  this.csy = [0, 1, 0];
  this.csz = [0, 0, 1];
  
  this.defpv1 = [-1, -1, 0];
  this.defpv2 = [-1, 1, 0];
  this.defpv3 = [1, 1, 0];
  this.defpv4 = [1, -1, 0];
  
  // Avoid heap alocations in Particle2.reset
  this.particleLocalPosition = vec3.create();
  this.particlePosition = vec3.create();
  this.particleRotation = mat4.create();
  this.particleVelocity = vec3.create();
  this.particleVelocityStart = vec3.create();
  this.particleVelocityEnd = vec3.create();
  
  this.xYQuad = this.node.nodeImpl.xYQuad;
  
  this.dimensions = [this.columns, this.rows];
  
  if (!this.xYQuad) {
    this.refreshRect();
  }
}

ParticleEmitter2.prototype = {
  update: function (allowCreate, sequence, frame, counter, refreshCamera) {
    var particles = this.particles;
    var reusables = this.reusables;
    var activeParticles = this.activeParticles;
    var i, l;
    var particle;
    
    // Ready for pop mode
    activeParticles.reverse();
    
    for (i = 0, l = activeParticles.length; i < l; i++) {
      particle = particles[activeParticles[i]];
      
      if (particle.health <= 0) {
        reusables.push(particle.id);
        
        // This is true because the first particle will always die first
        activeParticles.pop();
      } else {
        particle.update(this, sequence, frame, counter);
      }
    }
    
    // Ready for push mode
    activeParticles.reverse()
    
    if (allowCreate && this.shouldRender(sequence, frame, counter)) {
      var amount = getSDValue(null, sequence, frame, counter, this.sd.emissionRate, this.emissionRate) * FRAME_TIME * this.lastCreation;
      
      if (amount > 0) {
        this.lastCreation += 1;
      }
      
      if (amount >= 1) {
        amount = Math.floor(amount);
        
        var index;
        
        this.lastCreation = 1;
        
        for (i = 0; i < amount; i++) {
          if (this.head && reusables.length > 0) {
            index = reusables.pop();
            
            particles[index].reset(this, true, index, sequence, frame, counter);
            activeParticles.push(index);
          }
          
          if (this.tail && reusables.length > 0) {
            index = reusables.pop();
            
            particles[index].reset(this, false, index, sequence, frame, counter);
            activeParticles.push(index);
          }
        }
      }
    }  
    
    this.updateHW(refreshCamera);
  },
  
  // This should actually be per-model (or even per-viewer), but I believe it's more fitting in the particle emitters themselves.
  // While this adds computations, they only happen when the camera changes, so it isn't a big deal.
  refreshRect: function () {
    if (this.head) {
      vec3.transformMat4(this.pv1, this.defpv1, inversCameraRotation);
      vec3.transformMat4(this.pv2, this.defpv2, inversCameraRotation);
      vec3.transformMat4(this.pv3, this.defpv3, inversCameraRotation);
      vec3.transformMat4(this.pv4, this.defpv4, inversCameraRotation);
    }
    
    if (this.tail) {
      vec3.transformMat4(this.csx, xAxis, inversCameraRotation);
      vec3.transformMat4(this.csy, yAxis, inversCameraRotation);
      vec3.transformMat4(this.csz, zAxis, inversCameraRotation);
    }
  },
  
  updateHW: function () {
    var activeParticles = this.activeParticles;
    var data = this.data;
    var particles = this.particles;
    var columns = this.columns;
    var particle, index, position, color;
    
    // If the camera changed and this isn't a xy quad, refresh the internal rectangle orientation
    if (refreshCamera && !this.xYQuad) {
      this.refreshRect();
    }
    
    var pv1 = this.pv1;
    var pv2 = this.pv2;
    var pv3 = this.pv3;
    var pv4 = this.pv4;
    var csx = this.csx;
    var csy = this.csy;
    var csz = this.csz;
    
    var scale, textureIndex, left, top, right, bottom, r, g, b, a, px, py, pz;
    var v1x, v1y, v1z, v2x, v2y, v2z, v3x, v3y, v3z, v4x, v4y, v4z;
    var lta, lba, rta, rba, rgb;
    
    for (var i = 0, l = activeParticles.length; i < l; i++) {
      particle = particles[activeParticles[i]];
      index = i * 30;
      
      position = particle.position;
      scale = particle.scale;
      textureIndex = particle.index;
      left = textureIndex % columns;
      top = Math.floor(textureIndex / columns);
      right = left + 1;
      bottom = top + 1;
      color = particle.color;
      r = Math.floor(color[0]);
      g = Math.floor(color[1]);
      b = Math.floor(color[2]);
      a = Math.floor(color[3]);
      px = position[0];
      py = position[1];
      pz = position[2];
      
      if (particle.head) {
        v1x = px + pv1[0] * scale;
        v1y = py + pv1[1] * scale;
        v1z = pz + pv1[2] * scale;
        v2x = px + pv2[0] * scale;
        v2y = py + pv2[1] * scale;
        v2z = pz + pv2[2] * scale;
        v3x = px + pv3[0] * scale;
        v3y = py + pv3[1] * scale;
        v3z = pz + pv3[2] * scale;
        v4x = px + pv4[0] * scale;
        v4y = py + pv4[1] * scale;
        v4z = pz + pv4[2] * scale;
      } else {
        var tailLength = this.tailLength;
        var v = particle.velocity;
        var offsetx = tailLength * v[0];
        var offsety = tailLength * v[1];
        var offsetz = tailLength * v[2];
        
        var px2 = px + offsetx;
        var py2 = py + offsety;
        var pz2 = pz + offsetz;
        
        px -= offsetx;
        py -= offsety;
        pz -= offsetz;
                /*
        v1x = px2 - csx[0] * scale + csz[0] * scale;
        v1y = py2 - csx[1] * scale + csz[1] * scale;
        v1z = pz2 - csx[2] * scale + csz[2] * scale;

        v2x = px - csx[0] * scale - csz[0] * scale;
        v2y = py - csx[1] * scale - csz[1] * scale;
        v2z = pz - csx[2] * scale - csz[2] * scale;
        v3x = px + csx[0] * scale - csz[0] * scale;
        v3y = py + csx[1] * scale - csz[1] * scale;
        v3z = pz + csx[2] * scale - csz[2] * scale;
        v4x = px2 + csx[0] * scale + csz[0] * scale;
        v4y = py2 + csx[1] * scale + csz[1] * scale;
        v4z = pz2 + csx[2] * scale + csz[2] * scale;
        */
        v1x = px2 - csx[0] * scale;
        v1y = py2 - csx[1] * scale;
        v1z = pz2 - csx[2] * scale;

        v2x = px - csx[0] * scale;
        v2y = py - csx[1] * scale;
        v2z = pz - csx[2] * scale;
        
        v3x = px + csx[0] * scale;
        v3y = py + csx[1] * scale;
        v3z = pz + csx[2] * scale;
        
        v4x = px2 + csx[0] * scale;
        v4y = py2 + csx[1] * scale;
        v4z = pz2 + csx[2] * scale;
      }
      
      lta = encodeFloat3(left, top, a);
      lba = encodeFloat3(left, bottom, a);
      rta = encodeFloat3(right, top, a);
      rba = encodeFloat3(right, bottom, a);
      rgb = encodeFloat3(r, g, b);
      
      data[index + 0] = v1x;
      data[index + 1] = v1y;
      data[index + 2] = v1z;
      data[index + 3] = lta;
      data[index + 4] = rgb;
      
      data[index + 5] = v2x;
      data[index + 6] = v2y;
      data[index + 7] = v2z;
      data[index + 8] = lba;
      data[index + 9] = rgb;
      
      data[index + 10] = v3x;
      data[index + 11] = v3y;
      data[index + 12] = v3z;
      data[index + 13] = rba;
      data[index + 14] = rgb;
      
      data[index + 15] = v1x;
      data[index + 16] = v1y;
      data[index + 17] = v1z;
      data[index + 18] = lta;
      data[index + 19] = rgb;
      
      data[index + 20] = v3x;
      data[index + 21] = v3y;
      data[index + 22] = v3z;
      data[index + 23] = rba;
      data[index + 24] = rgb;
      
      data[index + 25] = v4x;
      data[index + 26] = v4y;
      data[index + 27] = v4z;
      data[index + 28] = rta;
      data[index + 29] = rgb;
    }
  },
  
  render: function (textureMap, shader) {
    var particles = this.activeParticles.length;
    
    if (particles > 0) {
      var filterMode = this.filterMode;
      
      if (filterMode === 1) {
        ctx.blendFunc(ctx.ONE, ctx.ONE);
      } else if (filterMode === 2 || filterMode === 3) {
        ctx.blendFunc(ctx.SRC_ZERO, ctx.SRC_COLOR);
      } else if (filterMode === 4) {
        ctx.blendFunc(ctx.SRC_ALPHA, ctx.ONE);
      } else {
        ctx.blendFunc(ctx.SRC_ALPHA, ctx.ONE_MINUS_SRC_ALPHA);
      }
      
      bindTexture(this.texture, 0, this.model.textureMap, textureMap);
      
      ctx.uniform2fv(shader.variables.u_dimensions, this.dimensions);
      
      ctx.bindBuffer(ctx.ARRAY_BUFFER, this.buffer);
      ctx.bufferSubData(ctx.ARRAY_BUFFER, 0, this.data.subarray(0, particles * 30 + 1));
      
      ctx.vertexAttribPointer(shader.variables.a_position, 3, ctx.FLOAT, false, 20, 0);
      ctx.vertexAttribPointer(shader.variables.a_uva_rgb, 2, ctx.FLOAT, false, 20, 12);
        
      ctx.drawArrays(ctx.TRIANGLES, 0, particles * 6);
    }
  },
  
  shouldRender: function (sequence, frame, counter) {
    return getSDValue(null, sequence, frame, counter, this.sd.visibility, 0) > 0.1;
  }
};