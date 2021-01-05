
// Create temple
const temple = new Entity()
temple.addComponent(new GLTFShape('models/Temple.glb'))
temple.addComponent(new Transform({
  position: new Vector3(16, 0, 16),
  rotation: Quaternion.Euler(0,180,0),
  scale: new Vector3(1.6, 1.6, 1.6)
}))
engine.addEntity(temple)

// Create Gnark
let gnark = new Entity()
gnark.addComponent(new Transform({
 position: new Vector3(5, 0, 5)
}))
gnark.addComponent(new GLTFShape('models/gnark.glb'))

// Add Gnark to engine
engine.addEntity(gnark)

// Animations
let gnarkAnimator = new Animator()
gnark.addComponent(gnarkAnimator)
const walkClip = new AnimationState('walk')
gnarkAnimator.addClip(walkClip)
const turnRClip = new AnimationState('turnRight')
turnRClip.looping = false
gnarkAnimator.addClip(turnRClip)
const raiseDeadClip = new AnimationState('raiseDead')
gnarkAnimator.addClip(raiseDeadClip)

// Activate walk animation
walkClip.play()

///// WALK ALONG FIXED PATH /////

// Coordinates of path to patrol
const point1 = new Vector3(8, 0, 8)
const point2 = new Vector3(8, 0, 24)
const point3 = new Vector3(24, 0, 24)
const point4 = new Vector3(24, 0, 8)
const path: Vector3[] = [point1, point2, point3, point4]

// Define custom LerpData component
@Component("lerpData")
export class LerpData {
  array: Vector3[] = path
  origin: number = 0
  target: number = 1
  fraction: number = 0
}

// Add custom LerpData component to Gnark
gnark.addComponent(new LerpData())

// Walk System
export class GnarkWalk implements ISystem {
  update(dt: number) {
    if (!gnark.hasComponent(TimeOut) && !raiseDeadClip.playing ){
      let transform = gnark.getComponent(Transform)
      let path = gnark.getComponent(LerpData)
	  walkClip.playing = true
	  turnRClip.playing = false
      if (path.fraction < 1) {
        path.fraction += dt/12
        transform.position = Vector3.Lerp(
          path.array[path.origin],
          path.array[path.target],
          path.fraction
        ) 
      } else {
	// path segment finished > next segment
        path.origin = path.target
        path.target += 1
        if (path.target >= path.array.length) {
	  // whole path finished > back to start
          path.target = 0
        }
        path.fraction = 0
	// face new target
        transform.lookAt(path.array[path.target])
	// play turn animation
        walkClip.pause()
	turnRClip.looping = false
	turnRClip.play()
	// pause movement for turning 
        gnark.addComponent(new TimeOut(TURN_TIME))
      }
    }
  }
}

engine.addSystem(new GnarkWalk())

///// PAUSE WHILE ROTATING /////

// time to pause
const TURN_TIME = 0.9

// Define custom Rotate component
@Component("timeOut")
export class TimeOut {
  timeLeft: number
  constructor( time: number){
    this.timeLeft = time
  }
}

// Component group to hold all entities with a timeOut
export const pausedGroup = engine.getComponentGroup(TimeOut)

// Wait System
export class WaitSystem implements ISystem {
  update(dt: number) {
    for (let ent of pausedGroup.entities){
      let time = ent.getComponentOrNull(TimeOut)
      if (time){
        if (time.timeLeft > 0) {
          time.timeLeft -= dt
        } else {
          ent.removeComponent(TimeOut)
        }
      }
    }
  }
}

engine.addSystem(new WaitSystem())


///// STOP AND DO BATTLE CRY WHEN PLAYER GETS TOO CLOSE /////

export class BattleCry implements ISystem {
  update() {
    let transform = gnark.getComponent(Transform)
    let path = gnark.getComponent(LerpData)
    let dist = distance(transform.position, camera.position)
    if ( dist < 16) {
      if(raiseDeadClip.playing == false){
        raiseDeadClip.reset()
        raiseDeadClip.playing = true
        walkClip.playing = false
        turnRClip.playing = false
	  }
	  let playerPos = new Vector3(camera.position.x, 0, camera.position.z)
      transform.lookAt(playerPos)
    }
    else if (raiseDeadClip.playing){
      raiseDeadClip.stop()
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
