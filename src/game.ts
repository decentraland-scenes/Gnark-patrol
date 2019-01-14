
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
    let increment = Vector3.Forward().scale(dt * 1.5)
    gnark.get(Transform).translate(increment)
  }
}

engine.addSystem(new GnarkWalk())
