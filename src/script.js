import * as THREE from 'three/webgpu'
import { MeshBasicNodeMaterial } from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import getMaterial from './getMaterial'

export default class Sketch {
    constructor() {
        // Check WebGPU support
        if (!navigator.gpu) {
            const warning = document.createElement('div')
            warning.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #ff6b6b; color: white; padding: 20px; border-radius: 8px; font-family: Arial; z-index: 1000;'
            warning.innerHTML = '<h2>WebGPU Not Supported</h2><p>Your browser does not support WebGPU. Please use Chrome 113+ or Edge 113+.</p>'
            document.body.appendChild(warning)
            return
        }

        
        // Canvas
        this.container = document.querySelector('canvas.webgpu')
        
        // Scene
        this.scene = new THREE.Scene()
        
        // Sizes
        this.width = window.innerWidth
        this.height = window.innerHeight
        
        // Clock
        this.clock = new THREE.Clock()

        // this.createASCIITexture()
        
        // Initialize
        this.init()
    }

    createASCIITexture() {
        let dict = "`.-':_,^=;><+!rc*/z?sLTv)J7(|Fi{C}fI31tlu[neoZ5Yxjya]2ESwqkP6h9d4VpOGbUAKXHm8RD#$Bg0MNWQ%&@"
        this.length = dict.length
        let canvas = document.createElement('canvas')
        let ctx = canvas.getContext('2d')
        // document.body.appendChild(canvas)
        canvas.style.cssText = 'position: fixed; top: 0; left: 0; z-index: 1000; border: 2px solid red;'

        canvas.width = this.length * 64
        canvas.height = 64

        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.font = 'bold 40px Menlo'
        ctx.fillStyle = 'white'
        ctx.textAlign = 'center'
        
        for(let i = 0; i < this.length; i++) {
            if(i>50){
                for(let j = 0; j < 7; j++) {
                    ctx.filter = `blur(${j*1.2}px)`
                    ctx.fillText(dict[i], i * 64 + 32, 46)
                }
            }
            ctx.filter = 'none'
            ctx.fillText(dict[i], i * 64 + 32, 46)
        }

        let asciiTexture = new THREE.Texture(canvas)
        asciiTexture.needsUpdate = true
        return asciiTexture
    }
    
    async init() {
        this.setupCamera()
        await this.setupRenderer()
        await this.setupVideo()
        this.addObjects()
        this.setupControls()
        this.setupResize()
        this.render()
    }
    
    setupVideo() {
        return new Promise((resolve) => {
            // Create video element
            this.video = document.createElement('video')
            this.video.src = new URL('./2u.mp4', import.meta.url).href
            this.video.loop = true
            this.video.muted = true
            this.video.playsInline = true
            
            // Create video texture
            this.videoTexture = new THREE.VideoTexture(this.video)
            this.videoTexture.minFilter = THREE.LinearFilter
            this.videoTexture.magFilter = THREE.LinearFilter
            this.videoTexture.format = THREE.RGBAFormat
            
            // Store video dimensions once loaded
            this.video.addEventListener('loadedmetadata', () => {
                this.videoWidth = this.video.videoWidth
                this.videoHeight = this.video.videoHeight
                this.videoAspectRatio = this.videoWidth / this.videoHeight
                console.log(`Video dimensions: ${this.videoWidth}x${this.videoHeight}, aspect ratio: ${this.videoAspectRatio}`)
                resolve()
            })
            
            // Start playing the video
            this.video.play().catch(err => {
                console.log('Video autoplay failed, click to start:', err)
                // Add click listener to start video if autoplay fails
                document.addEventListener('click', () => {
                    this.video.play()
                }, { once: true })
            })
        })
    }
    
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.width / this.height,
            0.1,
            100
        )
        this.camera.position.set(0, 0, 3.8)
        this.scene.add(this.camera)
    }
    
    async setupRenderer() {
        this.renderer = new THREE.WebGPURenderer({
            canvas: this.container
        })
        this.renderer.setSize(this.width, this.height)
        this.renderer.setClearColor(0x000000, 1)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        
        // Initialize WebGPU renderer
        await this.renderer.init()
    }
    
    setupControls() {
        this.controls = new OrbitControls(this.camera, this.container)
        this.controls.enableDamping = true
    }
    
    setupResize() {
        window.addEventListener('resize', this.resize.bind(this))
    }
    
    resize() {
        // Update sizes
        this.width = window.innerWidth
        this.height = window.innerHeight
        
        // Update camera
        this.camera.aspect = this.width / this.height
        this.camera.updateProjectionMatrix()
        
        // Update renderer
        this.renderer.setSiz(this.width, this.height)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }
    
    addObjects() {
        // Material
        this.material = new MeshBasicNodeMaterial({
            color: 0x000000,
            wireframe: true
        })
        this.material = getMaterial({
            asciiTexture: this.createASCIITexture(),
            length: this.length,
            videoTexture: this.videoTexture
        })
        
        // Instancing parameters - match video aspect ratio
        // Keep height fixed at 50 rows, adjust width based on aspect ratio
        let aspectRatio = this.videoAspectRatio || 1
        let baseResolution = 50
        let rows = baseResolution
        let columns = Math.round(baseResolution * aspectRatio)
        let instances = rows * columns
        let size = 0.1
        
        // Geometry
        this.geometry = new THREE.PlaneGeometry(size, size, 1, 1)

        this.positions = new Float32Array(instances * 3)
        this.colors = new Float32Array(instances * 3)
        let uv = new Float32Array(instances * 2)
        let random = new Float32Array(instances)
        this.instancedMesh = new THREE.InstancedMesh(this.geometry, this.material, instances)

        for(let i = 0; i < columns; i++) {
            for(let j = 0; j < rows; j++) {
                let index = (i * rows) + j
                uv[index * 2] = i / (columns - 1)
                random[index] = Math.random() 
                uv[index * 2 + 1] = j / (rows - 1)
                this.positions[index * 3] = i * size - size * (columns - 1)/2
                this.positions[index * 3 + 1] = j * size - size * (rows - 1)/2
                this.positions[index * 3 + 2] = 0
                let m = new THREE.Matrix4()
                m.setPosition(this.positions[index * 3], this.positions[index * 3 + 1], this.positions[index * 3 + 2])
                this.instancedMesh.setMatrixAt(index, m)
                index++
            }
        }
        this.instancedMesh.instanceMatrix.needsUpdate = true
        this.geometry.setAttribute('aPixelUV', new THREE.InstancedBufferAttribute(uv, 2))
        this.geometry.setAttribute('aRandom', new THREE.InstancedBufferAttribute(random, 1))
        
        const count = this.geometry.attributes.position.count
        const randoms = new Float32Array(count)
        
        for(let i = 0; i < count; i++) {
            randoms[i] = Math.random()
        }

        this.scene.add(this.instancedMesh)
    }
    
    render() {
        const elapsedTime = this.clock.getElapsedTime()
        
        // Update controls
        this.controls.update()
        
        // Render
        this.renderer.render(this.scene, this.camera)
        
        // Call render again on the next frame
        window.requestAnimationFrame(this.render.bind(this))
    }
}

// Initialize the sketch
new Sketch()
