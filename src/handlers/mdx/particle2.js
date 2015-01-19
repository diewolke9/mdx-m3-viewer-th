function Particle2() {
  this.id = 0;
  this.health = 0;
  this.head = true;
  this.position = [];
  this.velocity = [];
  this.color = [];
  this.gravity = 0;
  this.scale = 1;
  this.index = 0;
}

Particle2.prototype = {
  reset: function (emitter, head, id, sequence, frame, counter) {
    var pivot = emitter.node.pivot;
    var worldMatrix = emitter.node.worldMatrix;
    var scale = emitter.node.scale;
    var width = getSDValue(sequence, frame, counter, emitter.sd.width, emitter.width) * 0.5 * scale[0];
    var length = getSDValue(sequence, frame, counter, emitter.sd.length, emitter.length) * 0.5 * scale[1];
    var speed = (getSDValue(sequence, frame, counter, emitter.sd.speed, emitter.speed) + Math.randomRange(-emitter.variation, emitter.variation));
    var latitude = Math.toRad(getSDValue(sequence, frame, counter, emitter.sd.latitude, emitter.latitude));
    var gravity = getSDValue(sequence, frame, counter, emitter.sd.gravity, emitter.gravity) * scale[2];
    var color = emitter.colors[0];
    var localPosition = emitter.particleLocalPosition;
    var position = emitter.particlePosition;
    var rotation = emitter.particleRotation;
    var velocity = emitter.particleVelocity;
    var velocityStart = emitter.particleVelocityStart;
    var velocityEnd = emitter.particleVelocityEnd;
    
    localPosition[0] = pivot[0] + Math.randomRange(-width, width);
    localPosition[1] = pivot[1] + Math.randomRange(-length, length);
    localPosition[2] = pivot[2];
    
    vec3.transformMat4(position, localPosition, worldMatrix);
    
    mat4.identity(rotation);
    mat4.rotateZ(rotation, rotation, Math.randomRange(-Math.PI, Math.PI));
    mat4.rotateY(rotation, rotation, Math.randomRange(-latitude, latitude));
    
    vec3.transformMat4(velocity, vec3.UNIT_Z, rotation);
    vec3.normalize(velocity, velocity);
    
    vec3.add(velocityEnd, position, velocity);
    
    vec3.transformMat4(velocityStart, position, worldMatrix);
    vec3.transformMat4(velocityEnd, velocityEnd, worldMatrix);
    
    vec3.subtract(velocity, velocityEnd, velocityStart);
    vec3.normalize(velocity, velocity);
    vec3.scale(velocity, velocity, speed);
    
    if (!head) {
      var tailLength = emitter.tailLength * 0.5;
      
      position[0] -= tailLength * velocity[0];
      position[1] -= tailLength * velocity[1];
      position[2] -= tailLength * velocity[2];
    }
    
    this.id = id;
    this.health = emitter.lifespan;
    this.head = head;
    
    vec3.copy(this.position, position);
    vec3.multiply(this.velocity, velocity, scale);
    vec4.copy(this.color, color);
    
    this.gravity = gravity;
    this.scale = 1;
    this.index = 0;
  },
  
  update: function (emitter, sequence, frame, counter, context) {
    this.health -= (context.frameTime / 1000);
    this.velocity[2] -= this.gravity * (context.frameTime / 1000);
    
    vec3.scaleAndAdd(this.position, this.position, this.velocity, (context.frameTime / 1000));

    var lifeFactor = (emitter.lifespan === 0) ? 0 : 1 - (this.health / emitter.lifespan);
    var scale;
    var tempFactor;
    
    if (lifeFactor < emitter.time) {
      tempFactor = lifeFactor / emitter.time;
      
      scale = Math.lerp(emitter.segmentScaling[0], emitter.segmentScaling[1], tempFactor);
      
      vec4.lerp(this.color, emitter.colors[0], emitter.colors[1], tempFactor);
    } else {
      tempFactor = (lifeFactor - emitter.time) / (1 - emitter.time);
      
      scale = Math.lerp(emitter.segmentScaling[1], emitter.segmentScaling[2], tempFactor);
      
      vec4.lerp(this.color, emitter.colors[1], emitter.colors[2], tempFactor);
    }
    
    var currentFrame = lifeFactor * emitter.numberOfFrames;
    var index = 0;
    
    // For some reason if I use array access here, Chrome doesn't like this function and doesn't optimize it
    if (currentFrame < emitter.interval0Frames) {
      index = emitter.interval0LocalStart + ((currentFrame - emitter.interval0Start) % emitter.interval0);
    } else if (currentFrame < emitter.interval1Frames) {
      index = emitter.interval1LocalStart + ((currentFrame - emitter.interval1Start) % emitter.interval1);
    } else if (currentFrame < emitter.interval2Frames) {
      this.index = emitter.interval2LocalStart + ((currentFrame - emitter.interval2Start) % emitter.interval2);
    } else if (currentFrame < emitter.interval3Frames) {
      index = emitter.interval3LocalStart + ((currentFrame - emitter.interval3Start) % emitter.interval3);
    }
    
    this.index = Math.floor(index);
    this.scale = scale;
  }
};