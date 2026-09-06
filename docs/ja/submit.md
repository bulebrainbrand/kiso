# kiso submit

```bash
kiso submit a # a問題をdefault languageで提出

kiso submit a --l ts --sl deno  # typescriptのa問題をbunに提出

kiso submit a --l ts --sl node  # typescriptのa問題をbunに提出

kiso submit a --provider atcoder --contest abc100 # 遠くを提出

kiso submit a --p atcoder --c abc100

kiso submit a --c abc100 # この名前のcontestが1つだけの場合提出されます

kiso submit a --p atcoder # errorになります。

kiso submit # single probremの場合は一意に定まります
```

まず、kiso path resolverに委譲します。
その後、lang pluginのbuildForSubmitにファイルを委譲します。
その後、providerは拡張子から言語を推測します。複数あるか存在しない場合は`sl`/`submitlang`フラグで部分一致を要求します。
`submitlang`フラグがある場合も、拡張子から言語を推測します。そして、推測した言語のidに部分一致で検討します。もし、複数該当する場合はエラーを投げます(対話で求めてもいいかも)。1つのみに該当する場合はそれで決定し、0の場合は推測した言語が外れたと想定し、全体に部分一致します。1つの場合はそれで決定し、複数または見つからない場合は失敗します。

`kiso.workspace.ts`で、submit後に確認の(Y/n)を行うかとか、lang pluginと--slを設定したりできます。
