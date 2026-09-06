# kiso test

```bash
kiso test a # a問題をdefault languageでテスト

kiso test a --l ts # typescriptのa問題をテスト

kiso test a --provider atcoder --contest abc100 # 遠くをテスト

kiso test a --p atcoder --c abc100

kiso test a --c abc100 # この名前のcontestが1つだけの場合実行されます

kiso test a --p atcoder # errorになります。詳しくは ## find target > ### providerが指定されている場合 > #### contestが指定されていない場合
```

## find target

### providerが指定されている場合

#### contestが指定されている場合

providerにcontestId -> pathを委譲します

#### contestが指定されていない場合

errorにします。contestが指定されていない場合でも、カレントディレクトリから推測しません。なぜなら、その場合、何らかのproviderのもとにいるということであり、providerを指定する必要がそもそもないため、ユーザーがカレントディレクトリからの推測を求めていない可能性が高いからです

### providerが指定されていない場合

#### カレントディレクトリからproviderが推測できる場合

##### contestが指定されている場合

providerにcontestId -> pathを委譲します

##### contestが指定されていない場合

###### カレントディレクトリからcontestを推測できる場合

その推測で決定します

###### カレントディレクトリからcontestを推測できない場合

error

#### カレントディレクトリからproviderが推測できない場合

##### contestが指定されている場合

全providerに存在を確認します。なぜ実行を挑戦するかというと、contestが指定されている場合、ユーザーはそのcontestが実行されることを明らかに想定しているからです。1つだけ該当した場合に実行されることは混乱を招かず、2つ以上存在するために動かない理由は理解しやすいためです。

###### 2つ以上contestが該当

error

###### 1つだけcontestが該当した場合

それで決定

###### なかった場合

error

##### contestが指定されていない場合

errorにします。一つしかコンテストがない場合は一意に定まりますが、そのような利便性を作る代わりに1コンテスト目とそれ以外での動作の差による難解さを軽減します。

## test

targetのcontestのパスを見つけた後、lang pluginに委譲します。(path:string,probrem:Probrem) => resultのようなイメージです。resultには、少なくとも、入力した文字列、想定したoutput、実際のoutputがあるべきです。また、コンパイルエラーやランタイムエラーは`TestError`型として表現される予定です。
