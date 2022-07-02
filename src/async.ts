import { Continue, FutureSuspend, ReadySuspend, Suspend, SuspendState } from './co'

export class Async {
    static run<R>(f: (co: Continue<R | Promise<R>>) => Suspend<R | Promise<R>>): Promise<R> {
        return Async.calc(f(new Continue(val => new ReadySuspend(val))))
    }
    static await<T, R>(p: Promise<T>, co: Continue<T, R | Promise<R>>): Suspend<R | Promise<R>> {
        return new FutureSuspend(async wake => {
            let r: Awaited<T>
            try {
                r = await p
            } catch (err) {
                wake({ err })
                return
            }
            wake({ next: co.suspend(r) })
        })
    }

    static delay<R>(ms: number, co: Continue<void, R | Promise<R>>): Suspend<R | Promise<R>> {
        return new FutureSuspend(wake => {
            setTimeout(() => {
                wake({ next: co.suspend() })
            }, ms)
        })
    }
}

export namespace Async {
    /** Async calc */
    export async function calc<R>(suspend: Suspend<R | Promise<R>>): Promise<R> {
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
                    if (!suspend.waker) throw 'Wrong Suspend implementation, Pending does not implement waker'
                    await new Promise<void>(res => suspend.waker!(res))
                    continue
                default:
                    throw 'Unknown suspend status'
            }
        }
    }
}
