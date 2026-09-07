たとえば、contest providerがkiso.workspace.tsからnameを受け取る設定にすると、`atcoder("atcoder-train")`と`atcoder("atcoder")`で分けたりして、本番どうといたかだけを残せる。その時にcloneもあったらいいかも。本番が終わったらtrainにcloneして、trainで自力ACしたりupsolveする

contestごとにマークダウンを保存できるようなlanguage pluginで、symbolic linkでいい感じにできたら、upsolveと実際のコンテストを近くにおける

- じゃあlanguage pluginの中でもexecutable(スクリプトとして問題を解く)なものと、static(静的なものとしてtest,submit,runなどから除外される)なのに分かれる？

ライブラリや回答をコピーすることができるようにする(kiso submitとkiso lib?)

kiso.sp.jsonに優先する言語を保存しておくことで手間が省ける

vscodeに拡張を入れてGUIで操作できたらうれしい

- かなりあり

atcoder probremsはatcoderに依存したいから、fetch部だけを`utils-atcoder`みたいなのに切り出して両方依存するのがよさそう

- なんならスクレイピングとか取得系をcontest providerから切り離したらkisoエコシステム以外でも利用しやすい?
  - でもpackageの数がヘビーすぎるか

英語と日本語で両対応したい

- @kiso/i18nみたいなのを作って、各パッケージでsrc/i18n/messages.tsみたいなとこからregister、型安全に使用できるとか
- そも英語力的にAIに頼ることになりそう
