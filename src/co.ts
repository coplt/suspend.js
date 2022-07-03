export class Continue<T, R = T> {
    constructor(public then: (v: T) => Suspend<R>) {}

    suspend(val: T): Suspend<R> {
        return new ContinueSuspend(() => this.then(val))
    }
    delay(f: () => T): Suspend<R> {
        return new ContinueSuspend(() => this.then(f()))
    }
    error(err: any): Suspend<never> {
        return new ErrorSuspend<never>(err)
    }
}

export type ResumeResult<R> = {
    take(): R
} & ({ readonly val: R } | { readonly err: unknown })

export type SuspendResume<R> =
    | Suspend<R>
    | {
          readonly pending: true
          on(e: 'wake', cb: () => void): void
      }
    | {
          readonly pending: false
          readonly result: ResumeResult<R>
      }

export interface Suspend<R> {
    resume(): SuspendResume<R>
}

export class ReadyResult<R> {
    constructor(public val: R) {}
    take(): R {
        return this.val
    }
}

export class ErrorResult<R> {
    constructor(public err: unknown) {}
    take(): R {
        throw this.err
    }
}

export abstract class ResultResume<R> {
    constructor(public result: ResumeResult<R>) {}
    pending: false = false
}

export class ReadyResume<R> extends ResultResume<R> {
    constructor(public val: R) {
        super(new ReadyResult<R>(val))
    }
}

export class ErrorResume<R> extends ResultResume<R> {
    constructor(public err: unknown) {
        super(new ErrorResult<R>(err))
    }
}

export abstract class ResultSuspend<R> implements Suspend<R> {
    constructor(public result: ResultResume<R>) {}
    resume(): SuspendResume<R> {
        return this.result
    }
}

export class ReadySuspend<R> extends ResultSuspend<R> {
    constructor(public val: R) {
        super(new ReadyResume<R>(val))
    }
}

export class ErrorSuspend<R> extends ResultSuspend<R> {
    constructor(public err: unknown) {
        super(new ErrorResume<R>(err))
    }
}

export class ContinueSuspend<R> implements Suspend<R> {
    constructor(public calc: () => Suspend<R>) {}
    #resume?: SuspendResume<R>

    resume(): SuspendResume<R> {
        if (!this.#resume) {
            try {
                this.#resume = this.calc()
            } catch (err) {
                this.#resume = new ErrorResume<R>(err)
            }
        }
        return this.#resume
    }
}

export class FutureResume<R> {
    constructor(calc: (wake: FutureWaker<R>) => void, waker: FutureWaker<R>) {
        calc(res => {
            waker(res)
            this.#wake()
        })
    }
    pending: true = true
    #wakes?: Set<() => void>
    on(e: 'wake', cb: () => void): void {
        if (e == 'wake') {
            if (!this.#wakes) this.#wakes = new Set<() => void>()
            this.#wakes.add(cb)
        }
    }
    #wake() {
        const wakes = this.#wakes
        this.#wakes = void 0
        if (wakes) {
            for (const cb of wakes) {
                try {
                    cb()
                } catch (e) {
                    console.error(e)
                }
            }
        }
    }
}

export type FutureWaker<R> = (res: SuspendResume<R>) => void

export class FutureSuspend<R> implements Suspend<R> {
    constructor(public calc: (wake: FutureWaker<R>) => void) {}

    #resume?: SuspendResume<R>

    resume(): SuspendResume<R> {
        if (!this.#resume) {
            try {
                this.#resume = new FutureResume<R>(this.calc, res => (this.#resume = res))
            } catch (err) {
                this.#resume = new ErrorResume<R>(err)
            }
        }
        return this.#resume
    }
}

export namespace Suspend {
    /** Sync calc */
    export function calc<R>(suspend: Suspend<R>): R {
        for (;;) {
            const resume = suspend.resume()
            if ('pending' in resume) {
                if (resume.pending) {
                    throw 'Futured suspend are not supported'
                } else {
                    return resume.result.take()
                }
            } else {
                suspend = resume
                continue
            }
        }
    }
}
