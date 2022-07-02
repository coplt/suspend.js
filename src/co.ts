export class Continue<T, R = T> {
    constructor(public then: (v: T) => Suspend<R>) {}

    suspend(val: T): Suspend<R> {
        return new ContinueSuspend(() => this.then(val))
    }
    delay(f: () => T): Suspend<R> {
        return new ContinueSuspend(() => this.then(f()))
    }
    error(err: any): Suspend<R> {
        return new ErrorSuspend<R>(err)
    }
}

export enum SuspendState {
    Suspend = 0,
    Pending = 1,
    Ready = 2,
    Error = -1,
}

export interface Suspend<R> {
    resume(): Suspend<R>
    readonly state: SuspendState
    readonly val?: R
    readonly err?: unknown
    waker?(cb: () => void): void
}

export class ReadySuspend<R> implements Suspend<R> {
    constructor(public val: R) {}
    state = SuspendState.Ready

    resume(): Suspend<R> {
        return this
    }
}

export class ErrorSuspend<R> implements Suspend<R> {
    constructor(public err: any) {}
    state = SuspendState.Error

    resume(): Suspend<R> {
        return this
    }
}

export class ContinueSuspend<R> implements Suspend<R> {
    constructor(public calc: () => Suspend<R>) {}
    state = SuspendState.Suspend
    err?: any
    next?: Suspend<R>

    resume(): Suspend<R> {
        switch (this.state) {
            case SuspendState.Ready:
                return this.next!
            case SuspendState.Error:
                return this
            case SuspendState.Suspend:
                try {
                    this.next = this.calc()
                    this.state = SuspendState.Ready
                    return this.next
                } catch (e) {
                    this.state = SuspendState.Error
                    this.err = e
                    return this
                }
            case SuspendState.Pending:
                throw 'Unexpected state Pending'
            default:
                throw 'Unknown suspend status'
        }
    }
}

export type FutureWakerResult<R> = { next: Suspend<R> } | { err: any }

export type FutureWaker<R> = (res: FutureWakerResult<R>) => void

export class FutureSuspend<R> implements Suspend<R> {
    constructor(public calc: (wake: FutureWaker<R>) => void) {}
    state = SuspendState.Suspend
    next?: Suspend<R>
    err?: any
    wakes?: (() => void)[]
    waker(cb: () => void): void {
        if (!this.wakes) this.wakes = []
        this.wakes.push(cb)
    }
    wake(res: FutureWakerResult<R>) {
        if ('next' in res) {
            this.state = SuspendState.Ready
            this.next = res.next
        } else {
            this.state = SuspendState.Error
            this.next = res.err
        }

        const wakes = this.wakes
        delete this.wakes
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

    resume(): Suspend<R> {
        switch (this.state) {
            case SuspendState.Pending:
            case SuspendState.Error:
                return this
            case SuspendState.Ready:
                return this.next!
            case SuspendState.Suspend:
                this.state = SuspendState.Pending
                try {
                    this.calc(res => this.wake(res))
                } catch (e) {
                    this.state = SuspendState.Error
                    this.err = e
                }
                return this
            default:
                throw 'Unknown suspend status'
        }
    }
}

export namespace Suspend {
    /** Sync calc */
    export function calc<R>(suspend: Suspend<R>): R {
        for (;;) {
            suspend = suspend.resume()
            switch (suspend.state) {
                case SuspendState.Suspend:
                    continue
                case SuspendState.Ready:
                    return suspend.val!
                case SuspendState.Error:
                    throw suspend.err!
                case SuspendState.Pending:
                    throw 'Futured suspend are not supported'
                default:
                    throw 'Unknown suspend status'
            }
        }
    }
}
