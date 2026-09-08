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

`Either`がLeftかつコールバック関数が`true`の場合に成功します。

```ts
// success
expect(E.left("oops")).toBeLeftWith((s) => s.length > 0);

// failed
expect(E.left("")).toBeLeftWith((s) => s.length > 0);
```

### toBeRightWith

`Either`がRightかつコールバック関数が`true`の場合に成功します。

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
