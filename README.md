# MARTHE

Site educacional de geometria espacial e sobrevivência em Marte, feito com Next.js.

## Executar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` para acessar a página inicial do site. O jogo fica em `/expedicao`; a área para educadores pode ser acessada pela seção correspondente da home e leva à entrada docente.

Para validar a versão de produção, execute `npm run lint` e `npm run build`; depois use `npm start`.

## Como jogar

Entre como estudante, leia o informe da crise e resolva os desafios de volume em sequência para construir o domo de abrigo, a estufa hidropônica, o extrator de gelo e o laboratório. As fases seguintes só são liberadas depois de concluir a anterior. Ao final, quatro cálculos encadeados determinam se a reserva de oxigênio sustenta a tripulação.

Crie uma conta de estudante ou professor com e-mail e senha; as senhas são armazenadas como hashes e a sessão usa cookie `HttpOnly`. Estudantes podem entrar novamente para continuar o progresso. Professores consultam acessos, respostas, acertos e erros de todas as contas nesta instalação.

As contas, atividades e progresso são gravados em `data/marthe-store.json`, que é ignorado pelo Git. Esse armazenamento atende à execução local em um único servidor; para publicar em múltiplas instâncias ou em hospedagem serverless, configure um banco de dados compartilhado e um mecanismo de sessão apropriado ao provedor.
