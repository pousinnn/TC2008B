#version 300 es

in vec2 a_position;

uniform vec2 u_resolution;
uniform vec2 u_translation;
uniform vec2 u_rotation;

vec4 projection2D(vec2 position, vec2 resolution) {
    vec2 zeroToOne = position / resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;

    vec4 flippedSpace = vec4(
        clipSpace * vec2(1.0, -1.0),
        0.0,
        1.0
    );

    return flippedSpace;
}

void main() {
    vec2 rotatedPosition = vec2(
        a_position.x * u_rotation.x - a_position.y * u_rotation.y,
        a_position.y * u_rotation.x + a_position.x * u_rotation.y
    );

    vec2 position = rotatedPosition + u_translation;

    gl_Position = projection2D(position, u_resolution);
}