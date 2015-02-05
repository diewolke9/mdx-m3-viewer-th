uniform sampler2D u_texture;

varying vec2 v_uv;
varying vec4 v_color;

void main() {
    vec4 color = texture2D(u_texture, v_uv).bgra * v_color;

    gl_FragColor = color;
}
