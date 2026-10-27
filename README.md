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

As contas, sessões, atividades e progresso são armazenados no Supabase. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ou `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) e `SUPABASE_SERVICE_ROLE_KEY` no ambiente do servidor. A chave `SUPABASE_SERVICE_ROLE_KEY` concede acesso privilegiado e nunca deve usar o prefixo `NEXT_PUBLIC_` nem ser enviada ao navegador. As rotas verificam o cookie de sessão MARTHE e o perfil docente antes de consultar os dados administrativos.
