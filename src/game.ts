
// Coordinates of path to patrol
const point1 = new Vector3(5, 0, 5)
const point2 = new Vector3(5, 0, 15)
const point3 = new Vector3(15, 0, 15)
const point4 = new Vector3(15, 0, 5)
const path: Vector3[] = [point1, point2, point3, point4]

const TURN_TIME = 0.9

// LerpData component
@Component("lerpData")
export class LerpData {
  array: Vector3[] = path
  origin: number = 0
  target: number = 1
  fraction: number = 0
}

// Rotate component
@Component("timeOut")
export class TimeOut {
  timeLeft: number
  constructor( time: number){
    this.timeLeft = time
  }
}

// component group to hold all entities with a timeOut
export const paused = engine.getComponentGroup(TimeOut)

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
const turnRClip = new AnimationClip('turnRight', { loop: false })
gnark.get(GLTFShape).addClip(turnRClip)
const raiseDeadClip = new AnimationClip('raiseDead')
gnark.get(GLTFShape).addClip(raiseDeadClip)


// Activate walk animation
walkClip.play()

// Walk System
export class GnarkWalk {
  update(dt: number) {
    if (!gnark.has(TimeOut) && !raiseDeadClip.playing ){
      let transform = gnark.get(Transform)
      let path = gnark.get(LerpData)
      walkClip.playing = true
      if (path.fraction < 1) {
        path.fraction += dt/6
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
        walkClip.pause()
        turnRClip.play()
        gnark.set(new TimeOut(TURN_TIME))
      }
    }
  }
}

engine.addSystem(new GnarkWalk())

// Wait System
export class WaitSystem {
  update(dt: number) {
    for (let ent of paused.entities){
      let time = ent.getOrNull(TimeOut)
      if (time){
        if (time.timeLeft > 0) {
          time.timeLeft -= dt
        } else {
          ent.remove(TimeOut)
        }
      }
    }
  }
}

engine.addSystem(new WaitSystem())

// React and stop walking when the user gets close enough

export class BattleCry {
  update() {
    let transform = gnark.get(Transform)
    let path = gnark.get(LerpData)
    let dist = distance(transform.position, camera.position)
    if ( dist < 16) {
      raiseDeadClip.playing = true
      walkClip.playing = false
      turnRClip.playing = false
      transform.lookAt(camera.position)
    }
    else if (raiseDeadClip.playing){
      raiseDeadClip.pause()
      transform.lookAt(path.array[path.target])
    }
  }
}

engine.addSystem(new BattleCry())

// Object that tracks user position and rotation
const camera = Camera.instance

// Get distance
/* 
Note:
This function really returns distance squared, as it's a lot more efficient to calculate.
The square root operation is expensive and isn't really necessary if we compare the result to squared values.
We also use {x,z} not {x,y}. The y-coordinate is how high up it is.
*/
function distance(pos1: Vector3, pos2: Vector3): number {
  const a = pos1.x - pos2.x
  const b = pos1.z - pos2.z
  return a * a + b * b
}