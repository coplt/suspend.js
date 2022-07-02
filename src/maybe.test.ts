import { Continue, Suspend, ReadySuspend } from './co'

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

test('maybe err 1', () => {
    let i = 0
    try {
        Maybe.maybe<string>(() => {
            i++
            return Maybe.bind(
                { val: 1 },
                new Continue(() => {
                    i++
                    throw 'err'
                })
            )
        })
        throw 'never'
    } catch (e) {
        expect(i).toBe(2)
        expect(e).toBe('err')
    }
})

test('maybe err 2', () => {
    let i = 0
    try {
        Maybe.maybe<string>(() => {
            i++
            return Maybe.bind(
                null,
                new Continue(() => {
                    i++
                    throw 'err'
                })
            )
        })
        throw 'never'
    } catch (e) {
        expect(i).toBe(1)
        expect(e).toBe('never')
    }
})

test('maybe err 3', () => {
    let i = 0
    try {
        Maybe.maybe<string>(co => {
            i++
            return Maybe.bind(
                { val: 1 },
                new Continue(() => {
                    i++
                    return co.error('err')
                })
            )
        })
        throw 'never'
    } catch (e) {
        expect(i).toBe(2)
        expect(e).toBe('err')
    }
})

test('maybe err 4', () => {
    let i = 0
    try {
        Maybe.maybe<string>(co => {
            i++
            if (i == 1) throw 'err'
            return Maybe.bind(
                { val: 1 },
                new Continue(() => {
                    i++
                    return co.error('never2')
                })
            )
        })
        throw 'never1'
    } catch (e) {
        expect(i).toBe(1)
        expect(e).toBe('err')
    }
})
