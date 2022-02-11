import { StateMachineComponent } from './fsm'
import { sceneMessageBus } from './messageBus'
import { currentPlayerId } from './trackPlayers'

// Coordinates of path to patrol
const point1 = new Vector3(8, 0, 8)
const point2 = new Vector3(8, 0, 24)
const point3 = new Vector3(24, 0, 24)
const point4 = new Vector3(24, 0, 8)
const path: Vector3[] = [point1, point2, point3, point4]

const TURN_TIME = 0.9

// LerpData component
// @Component('lerpData')
// export class LerpData {
//   array: Vector3[] = path
//   origin: number = 0
//   target: number = 1
//   fraction: number = 0
// }

// Rotate component
// @Component('timeOut')
// export class TimeOut {
//   timeLeft: number
//   onWait?: () => void
//   constructor(time: number, onWait?: () => void) {
//     this.timeLeft = time
//     this.onWait = onWait
//   }
// }

type SkeletonState = {
  LerpData: {
    array: Vector3[]
    origin: number
    target: number
    fraction: number
  }
  timeLeft: number
}

//// Approach 1

// Rotate component
// @Component('npc')
// export class NPC {
//   state: NPC_STATES
// }

// // states
// enum NPC_STATES {
//   WALKING,
//   TURNING,
//   YELLING_AT_OTHER,
//   YELLING_AT_PLAYER,
//   DEAD,
// }

// export function switchState(entity: Entity, newState: NPC_STATES) {
//   let currentState = entity.getComponent(NPC).state

//   switch (newState) {
//     case NPC_STATES.WALKING:
//       break
//     case NPC_STATES.TURNING:
//       break
//     case NPC_STATES.YELLING_AT_OTHER:
//       break
//     case NPC_STATES.YELLING_AT_PLAYER:
//       break
//     case NPC_STATES.DEAD:
//       break
//   }
// }

//// Approach 2

// export class State {
//   state: any
//   enter(entity: Entity): void {}
//   exit(entity: Entity): void {}
//   update(entity: Entity): void {}
// }

// @Component('state_walking')
// export class Walking extends State {
//   enter(entity: Entity): void {
//     // if dead, return
//     //start playing walk anim
//   }
//   exit(entity: Entity): void {
//     //stop playing walk anim
//   }
//   update(entity: Entity): void {
//     // update position
//   }
// }

// @Component('state_dead')
// export class DEAD extends State {
//   enter(entity: Entity): void {
//     // play die anim
//     // remove onPointerDown
//   }
//   exit(entity: Entity): void {
//     // if
//   }
//   update(entity: Entity): void {
//     // update position
//   }
// }

//////////

// component group to hold all entities with a timeOut
// export const paused = engine.getComponentGroup(TimeOut)

