# kiso new

```bash
kiso new abc100 --p atcoder # atcoderのabc100で作る

kiso new abc100 --lang typescript --p atcoder # typescriptのみ

kiso new abc100 # atcoderを推論できるかな？

kiso new https://atcoder.jp/contests/abc474 # abc474を作る
```

## options

### p / provider

providerを指定します。ない場合、// 未定

### l / lang

言語を指定します。
`--l typescript --l rust`みたいに。

## 挙動

1. providerにcontestを探させる
2. providerにディレクトリとかを作らせてpathを返す
3. lang pluginにpathを伝えていろいろ作らせる
