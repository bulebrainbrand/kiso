# kiso test

```bash
kiso test a # a問題をdefault languageでテスト

kiso test a --l ts # typescriptのa問題をテスト

kiso test a --provider atcoder --contest abc100 # 遠くをテスト

kiso test a --p atcoder --c abc100

kiso test a --c abc100 # この名前のcontestが1つだけの場合実行されます

kiso test a --p atcoder # errorになります。

kiso test # single probremの場合は動作します
```

## test

まず、kiso path resolverに委譲します

targetのcontestのパスを見つけた後、lang pluginに委譲します。(path:string,probrem:Probrem) => resultのようなイメージです。resultには、少なくとも、入力した文字列、想定したoutput、実際のoutputがあるべきです。また、コンパイルエラーやランタイムエラーは`TestError`型として表現される予定です。
