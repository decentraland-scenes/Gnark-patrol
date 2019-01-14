
// Coordinates of path to patrol
const point1 = new Vector3(5, 0, 5)
const point2 = new Vector3(5, 0, 15)
const point3 = new Vector3(15, 0, 15)
const point4 = new Vector3(15, 0, 5)
const path: Vector3[] = [point1, point2, point3, point4]


// LerpData component
@Component("lerpData")
export class LerpData {
  array: Vector3[] = path
  origin: number = 0
  target: number = 1
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
    let path = gnark.get(LerpData)
    path.fraction += dt/6
    if (path.fraction < 1) {
      transform.position = Vector3.Lerp(
        path.array[path.origin],
        path.array[path.target],
        path.fraction
      )
     
    } else {
      path.origin = path.target
      path.target += 1
      if (path.target >= path.array.length) {
        path.target = 0
      }
      path.fraction = 0
      transform.lookAt(path.array[path.target])
    }
  }
}

engine.addSystem(new GnarkWalk())
