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

        // Parameters
        this.params = {
            brightnessPower: 1.2,
            randomNoise: 0.02,
            palette: ['#8c1dff', '#f223ff', '#ff2976', '#ff901f', '#ffd318'],
            columns: 40,
            rows: 40
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
        this.setupPlayPauseControl()
        this.createGUI()
        this.render()
    }
    
    setupVideo() {
        return new Promise((resolve) => {
            // Create video element
            this.video = document.createElement('video')
            this.video.src = 'https://static-gstudio.gliacloud.com/10903/files/ce9c969b91a7875b8bf57fbeb4374e728cd96e25.mp4'
            this.video.crossOrigin = 'anonymous'
            this.video.loop = true
            this.video.muted = false // Audio on by default
            this.video.playsInline = true
            // No autoplay - video starts paused
            
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
            
            // Create click-to-play prompt
            this.createPlayPrompt()
            
            // Create audio toggle button
            this.createAudioToggle()
        })
    }
    
    createPlayPrompt() {
        this.playPrompt = document.createElement('div')
        this.playPrompt.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 30px 40px; border-radius: 12px; font-family: Arial; z-index: 1000; cursor: pointer; font-size: 24px; transition: background 0.3s;'
        this.playPrompt.innerHTML = '▶ Click to Play'
        document.body.appendChild(this.playPrompt)
        
        // Hover effect
        this.playPrompt.addEventListener('mouseenter', () => {
            this.playPrompt.style.background = 'rgba(0,0,0,0.95)'
        })
        this.playPrompt.addEventListener('mouseleave', () => {
            this.playPrompt.style.background = 'rgba(0,0,0,0.8)'
        })
    }
    
    createAudioToggle() {
        // Audio toggle will be part of the main GUI now
    }
    
    setupPlayPauseControl() {
        let hasStarted = false
        
        document.body.addEventListener('click', (e) => {
            // Ignore clicks on the audio button
            if (e.target === this.audioButton) return
            
            if (!hasStarted) {
                // First click - start playing
                this.video.play().then(() => {
                    this.playPrompt.remove()
                    hasStarted = true
                    console.log('Video playing with audio')
                }).catch(err => {
                    console.error('Failed to play video:', err)
                })
            } else {
                // Subsequent clicks - toggle play/pause
                if (this.video.paused) {
                    this.video.play()
                } else {
                    this.video.pause()
                }
            }
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
        this.renderer.setSize(this.width, this.height)
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
            videoTexture: this.videoTexture,
            params: this.params
        })
        
        // Instancing parameters - match video aspect ratio
        let aspectRatio = this.videoAspectRatio || 1
        let rows = this.params.rows
        let columns = Math.round(this.params.columns * aspectRatio)
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
    
    createGUI() {
        const gui = document.createElement('div')
        gui.className = 'brutalist-gui'
        gui.innerHTML = `
            <div class="gui-header">CONTROLS</div>
            
            <div class="gui-section">
                <label class="gui-label">AUDIO</label>
                <button class="gui-button" id="audioToggle">ON</button>
            </div>
            
            <div class="gui-section">
                <label class="gui-label">BRIGHTNESS_PWR</label>
                <input type="range" class="gui-slider" id="brightnessPower" min="0.5" max="3" step="0.1" value="${this.params.brightnessPower}">
                <span class="gui-value" id="brightnessPowerValue">${this.params.brightnessPower}</span>
            </div>
            
            <div class="gui-section">
                <label class="gui-label">RANDOM_NOISE</label>
                <input type="range" class="gui-slider" id="randomNoise" min="0" max="0.1" step="0.001" value="${this.params.randomNoise}">
                <span class="gui-value" id="randomNoiseValue">${this.params.randomNoise}</span>
            </div>
            
            <div class="gui-section">
                <label class="gui-label">PALETTE</label>
                <div class="color-grid">
                    ${this.params.palette.map((color, i) => `
                        <input type="color" class="gui-color" id="color${i}" value="${color}">
                    `).join('')}
                </div>
            </div>
            
            <div class="gui-section">
                <label class="gui-label">COLUMNS</label>
                <input type="range" class="gui-slider" id="columns" min="10" max="100" step="1" value="${this.params.columns}">
                <span class="gui-value" id="columnsValue">${this.params.columns}</span>
            </div>
            
            <div class="gui-section">
                <label class="gui-label">ROWS</label>
                <input type="range" class="gui-slider" id="rows" min="10" max="100" step="1" value="${this.params.rows}">
                <span class="gui-value" id="rowsValue">${this.params.rows}</span>
            </div>
        `
        document.body.appendChild(gui)
        
        // Audio toggle
        const audioToggle = document.getElementById('audioToggle')
        audioToggle.addEventListener('click', (e) => {
            e.stopPropagation()
            this.video.muted = !this.video.muted
            audioToggle.textContent = this.video.muted ? 'OFF' : 'ON'
        })
        
        // Brightness power
        const brightnessPower = document.getElementById('brightnessPower')
        const brightnessPowerValue = document.getElementById('brightnessPowerValue')
        brightnessPower.addEventListener('input', (e) => {
            this.params.brightnessPower = parseFloat(e.target.value)
            brightnessPowerValue.textContent = this.params.brightnessPower.toFixed(2)
            this.material.uniforms.uBrightnessPower.value = this.params.brightnessPower
        })
        
        // Random noise
        const randomNoise = document.getElementById('randomNoise')
        const randomNoiseValue = document.getElementById('randomNoiseValue')
        randomNoise.addEventListener('input', (e) => {
            this.params.randomNoise = parseFloat(e.target.value)
            randomNoiseValue.textContent = this.params.randomNoise.toFixed(3)
            this.material.uniforms.uRandomNoise.value = this.params.randomNoise
        })
        
        // Color palette
        this.params.palette.forEach((color, i) => {
            const colorInput = document.getElementById(`color${i}`)
            colorInput.addEventListener('input', (e) => {
                this.params.palette[i] = e.target.value
                this.material.uniforms[`uColor${i + 1}`].value.set(e.target.value)
            })
        })
        
        // Columns and rows with debounce
        let resolutionTimeout
        const updateResolution = () => {
            clearTimeout(resolutionTimeout)
            resolutionTimeout = setTimeout(() => {
                this.scene.remove(this.instancedMesh)
                this.geometry.dispose()
                this.addObjects()
            }, 300)
        }
        
        const columns = document.getElementById('columns')
        const columnsValue = document.getElementById('columnsValue')
        columns.addEventListener('input', (e) => {
            this.params.columns = parseInt(e.target.value)
            columnsValue.textContent = this.params.columns
            updateResolution()
        })
        
        const rows = document.getElementById('rows')
        const rowsValue = document.getElementById('rowsValue')
        rows.addEventListener('input', (e) => {
            this.params.rows = parseInt(e.target.value)
            rowsValue.textContent = this.params.rows
            updateResolution()
        })
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
