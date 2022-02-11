type EventHandlerName<T extends string> = `on${T}`

type EventsDefinition<T, K extends keyof T, Params> = {
  onEnter?(params: Params): void
  onLeave?(params: Params): void
  onUpdate?(entity: IEntity, params: Params, deltaTime: number): void
} & Partial<
  Record<
    EventHandlerName<K>,
    (params: Readonly<Params>, eventParams: T[K]) => void
  >
>

type StatesDefinition<State extends object, Events> = Record<
  string,
  EventsDefinition<Events, keyof Events, State>
>

@Component('state-machine')
export class StateMachineComponent<
  Events extends Record<string, object>,
  State extends object
> {
  currentStateName?: string

  constructor(
    private states: StatesDefinition<State, Events>,
    private currentStateValues?: State
  ) {}

  setState(stateName: string, params?: Readonly<State>) {
    if (stateName in this.states) {
      const currentState = this.currentStateName

      if (currentState == stateName) return

      log('Entering state ' + stateName + ' from ' + currentState)

      if (currentState && currentState in this.states) {
        const currentStateDefinition = this.states[currentState]
        if (currentStateDefinition.onLeave && this.currentStateValues) {
          currentStateDefinition.onLeave(this.currentStateValues)
        }
      }

      this.currentStateName = stateName
      this.currentStateValues = params ? params : this.currentStateValues

      if (this.states[this.currentStateName].onEnter) {
        this.states[this.currentStateName].onEnter!(this.currentStateValues)
      }
    }
  }

  notifyEvent<K extends keyof Events>(
    eventName: K,
    eventParams: Readonly<Events[K]>
  ) {
    const currentState = this.currentStateName
    log('Notifying event: ' + eventName + ' in state: ' + currentState)
    if (currentState && currentState in this.states) {
      const currentStateDefinition = this.states[currentState]
      const eventHandlerName: EventHandlerName<K> = ('on' + eventName) as any
      if (
        eventHandlerName in currentStateDefinition &&
        this.currentStateValues
      ) {
        const handler = currentStateDefinition[eventHandlerName] as any
        if (handler) {
          handler(this.currentStateValues, eventParams)
        }
      }
    }
  }

  // @internal
  update(entity: IEntity, dt: number) {
    const currentState = this.currentStateName
    if (currentState && currentState in this.states) {
      const currentStateDefinition = this.states[currentState]
      if (this.currentStateValues && currentStateDefinition.onUpdate) {
        currentStateDefinition.onUpdate(entity, this.currentStateValues, dt)
      }
    }
  }
}

const stateMachines = engine.getComponentGroup(StateMachineComponent)

engine.addSystem({
  update(dt) {
    for (const entity of stateMachines.entities) {
      const fsm = entity.getComponentOrNull(StateMachineComponent)
      if (fsm) fsm.update(entity, dt)
    }
  },
})
