import * as THREE from 'three/webgpu'
import { mx_noise_float, color, cross, dot, float, transformNormalToView, positionLocal, 
sign, step, Fn, uniform, varying, vec2, vec3, vec4, Loop, uv, texture, attribute } from 'three/tsl';
import me from './me.jpeg'


export default function getMaterial() {
    let uTexture = new THREE.TextureLoader().load(me);


    let material = new THREE.NodeMaterial({
        wireframe: true,
    });

    const asciiCode = Fn(() => {
        const textureColor = texture(uTexture, attribute('aPixelUV'))
        return textureColor
        // return vec4(attribute('aPixelUV').x, attribute('aPixelUV').y, 0.0, 1.0)
    })

    material.colorNode = asciiCode()

    return material
}