/// --- Define a custom type to pass in messages ---
type yellMessage = {
  playerPos: Vector3
  playerId: string
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
// gnark.addComponent(new LerpData())
// gnark.addComponent(new NPC())
// gnark.getComponent(NPC).state = NPC_STATES.WALKING

// Add Gnark to engine
engine.addEntity(gnark)

// Add walk animation
const walkClip = new AnimationState('walk')
gnarkAnimator.addClip(walkClip)
const turnRClip = new AnimationState('turnRight', { looping: false })
gnarkAnimator.addClip(turnRClip)
const raiseDeadClip = new AnimationState('raiseDead')
gnarkAnimator.addClip(raiseDeadClip)

walkClip.play()
// states:
// - walking
// - turning
// - yellingToPlayer
// - yellingToOther

gnark.addComponent(
  new StateMachineComponent(
    {
      Walking: {
        //   onEnter(entity){
        // 	entity.getComponent(Animator).getClip('walk').play()
        //   transform.lookAt(
        // currentStateValues.LerpData.array[
        //     currentStateValues.LerpData.target
        //   ]
        // )
        //   },
        onUpdate(entity, currentStateValues, dt) {
          let transform = entity.getComponent(Transform)

          if (currentStateValues.LerpData.fraction < 1) {
            currentStateValues.LerpData.fraction += dt / 12
            transform.position = Vector3.Lerp(
              currentStateValues.LerpData.array[
                currentStateValues.LerpData.origin
              ],
              currentStateValues.LerpData.array[
                currentStateValues.LerpData.target
              ],
              currentStateValues.LerpData.fraction
            )
          } else {
            currentStateValues.LerpData.origin =
              currentStateValues.LerpData.target
            currentStateValues.LerpData.target += 1
            if (
              currentStateValues.LerpData.target >=
              currentStateValues.LerpData.array.length
            ) {
              currentStateValues.LerpData.target = 0
            }
            currentStateValues.LerpData.fraction = 0
            transform.lookAt(
              currentStateValues.LerpData.array[
                currentStateValues.LerpData.target
              ]
            )
            entity.getComponent(Animator).getClip('turnRight').play()
            entity
              .getComponent(StateMachineComponent)
              .setState('Turning', { ...currentStateValues })
          }

          let dist = distance(transform.position, Camera.instance.position)
          if (dist < 16) {
            {
              const action: yellMessage = {
                playerPos: Camera.instance.position,
                playerId: currentPlayerId,
              }
              sceneMessageBus.emit('yell', action)
            }
          }
        },
      },
      Turning: {
        onEnter(currentStateValues) {
          currentStateValues.timeLeft = TURN_TIME
          // 	entity.getComponent(Animator).getClip('turnRight').play()
        },
        onUpdate(entity, currentStateValues, dt) {
          if (currentStateValues.timeLeft > 0) {
            currentStateValues.timeLeft -= dt
          } else {
            entity.getComponent(Animator).getClip('walk').play()
            entity
              .getComponent(StateMachineComponent)
              .setState('Walking', { ...currentStateValues })
          }
        },
      },
      YellingAtPlayer: {
        // onEnter(currentStateValues){
        // 	// 	entity.getComponent(Animator).getClip('raiseDead').play()
        //   },
        onUpdate(entity, currentStateValues, dt) {
          let transform = entity.getComponent(Transform)
          //   let path = entity.getComponent(LerpData)
          let dist = distance(transform.position, Camera.instance.position)
          if (dist < 16) {
          } else {
            entity
              .getComponent(StateMachineComponent)
              .setState('Walking', { ...currentStateValues })
            const action: walkMessage = {
              gnarkPos: transform.position.clone(),
              origin: currentStateValues.LerpData.origin,
              target: currentStateValues.LerpData.target,
              fraction: currentStateValues.LerpData.fraction,
            }
            sceneMessageBus.emit('walk', action)
          }
        },
      },
      YellingAtOther: {
        // onEnter(currentStateValues){
        // 	// 	entity.getComponent(Animator).getClip('raiseDead').play()
        //   },
      },
    },
    {
      LerpData: {
        array: path,
        origin: 0,
        target: 1,
        fraction: 0,
      },
      timeLeft: 2,
    }
  )
)

gnark.getComponent(StateMachineComponent).setState('Walking', {
  LerpData: {
    array: path,
    origin: 0,
    target: 1,
    fraction: 0,
  },
  timeLeft: 2,
})

// export function checkPlayerDistance(entity: Entity) {
//   if (!entity.hasComponent(StateMachineComponent)) return
//   let transform = entity.getComponent(Transform)

//   let dist = distance(transform.position, Camera.instance.position)
//   if (dist < 16) {
//     if (
//       entity.getComponent(StateMachineComponent).currentStateName !==
//       'YellingAtPlayer'
//     ) {
//       const action: yellMessage = {
//         playerPos: Camera.instance.position,
//         playerId: currentPlayerId,
//       }
//       sceneMessageBus.emit('yell', action)
//     }
//   } else if (
//     entity.getComponent(StateMachineComponent).currentStateName ===
//     'YellingAtPlayer'
//   ) {
//     entity.getComponent(StateMachineComponent).setState('Walking', {})
//   }
// }

// Activate walk animation
//walkClip.play()

// // Walk System
// export class GnarkWalk {
//   update(dt: number) {
//     if (!gnark.hasComponent(TimeOut) && !raiseDeadClip.playing) {
//       let transform = gnark.getComponent(Transform)
//       let path = gnark.getComponent(LerpData)
//       if (path.fraction < 1) {
//         path.fraction += dt / 12
//         transform.position = Vector3.Lerp(
//           path.array[path.origin],
//           path.array[path.target],
//           path.fraction
//         )
//       } else {
//         path.origin = path.target
//         path.target += 1
//         if (path.target >= path.array.length) {
//           path.target = 0
//         }
//         path.fraction = 0
//         transform.lookAt(path.array[path.target])
//         turnRClip.play()
//         gnark.addComponent(
//           new TimeOut(TURN_TIME, () => {
//             walkClip.play()
//           })
//         )
//       }
//     }
//   }
// }

// engine.addSystem(new GnarkWalk())

// Wait System
// export class WaitSystem {
//   update(dt: number) {
//     for (let ent of paused.entities) {
//       let time = ent.getComponentOrNull(TimeOut)
//       if (time) {
//         if (time.timeLeft > 0) {
//           time.timeLeft -= dt
//         } else {
//           if (time.onWait) {
//             time.onWait()
//           }
//           ent.removeComponent(TimeOut)
//         }
//       }
//     }
//   }
// }

// engine.addSystem(new WaitSystem())

// React and stop walking when the user gets close enough

// export class BattleCry {
//   update() {
//     let transform = gnark.getComponent(Transform)
//     let path = gnark.getComponent(LerpData)
//     let dist = distance(transform.position, camera.position)
//     if (dist < 16) {
//       if (!path.yelling && !path.yellingAtPlayer) {
//         //path.yelling = true
//         path.yellingAtPlayer = true
//         const action: yellMessage = {
//           playerPos: camera.position,
//         }
//         sceneMessageBus.emit('yell', action)
//       }
//     } else if (path.yellingAtPlayer) {
//       path.yellingAtPlayer = false
//       const action: walkMessage = {
//         gnarkPos: transform.position.clone(),
//         origin: path.origin,
//         target: path.target,
//         fraction: path.fraction,
//       }
//       sceneMessageBus.emit('walk', action)
//     }
//   }
// }

// engine.addSystem(new BattleCry())

// Object that tracks user position and rotation
// const camera = Camera.instance

sceneMessageBus.on('yell', (info: yellMessage) => {
  raiseDeadClip.reset()
  raiseDeadClip.play()
  let transform = gnark.getComponent(Transform)
  transform.lookAt(new Vector3(info.playerPos.x, 0, info.playerPos.z))
  //   let path = gnark.getComponent(LerpData)
  //   path.yelling = true

  if (currentPlayerId && info.playerId === currentPlayerId) {
    gnark.getComponent(StateMachineComponent).setState('YellingAtPlayer')
  } else {
    gnark.getComponent(StateMachineComponent).setState('YellingAtOther')
  }
})

sceneMessageBus.on('walk', (info: walkMessage) => {
  gnark.getComponent(Animator).getClip('walk').play()
  //   let path = gnark.getComponent(StateMachineComponent).
  let transform = gnark.getComponent(Transform)
  //   transform.position = info.gnarkPos
  //   path.target = info.target
  //   path.origin = info.origin
  //   path.fraction = info.fraction
  //   path.yelling = false
  //   transform.lookAt(path.array[path.target])
  gnark.getComponent(StateMachineComponent).setState('Walking')
})

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

// To get the initial state of the scene from other players when joining
// sceneMessageBus.emit('getGameState', {})

// // To return the initial state of the scene to new players
// sceneMessageBus.on('getGameState', () => {
//   let transform = gnark.getComponent(Transform)
//   //   let path = gnark.getComponent(LerpData)
//   //   const action: walkMessage = {
//   //     gnarkPos: transform.position.clone(),
//   //     origin: path.origin,
//   //     target: path.target,
//   //     fraction: path.fraction,
//   //   }
//   sceneMessageBus.emit('walk', {})
// })
