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
}

class AsyncTaskScheduler {
  constructor() {
    this.tasksMap = new Map()
    this.maxRounds = Number.MIN_SAFE_INTEGER;
    this.currentRound = 0;
    this.maxPeriod = Number.MIN_SAFE_INTEGER;
    this.commonPeriod = Number.POSITIVE_INFINITY;
    this.timeoutId = null;
  }

  get isRunning() {
    return this.timeoutId !== null;
  }

  get isStopped() {
    return !this.isRunning;
  }

  add(name, period, fn) {
    const asyncTask = new AsyncTask(AsyncTaskScheduler.taskId++, name, period, fn)
    this.tasksMap.set(asyncTask.id, asyncTask);
    this.invalidateRun();
  }

  removeByName(name) {
    const task = [...this.tasksMap.values()].find(task => task.name === name)

    if (task) {
      this.tasksMap.delete(task.id);
      this.invalidateRun();
    }
  }

  run() {
    if (this.isRunning) return

    this.invalidateRun()

    const runTasks = () => {
      if (this.isStopped) return

      const timepoint = ((this.currentRound + 1) * this.commonPeriod)

      try {
        this.invokeTasksByTimepoint(timepoint)
      } finally {
        this.currentRound = (this.currentRound + 1) % this.maxRounds;
        
        if (this.isRunning) { 
          this.timeoutId = setTimeout(runTasks, this.commonPeriod)
        }
      }
    }

    this.timeoutId = setTimeout(runTasks, this.commonPeriod)
  }

  invokeTasksByTimepoint(timepoint) {
    for (let [, task] of this.tasksMap) {
      if ((timepoint % task.period) === 0) {
        task.fn()
      }
    }
  }

  invalidateRun() {
    const tasks = [...this.tasksMap.values()]

    this.maxPeriod = Number.MIN_SAFE_INTEGER;
    this.commonPeriod = tasks[0].period;

    for (let task of tasks) {
      if (this.maxPeriod < task.period) {
        this.maxPeriod = task.period;
      }

      this.commonPeriod = calcGCD(task.period, this.commonPeriod)
    }

    this.maxRounds = this.maxPeriod / this.commonPeriod;
    this.currentRound = 0;
  }

  stop() {
    clearTimeout(this.timeoutId)
    this.timeoutId = null
  }

  destroy() {
    this.tasksMap.clear()
    this.maxRounds = Number.MIN_SAFE_INTEGER
    this.maxPeriod = Number.MIN_SAFE_INTEGER
    this.currentRound = 0
    this.commonPeriod = Number.POSITIVE_INFINITY
    this.timeoutId = null
  }
}

AsyncTaskScheduler.taskId = 1;

export default AsyncTaskScheduler
