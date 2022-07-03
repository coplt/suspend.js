import { Continue, ContinueSuspend, ReadySuspend, Suspend } from './co'

export class Sequence<R> {
    #res?: { val: R }

    static seq<R>(f: (ctx: Sequence<R>, co: Continue<void>) => Suspend<void>): Iterable<R> {
        const ctx = new Sequence<R>()
        return Sequence.calc(ctx, f(ctx, new Continue(() => new ReadySuspend(void 0))))
    }

    yield(val: R, co: Continue<void>): Suspend<void> {
        this.#res = { val }
        return co.suspend(void 0)
    }

    yieldAll(iter: Iterable<R>, co: Continue<void>): Suspend<void> {
        const itor: Iterator<R> = iter[Symbol.iterator]()
        const loop = (): Suspend<void> => {
            const res = itor.next()
            if (res.done) {
                return co.suspend(void 0)
            } else {
                this.#res = { val: res.value }
                return new ContinueSuspend(loop)
            }
        }
        return loop()
    }

    static *calc<R>(ctx: Sequence<R>, suspend: Suspend<void>): Iterable<R> {
        for (;;) {
            if (ctx.#res) {
                yield ctx.#res.val
                ctx.#res = void 0
            }
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
