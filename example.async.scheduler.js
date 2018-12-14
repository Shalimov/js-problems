// example could be used as simple async event scheduler to monitor
// batch of tasks and run them in corresponding time

const createGCD = () => {
  const gcdResultsCacheMap = new Map()

  const gcd = (x, y) => {
    if (y == 0) {
      return Math.abs(x)
    }

    return gcd(y, x % y)
  }

  const gcdMemo = (x, y) => {
    const cacheKey = `${x}-${y}`
    const inverseKey = `${y}-${x}`
    const containsKey = (gcdResultsCacheMap.has(cacheKey) || gcdResultsCacheMap.has(inverseKey))

    if (!containsKey) {
      gcdResultsCacheMap.set(cacheKey, gcd(x, y))
    }

    return gcdResultsCacheMap.get(cacheKey)
  }

  return gcdMemo
}

const calcGCD = createGCD()

class AsyncTask {
  constructor(id, name, period, fn) {
    this.id = id;
    this.name = name;
    this.period = period;
    this.fn = fn;
  }

  run() {
    this.fn();
  }

  canRun(timepoint) {
    return (timepoint % this.period) === 0
  }
}

class AsyncTaskScheduler {
  static taskId = 1

  constructor() {
    this.autorun = false
    this.tasksMap = new Map()
    this.wormholes = []
    this.currentRound = 0
    this.commonPeriod = Number.POSITIVE_INFINITY
    this.timeoutId = null
  }

  get isRunning() {
    return this.timeoutId !== null
  }

  get isStopped() {
    return !this.isRunning
  }

  add(name, period, fn) {
    const asyncTask = new AsyncTask(AsyncTaskScheduler.taskId++, name, period, fn)
    this.tasksMap.set(asyncTask.id, asyncTask)
    this.invalidateRun(this.autorun)
  }

  removeByName(name) {
    const task = [...this.tasksMap.values()].find(task => task.name === name)

    if (task && this.tasksMap.delete(task.id)) {
      this.invalidateRun(this.autorun)
    }
  }

  run() {
    const stop = this.stop.bind(this)

    if (!this.tasksMap.size) {
      this.autorun = true
      return stop
    }

    if (this.isRunning) return stop

    this.invalidateRun()

    const runTasks = () => {
      if (this.isStopped) return

      const timepoint = this.wormholes[this.currentRound] * (this.currentRound + 1)

      try {
        this.invokeTasksByTimepoint(timepoint)
      } finally {
        if (this.isStopped) return

        this.currentRound = (this.currentRound + 1) % this.wormholes.length
        this.timeoutId = setTimeout(runTasks, this.wormholes[this.currentRound])
      }
    }

    this.timeoutId = setTimeout(runTasks, this.wormholes[0])

    return stop
  }

  rerun() {
    this.stop()
    this.run()
  }

  invokeTasksByTimepoint(timepoint) {
    for (let [, task] of this.tasksMap) {
      if (task.canRun(timepoint)) {
        task.run()
      }
    }
  }

  invalidateRun(rerun) {
    const tasks = [...this.tasksMap.values()]
    let maxPeriod = Number.MIN_SAFE_INTEGER

    this.wormholes.length = 0
    this.commonPeriod = tasks[0].period

    for (let task of tasks) {
      if (maxPeriod < task.period) {
        maxPeriod = task.period
      }

      this.commonPeriod = calcGCD(task.period, this.commonPeriod)
    }

    const maxRounds = maxPeriod / this.commonPeriod
    let prevTimepoint = 0

    for (let r = 0; r < maxRounds; r += 1) {
      const timepoint = ((r + 1) * this.commonPeriod)
      for (let task of tasks) {
        if (task.canRun(timepoint)) {
          this.wormholes.push(timepoint - prevTimepoint)
          prevTimepoint = timepoint
          break
        }
      }
    }

    this.currentRound = 0
    
    if (rerun) {
      this.rerun()
    }
  }

  stop() {
    this.autorun = false
    clearTimeout(this.timeoutId)
    this.timeoutId = null
  }

  destroy() {
    this.tasksMap.clear()
    this.currentRound = 0
    this.commonPeriod = Number.POSITIVE_INFINITY
    this.wormholes = null
    this.timeoutId = null
  }
}

export default AsyncTaskScheduler
