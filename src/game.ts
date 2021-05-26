// Coordinates of path to patrol
const point1 = new Vector3(8, 0, 8)
const point2 = new Vector3(8, 0, 24)
const point3 = new Vector3(24, 0, 24)
const point4 = new Vector3(24, 0, 8)
const path: Vector3[] = [point1, point2, point3, point4]

const TURN_TIME = 0.9

// // a message bus to sync state for all players
export const sceneMessageBus = new MessageBus()

// LerpData component
@Component('lerpData')
export class LerpData {
  array: Vector3[] = path
  origin: number = 0
  target: number = 1
  fraction: number = 0
  yelling: boolean = false
  yellingAtPlayer: boolean = false
}

// Rotate component
@Component('timeOut')
export class TimeOut {
  timeLeft: number
  onWait?: () => void
  constructor(time: number, onWait?: () => void) {
    this.timeLeft = time
    this.onWait = onWait
  }
}

// component group to hold all entities with a timeOut
export const paused = engine.getComponentGroup(TimeOut)

/// --- Define a custom type to pass in messages ---
type yellMessage = {
  playerPos: Vector3
}

type walkMessage = {
  gnarkPos: Vector3
  origin: number
  target: number
  fraction: number
}

// Create temple
const temple = new Entity()
temple.addComponent(new GLTFShape('models/Temple.glb'))
temple.addComponent(
  new Transform({
    position: new Vector3(16, 0, 16),
    rotation: Quaternion.Euler(0, 180, 0),
    scale: new Vector3(1.6, 1.6, 1.6),
  })
)

// Add temple to engine
engine.addEntity(temple)

// Create Gnark
let gnark = new Entity()
gnark.addComponent(
  new Transform({
    position: new Vector3(5, 0, 5),
  })
)

let gnarkShape = new GLTFShape('models/gnark.glb')

gnark.addComponent(gnarkShape)

let gnarkAnimator = new Animator()
gnark.addComponent(gnarkAnimator)
// Add LerpData component to Gnark
gnark.addComponent(new LerpData())

// Add Gnark to engine
engine.addEntity(gnark)

// Add walk animation
const walkClip = new AnimationState('walk')
gnarkAnimator.addClip(walkClip)
const turnRClip = new AnimationState('turnRight', { looping: false })
gnarkAnimator.addClip(turnRClip)
const raiseDeadClip = new AnimationState('raiseDead')
gnarkAnimator.addClip(raiseDeadClip)

// Activate walk animation
walkClip.play()

// Walk System
export class GnarkWalk {
  update(dt: number) {
    if (!gnark.hasComponent(TimeOut) && !raiseDeadClip.playing) {
      let transform = gnark.getComponent(Transform)
      let path = gnark.getComponent(LerpData)
      if (path.fraction < 1) {
        path.fraction += dt / 12
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
        turnRClip.play()
        gnark.addComponent(
          new TimeOut(TURN_TIME, () => {
            walkClip.play()
          })
        )
      }
    }
  }
}

engine.addSystem(new GnarkWalk())

// Wait System
export class WaitSystem {
  update(dt: number) {
    for (let ent of paused.entities) {
      let time = ent.getComponentOrNull(TimeOut)
      if (time) {
        if (time.timeLeft > 0) {
          time.timeLeft -= dt
        } else {
          if (time.onWait) {
            time.onWait()
          }
          ent.removeComponent(TimeOut)
        }
      }
    }
  }
}

engine.addSystem(new WaitSystem())

// React and stop walking when the user gets close enough
onPositionChangedObservable.add((eventData) => {
  let transform = gnark.getComponent(Transform)
  let path = gnark.getComponent(LerpData)
  let dist = distance(transform.position, eventData.position)
  if (dist < 16) {
    if (!path.yelling && !path.yellingAtPlayer) {
      path.yellingAtPlayer = true
      const action: yellMessage = {
        playerPos: camera.position,
      }
      sceneMessageBus.emit('yell', action)
    }
  } else if (path.yellingAtPlayer) {
    path.yellingAtPlayer = false
    const action: walkMessage = {
      gnarkPos: transform.position.clone(),
      origin: path.origin,
      target: path.target,
      fraction: path.fraction,
    }
    sceneMessageBus.emit('walk', action)
  }
})

function startYelling(info: yellMessage) {
  raiseDeadClip.reset()
  raiseDeadClip.play()
  let transform = gnark.getComponent(Transform)
  transform.lookAt(new Vector3(info.playerPos.x, 0, info.playerPos.z))
  let path = gnark.getComponent(LerpData)
  path.yelling = true
}

function stopYelling(info: walkMessage) {
  walkClip.play()
  let path = gnark.getComponent(LerpData)
  let transform = gnark.getComponent(Transform)
  transform.position = info.gnarkPos
  path.target = info.target
  path.origin = info.origin
  path.fraction = info.fraction
  path.yelling = false
  transform.lookAt(path.array[path.target])
}

// Object that tracks user position and rotation
const camera = Camera.instance

sceneMessageBus.on('yell', (info: yellMessage) => {
  startYelling(info)
})

sceneMessageBus.on('walk', (info: walkMessage) => {
  stopYelling(info)
})

// Get distance
/* 
Note:
This function really returns distance squared, as it's a lot more efficient to calculate.
The square root operation is expensive and isn't really necessary if we compare the result to squared values.
We also use {x,z} not {x,y}. The y-coordinate is how high up it is.
*/
function distance(
  pos1: Vector3 | ReadOnlyVector3,
  pos2: Vector3 | ReadOnlyVector3
): number {
  const a = pos1.x - pos2.x
  const b = pos1.z - pos2.z
  return a * a + b * b
}

// To get the initial state of the scene from other players when joining
sceneMessageBus.emit('getGameState', {})

// To return the initial state of the scene to new players
sceneMessageBus.on('getGameState', () => {
  let transform = gnark.getComponent(Transform)
  let path = gnark.getComponent(LerpData)
  const action: walkMessage = {
    gnarkPos: transform.position.clone(),
    origin: path.origin,
    target: path.target,
    fraction: path.fraction,
  }
  sceneMessageBus.emit('walk', action)
})
