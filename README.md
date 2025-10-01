# Sistema RAV - Relatórios Automatizados com IA

Sistema web para automação de processamento de Relatórios de Avaliação (RAV) de alunos utilizando Inteligência Artificial.

## 🚀 Funcionalidades

- ✅ Autenticação de professores
- ✅ Upload em lote de documentos .docx
- ✅ Processamento automático com IA (Google Gemini)
- ✅ Duas modalidades:
  - **Prompt Fixo**: 12 perguntas padrão
  - **Prompt Dinâmico**: Perguntas geradas pela IA
- ✅ Armazenamento seguro em PostgreSQL
- ✅ Sistema de logs em tempo real
- ✅ Download de relatórios processados
- ✅ Interface moderna e responsiva

## 📋 Perguntas Fixas (Prompt 2)

1. O aluno demonstra interesse nas atividades propostas?
2. O aluno participa das aulas de forma ativa?
3. O aluno realiza as tarefas dentro dos prazos estabelecidos?
4. O aluno apresenta dificuldades de aprendizagem em algum conteúdo?
5. O aluno consegue trabalhar em grupo de maneira colaborativa?
6. O aluno respeita as regras de convivência?
7. O aluno busca esclarecer suas dúvidas quando necessário?
8. O aluno apresenta progresso em relação ao bimestre anterior?
9. O aluno mantém a organização do material escolar?
10. O aluno demonstra autonomia nos estudos?
11. O aluno consegue expor suas ideias com clareza?
12. O aluno demonstra responsabilidade com suas atividades escolares?

## 🛠️ Tecnologias

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Lovable Cloud (Supabase)
- **Banco de Dados**: PostgreSQL
- **IA**: Google Gemini 2.5 Flash (Lovable AI Gateway)
- **Autenticação**: Supabase Auth
- **Armazenamento**: Supabase Storage

## 🎯 Como Usar

### 1. Cadastro
- Acesse a página inicial
- Clique em "Entrar" → "Não tem conta? Cadastre-se"
- Preencha nome, matrícula, email e senha

### 2. Configuração
- Acesse a aba "Configurações"
- Defina sua matrícula e bimestre
- Escolha o tipo de processamento (Fixo ou Dinâmico)
- Faça upload do template .docx (opcional)

### 3. Upload de Documentos
- Acesse a aba "Upload"
- Selecione múltiplos arquivos .docx dos alunos
- Clique em "Enviar"

### 4. Processamento
- Acesse a aba "Alunos"
- Clique em "Processar" para cada aluno
- Acompanhe o status em tempo real

### 5. Logs e Download
- Aba "Logs": veja o histórico detalhado
- Aba "Alunos": baixe os relatórios processados (botão "Baixar")

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais
- **profiles**: Dados dos professores
- **templates**: Templates de relatórios
- **alunos**: Lista de alunos e status de processamento
- **configuracoes**: Configurações do professor
- **logs**: Histórico de operações
- **avaliacoes**: Respostas geradas pela IA

### Buckets de Storage
- **templates**: Templates .docx
- **documentos-alunos**: Documentos originais
- **relatorios-processados**: Relatórios finais

## 🔒 Segurança

- Row Level Security (RLS) ativado em todas as tabelas
- Autenticação obrigatória
- Dados isolados por professor
- Armazenamento seguro na nuvem

## 💰 Custos

- **Hospedagem**: GRATUITA no Lovable Cloud
- **IA Google Gemini**: GRATUITA até 06/10/2025
- Após 06/10: consulte preços em Settings → Workspace → Usage

## 📱 Interface

- Design moderno e responsivo
- Atualizações em tempo real
- Feedback visual de todas as operações
- Logs detalhados para debugging

## 🔧 Desenvolvimento Local

Se você deseja rodar localmente:

```sh
# Clonar o repositório
git clone <YOUR_GIT_URL>

# Navegar para o diretório
cd <YOUR_PROJECT_NAME>

# Instalar dependências
npm i

# Iniciar servidor de desenvolvimento
npm run dev
```

## 📦 Deploy

Para fazer deploy da aplicação:
1. Acesse [Lovable](https://lovable.dev/projects/f4e44df6-cdd4-4a9d-98de-9874c7fdfb8b)
2. Clique em Share → Publish

## 🌐 Domínio Customizado

Você pode conectar um domínio personalizado em:
Project > Settings > Domains > Connect Domain

[Documentação de domínios](https://docs.lovable.dev/features/custom-domain)

## 📞 Suporte

Para dúvidas sobre o sistema, acesse os logs na aplicação ou consulte a [documentação do Lovable](https://docs.lovable.dev).