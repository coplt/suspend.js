import { Continue, Suspend, ReadySuspend, SuspendState } from './co'

type Maybe<T> = { val: T } | null

namespace Maybe {
    export function maybe<R>(f: (co: Continue<R, Maybe<R>>) => Suspend<Maybe<R>>): Maybe<R> {
        return Suspend.calc(f(new Continue(val => new ReadySuspend({ val }))))
    }

    export function bind<T, R>(m: Maybe<T>, co: Continue<T, Maybe<R>>): Suspend<Maybe<R>> {
        if (m == null) return new ReadySuspend(null)
        return co.suspend(m.val)
    }
}

test('maybe 1', () => {
    let i = 0
    const r = Maybe.maybe<string>(co => {
        i++
        return Maybe.bind(
            { val: 1 },
            new Continue(a => {
                i++
                return co.suspend(`${a}`)
            })
        )
    })
    expect(i).toBe(2)
    expect(r).toEqual({ val: '1' })
})

test('maybe 2', () => {
    let i = 0
    const r = Maybe.maybe<string>(co => {
        i++
        return Maybe.bind(
            null,
            new Continue(a => {
                i++
                return co.suspend(`${a}`)
            })
        )
    })
    expect(i).toBe(1)
    expect(r).toEqual(null)
})
