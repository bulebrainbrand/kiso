vitestでfp-tsをより簡単に検証するためのpluginです。importのみで適用されます。vitestユーザーは`@kiso/vitest-plugin-fp-ts/vitest`、vite-plusであれば`@kiso/vitest-plugin-fp-ts/vite-plus`からimportしてください。

## matchers

### toBeLeft

`Either`がLeftの際に成功します。オプショナルで、第一引数にvitestの`toEqual`相当の比較をする値を渡せます。

```ts
// success
expect(E.left("err")).toBeLeft();

expect(E.left({ code: "oops" })).toBeLeft({ code: "oops" });

// failed
expect(E.right(1)).toBeLeft();

expect(E.left("a")).toBeLeft("b");
```

### toBeRight

`Either`がRightの時に成功します。オプショナルで、第一引数にvitestの`toEqual`相当の比較をする値を渡せます。

### toBeLeftWith

`Either`がLeftかつコールバック内の`expect`が全て通る場合に成功します。コールバックの戻り値は無視されます（値を返すとwarnが出ます）。`.not`は使えません。代わりに`toBeRightWith`を使用してください。

```ts
// success
expect(E.left("oops")).toBeLeftWith((s) => {
  expect(s).toBe("oops");
});

// failed（内側のexpect失敗がそのまま伝播する）
expect(E.left("")).toBeLeftWith((s) => {
  expect(s).toBe("oops");
});
```

### toBeLeftWithAsync

`toBeLeftWith`の非同期版です。`async`コールバックを使う場合はこちらを`await`して使います。syncコールバックも受け付けます。

```ts
await expect(E.left("oops")).toBeLeftWithAsync(async (s) => {
  expect(s).toBe("oops");
});
```

### toBeRightWith

`Either`がRightかつコールバック内の`expect`が全て通る場合に成功します。コールバックの戻り値は無視されます（値を返すとwarnが出ます）。`.not`は使えません。代わりに`tobeLeftWith`を使用してください。

```ts
expect(E.right(2)).toBeRightWith((n) => {
  expect(n).toBe(2);
});
```

### toBeRightWithAsync

`toBeRightWith`の非同期版です。`async`コールバックを使う場合はこちらを`await`して使います。

```ts
await expect(E.right(2)).toBeRightWithAsync(async (n) => {
  expect(n).toBe(2);
});
```

### toStrictEqualLeft

`Either`がLeftで、中身と第一引数がvitestの`toStrictEqual`相当で合致した場合に成功します。

```ts
//success
expect(E.left({ code: "oops" })).toStrictEqualLeft({ code: "oops" });

// failed
expect(E.left({ code: "oops", detail: undefined })).toStrictEqualLeft({
  code: "oops",
});
```

### toStrictEqualRight

`Either`がRightで、中身と第一引数がvitestの`toStrictEqual`相当で合致した場合に成功します。

### toBeSome

`Option`がSomeの時成功します。`toEqual`相当の比較を行う第一引数が受け取れます

### toBeNone

`Option`がNoneの時成功します。

### toStrictEqualSome

`Option`がSomeで、中身と第一引数が`toStrictEqual`相当で合致した場合に成功します。

### toBeSomeWith

`Option`がSomeかつコールバック内の`expect`が全て通る場合に成功します。コールバックの戻り値は無視されます（値を返すとwarnが出ます）。`.not`は使えません。代わりに`toBeNone`を使用してください。

```ts
expect(O.some(2)).toBeSomeWith((n) => {
  expect(n).toBe(2);
});
```

### toBeSomeWithAsync

`toBeSomeWith`の非同期版です。`async`コールバックを使う場合はこちらを`await`して使います。

```ts
await expect(O.some(2)).toBeSomeWithAsync(async (n) => {
  expect(n).toBe(2);
});
```
