
// LerpData component
@Component("lerpData")
export class LerpData {
  origin: Vector3 = new Vector3(5, 0, 5)
  target: Vector3 = new Vector3(5, 0, 15)
 fraction: number = 0
}


// Create temple
const temple = new Entity()
temple.add(new GLTFShape('models/Temple.gltf'))
temple.add(new Transform({
  position: new Vector3(10, 0, 10)
}))

// Add temple to engine
engine.addEntity(temple)

// Create Gnark
let gnark = new Entity()
gnark.add(new Transform({
 position: new Vector3(5, 0, 5),
 scale: new Vector3(0.75, 0.75, 0.75)
}))
gnark.add(new GLTFShape('models/gnark.gltf'))

// Add LerpData component to Gnark
gnark.add(new LerpData())

// Add Gnark to engine
engine.addEntity(gnark)

// Add walk animation
const walkClip = new AnimationClip('walk')
gnark.get(GLTFShape).addClip(walkClip)

// Activate walk animation
walkClip.play()


// Walk System
export class GnarkWalk {
  update(dt: number) {
    let transform = gnark.get(Transform)
    let lerp = gnark.get(LerpData)
    if (lerp.fraction < 1) {
       lerp.fraction += dt / 6
      transform.position = Vector3.Lerp(
        lerp.origin,
        lerp.target,
        lerp.fraction
      )
      }
     else {
       walkClip.pause()
    }
  }
}

engine.addSystem(new GnarkWalk())
