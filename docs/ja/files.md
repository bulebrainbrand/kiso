# ファイル構造

## contest

```
<contest-name>/
  kiso.contest.json
  <lang>/
    # lang pluginがa.tsなどを構築する
  testcases/
    <probrem-name>/
      <testcase-name>_in.txt
      <testcase-name>_out.txt
  # ここもlang pluginは操作できるので、package.jsonやCargo.tomlを置ける
```

exapmle: ts and rust

```
abc100/
  typescript/
    a.ts
    b.ts
    c.ts
    d.ts
    e.ts
  rust/
    a.rs
    b.rs
    c.rs
    d.rs
    e.rs
  testcases/
    a/
      1_in.txt
      1_out.txt
      2_in.txt
      2_out.txt
    b/
  /* ほかのテストケース */
  package.json
  Cargo.toml
  kiso.contest.json
```

## providerS

```
<provider-name>/
  <contest-name>/
  <contest-name>/
```

## single

```
<contest-name>_<probrem>/
  # 各々のlangがCargo.tomlやindex.tsなどを生成する
  kiso.sp.json
```

example: ts and cpp

```
abc100_a/
  kiso.sp.json
  package.json
  main.ts
  solve.cpp
```

## templates

```
templates/
  <lang>/
    # lang pluginがよしなによみこむ
```

## lib

```
lib/
  <lang>/
    # lang pluginがよしなにやる
```

## workspace

```
lib/
templates/
<contest-provider>/
# ここもlang pluginが触れる
```

## 全体

```
lib/
  <lang>/
    # lang pluginがよしなにやる
templates/
  <lang>/
    # lang pluginがよしなによみこむ
<contest-provider>/
  <contest-name>/
    kiso.contest.json
    <lang>/
      # lang pluginがa.tsなどを構築する
    testcases/
      <probrem-name>/
        <testcase-name>_in.txt
        <testcase-name>_out.txt
    # ここもlang pluginは操作できるので、package.jsonやCargo.tomlを置ける
  <contest-name>_<probrem>/
    # 各々のlangがCargo.tomlやindex.tsなどを生成する
    kiso.sp.json
```
