# Suspend.js

[![Node.js CI](https://github.com/coplt/suspend.js/actions/workflows/node.js.yml/badge.svg)](https://github.com/coplt/suspend.js/actions/workflows/node.js.yml)
![MIT](https://img.shields.io/github/license/coplt/suspend.js)
[![NPM](https://img.shields.io/npm/v/@coplt/suspend)](https://www.npmjs.com/package/@coplt/suspend)
[![Github](https://img.shields.io/badge/Github-232323?logo=github)](https://github.com/coplt/suspend.js)

Experimental suspend base support library, to support continuations like kotlin suspend

This library is for theoretical research

**_It is not recommended that you actually use this library_**

## Examples

### MaybeMonad

```ts
import { Continue, Suspend, ReadySuspend } from '@coplt/suspend'

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
```

-   Usage 1

    ```ts
    let i = 0
    const r = Maybe.maybe<string>(co => {
        i++
        console.log(1)
        return Maybe.bind(
            { val: 1 },
            new Continue(a => {
                i++
                console.log(2)
                return co.suspend(`${a}`)
            })
        )
    })
    expect(i).toBe(2)
    expect(r).toEqual({ val: '1' })
    // console.log: 1 2
    ```

    fake code using suspend sugar

    ```ts
    let i = 0
    const r = Maybe.maybe<string>(suspend () => {
        i++
        console.log(1)
        const a = Maybe.bind({ val: 1 })
        i++
        console.log(2)
        return `${a}`
    })
    expect(i).toBe(2)
    expect(r).toEqual({ val: '1' })
    // console.log: 1 2
    ```

-   Usage 2

    ```ts
    let i = 0
    const r = Maybe.maybe<string>(co => {
        i++
        console.log(1)
        return Maybe.bind(
            null, // return here
            new Continue(a => {
                i++
                console.log(2)
                return co.suspend(`${a}`)
            })
        )
    })
    expect(i).toBe(1)
    expect(r).toEqual(null)
    // console.log: 1
    ```

    fake code using suspend sugar

    ```ts
    let i = 0
    const r = Maybe.maybe<string>(suspend () => {
        i++
        console.log(1)
        const a = Maybe.bind(null) // return here
        i++
        console.log(2)
        return `${a}`
    })
    expect(i).toBe(1)
    expect(r).toEqual(null)
    // console.log: 1
    ```

### Async

```ts
import { Async, Continue } from '@coplt/suspend'

function delay(ms: number) {
    return new Promise<void>(res => {
        setTimeout(res, ms)
    })
}
```

-   Usage 1

    ```ts
    const r = await Async.run<number>(co => {
        return Async.await(
            delay(0), // any Promise value
            new Continue(() => {
                return co.suspend(1)
            })
        )
    })
    expect(r).toBe(1)
    ```

    fake code using suspend sugar

    ```ts
     const r = await Async.run<number>(suspend () => {
        Async.await(delay(0)) // any Promise value
        return 1
    })
    expect(r).toBe(1)
    ```

-   Usage 2

    ```ts
    const r = await Async.run<number>(co => {
        return Async.delay(
            0,
            new Continue(() => {
                return co.suspend(1)
            })
        )
    })
    expect(r).toBe(1)
    ```

    fake code using suspend sugar

    ```ts
    const r = await Async.run<number>(suspend () => {
        Async.delay(0)
        return 1
    })
    expect(r).toBe(1)
    ```

-   Usage Throw 1

    ```ts
    try {
        await Async.run<number>(() => {
            return Async.delay(
                0,
                new Continue(() => {
                    throw 'err'
                })
            )
        })
        throw 'never'
    } catch (e) {
        expect(e).toBe('err')
    }
    ```

    fake code using suspend sugar

    ```ts
    try {
        await Async.run<number>(suspend () => {
            Async.delay(0)
            throw 'err'
        })
        throw 'never'
    } catch (e) {
        expect(e).toBe('err')
    }
    ```

-   Usage Throw 2

    ```ts
    await Async.run<number>(co => {
        if (Math.random() > 0.5) throw 'err'
        return Async.delay(
            0,
            new Continue(() => {
                return co.suspend(1)
            })
        )
    })
    ```

    fake code using suspend sugar

    ```ts
    await Async.run<number>(suspend () => {
        if (Math.random() > 0.5) throw 'err'
        Async.delay(0)
        return 1
    })
    ```
