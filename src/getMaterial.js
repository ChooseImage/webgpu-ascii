import * as THREE from 'three/webgpu'
import { mx_noise_float, color, cross, dot, float, transformNormalToView, positionLocal, 
sign, step, Fn, uniform, varying, vec2, vec3, vec4, Loop, uv, texture, attribute, pow, 
mix, floor, mul} from 'three/tsl';
let pallete = [
    '#8c1dff',
    '#f223ff',
    '#ff2976',
    '#ff901f',
    '#ffd318'
]

export default function getMaterial({ asciiTexture, length, videoTexture }) {
    let uTexture = videoTexture;


    let material = new THREE.NodeMaterial({
        wireframe: true,
    });

    const uColor1 = uniform(color(pallete[0]))
    const uColor2 = uniform(color(pallete[1]))
    const uColor3 = uniform(color(pallete[2]))
    const uColor4 = uniform(color(pallete[3]))
    const uColor5 = uniform(color(pallete[4]))


    const asciiCode = Fn(() => {
        const textureColor = texture(uTexture, attribute('aPixelUV'))
        const brightness = pow(textureColor.r, 1.2).add(attribute('aRandom').x.mul(0.02))
        const asciiUV = vec2(
            uv().x.div(length).add(floor(brightness.mul(length)).div(length)), 
            uv().y
        )

        const asciiCode = texture(asciiTexture, asciiUV)
        let finalColor = uColor1
        finalColor = mix(finalColor, uColor2, step(0.2, brightness))
        finalColor = mix(finalColor, uColor3, step(0.4, brightness))
        finalColor = mix(finalColor, uColor4, step(0.6, brightness))
        finalColor = mix(finalColor, uColor5, step(0.8, brightness))

        return asciiCode.mul(finalColor)
        //return vec4(attribute('aPixelUV').x, attribute('aPixelUV').y, 0.0, 1.0)
    })

    material.colorNode = asciiCode()

    return material
}
