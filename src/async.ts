import { Continue, FutureSuspend, ReadySuspend, ErrorResume, Suspend } from './co'

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
                wake(new ErrorResume<R>(err))
                return
            }
            wake(co.suspend(r))
        })
    }

    static delay<R>(ms: number, co: Continue<void, R | Promise<R>>): Suspend<R | Promise<R>> {
        return new FutureSuspend(wake => {
            setTimeout(() => {
                wake(co.suspend())
            }, ms)
        })
    }
}

export namespace Async {
    /** Async calc */
    export async function calc<R>(suspend: Suspend<R | Promise<R>>): Promise<R> {
        for (;;) {
            const resume = suspend.resume()
            if ('pending' in resume) {
                if (resume.pending) {
                    await new Promise<void>(res => {
                        resume.on('wake', res)
                    })
                    continue
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
