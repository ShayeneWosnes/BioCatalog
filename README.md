BioCatalog — Registro e Compartilhamento da Biodiversidade
Aplicativo móvel colaborativo para registrar, organizar e compartilhar observações da fauna e da flora.

O BioCatalog foi desenvolvido com o objetivo de aproximar a comunidade acadêmica e a população do conhecimento sobre a biodiversidade, permitindo que usuários registrem suas observações e compartilhem voluntariamente informações sobre espécies encontradas em diferentes localidades.

O projeto foi desenvolvido para a disciplina de Programação de Software e Aplicativo II, do Instituto Federal do Paraná (IFPR).
Informações acadêmicas
Instituição: Instituto Federal do Paraná — IFPR
Curso: Sistemas de Informação
Disciplina: Programação de Software e Aplicativo II
Professor: Eduardo Alba

Integrantes:
- Shayene Vieira Wosnes
- Matheus Gustmam
- Luiz Ricardo Zimmermann Graffunder


Versão Android: 1.0.2
Plataforma testada: Android
Status: Protótipo acadêmico funcional
Problema e justificativa
Informações sobre a biodiversidade de uma região nem sempre estão facilmente acessíveis à comunidade.

Pesquisadores, estudantes e pessoas interessadas em fauna e flora frequentemente realizam observações e levantamentos de espécies, mas esses registros podem permanecer dispersos em fotografias, anotações pessoais ou documentos de pesquisa.

Quando essas informações não são compartilhadas de forma acessível, outras pessoas interessadas na mesma região podem precisar realizar novos levantamentos para obter informações semelhantes.

O BioCatalog foi desenvolvido como uma ferramenta complementar para facilitar o registro, a organização e o compartilhamento voluntário dessas observações.

A proposta é incentivar a colaboração entre pesquisadores, estudantes e a comunidade, contribuindo para a divulgação do conhecimento sobre a biodiversidade regional.
Relação com o ODS 15
O BioCatalog está relacionado ao Objetivo de Desenvolvimento Sustentável 15 — Vida Terrestre, da Organização das Nações Unidas (ONU).

O ODS 15 aborda a proteção dos ecossistemas terrestres, a conservação da biodiversidade e o uso sustentável dos recursos naturais.

O aplicativo busca contribuir para esse contexto ao:
- Incentivar o registro de observações de fauna e flora.
- Facilitar o compartilhamento de informações sobre a biodiversidade.
- Aproximar estudantes, pesquisadores e a comunidade.
- Estimular o interesse pela conservação ambiental.
- Permitir a exploração de registros associados a diferentes localidades.
Importante: os registros compartilhados representam observações feitas pelos usuários e não substituem inventários científicos, levantamentos sistemáticos ou validações realizadas por especialistas.
Funcionalidades do aplicativo
1. Cadastro e autenticação
O BioCatalog utiliza Firebase Authentication para gerenciamento de usuários.

Funcionalidades implementadas:
- Cadastro com nome, e-mail e senha.
- Envio de e-mail de verificação.
- Bloqueio de acesso às áreas internas para contas não verificadas.
- Login com e-mail e senha.
- Recuperação de senha por e-mail.
- Persistência da sessão de autenticação.
- Logout.
- Criação do perfil do usuário no Firestore após a verificação do e-mail.
2. Registro de observações
O usuário autenticado pode cadastrar observações de animais e plantas.

Cada observação pode conter:
- Categoria: fauna ou flora.
- Fotografia.
- Data da observação.
- Descrição e anotações.
- Coordenadas geográficas, quando fornecidas.
- Informações de localidade.
- Identificação científica provisória, quando disponível.
As observações são inicialmente privadas.
3. Gerenciamento de observações — CRUD
O aplicativo permite:
- Create: criar uma observação.
- Read: consultar observações cadastradas.
- Update: editar informações permitidas de uma observação.
- Delete: excluir uma observação.
Os registros são armazenados no Cloud Firestore e associados ao usuário responsável pelo cadastro.
4. Fotografias
O aplicativo permite utilizar a câmera ou selecionar uma imagem da galeria do dispositivo.

As fotografias são armazenadas no Supabase Storage.

O sistema utiliza:
- Firebase Authentication para autenticação dos usuários.
- Tokens Firebase na integração com o Supabase.
- Políticas de acesso para o armazenamento.
- Referências aos arquivos associadas às observações no Firestore.
- Armazenamento separado para fotografias privadas e cópias destinadas à comunidade.
5. Localização geográfica
O BioCatalog utiliza o recurso de localização do dispositivo para obter coordenadas geográficas durante o cadastro de observações.

O acesso depende da permissão concedida pelo usuário.

Na publicação comunitária, o aplicativo oferece opções de compartilhamento da localização, incluindo:
- Localização exata.
- Localização aproximada.
- Localidade selecionada.
- Localização oculta.
Essas opções buscam permitir que o usuário controle quais informações geográficas deseja compartilhar.
6. Integração com a API GBIF
O BioCatalog utiliza a API do Global Biodiversity Information Facility (GBIF) para consultar nomes científicos.

A integração permite:
- Pesquisar sugestões de nomes científicos.
- Consultar correspondências taxonômicas.
- Recuperar informações retornadas pela base GBIF.
- Associar informações taxonômicas à observação.
A identificação é opcional.

Atenção: a consulta ao GBIF não identifica automaticamente os organismos presentes nas fotografias. A correspondência de um nome científico na base não confirma a identificação biológica do exemplar fotografado.
7. Compartilhamento comunitário
O usuário pode decidir publicar voluntariamente uma observação.

Quando publicada, uma versão pública do registro fica disponível na área de exploração comunitária.

O aplicativo permite:
- Publicar observações.
- Compartilhar fotografias autorizadas.
- Selecionar o nível de exposição da localização.
- Consultar publicações de outros usuários.
- Retirar observações da comunidade.
Ao retirar uma publicação, o registro pessoal é preservado, enquanto sua versão comunitária é removida.
8. Exploração da biodiversidade
A área Explorar permite consultar observações compartilhadas.

O usuário pode navegar pelas publicações, visualizar fotografias, consultar informações disponíveis e utilizar recursos de pesquisa e filtragem.
9. Mapa comunitário
O BioCatalog possui um mapa interativo utilizando:
- Leaflet.
- OpenStreetMap.
- React Native WebView.
O mapa apresenta marcadores correspondentes a observações comunitárias com localização compartilhada.

A implementação utiliza uma visualização web integrada ao aplicativo móvel, evitando a dependência de uma chave de API do Google Maps.
Tecnologias utilizadas
Tecnologia	Aplicação no BioCatalog
React Native	Desenvolvimento da interface móvel
Expo	Ambiente de desenvolvimento e ferramentas de build
TypeScript	Linguagem utilizada no projeto
Expo Router	Organização das telas e navegação
Firebase Authentication	Cadastro, login e verificação de usuários
Cloud Firestore	Armazenamento de observações e perfis
Supabase Storage	Armazenamento de fotografias
GBIF API	Consulta de nomes científicos
Expo Location	Obtenção da localização do dispositivo
Expo Image Picker	Seleção e captura de fotografias
React Native WebView	Exibição do mapa
Leaflet	Interatividade e marcadores do mapa
OpenStreetMap	Dados cartográficos
EAS Build	Geração do aplicativo Android
Git e GitHub	Versionamento e hospedagem do código


Documentação acadêmica — Projeto do Sistema
Esta seção reúne os artefatos de análise de requisitos e modelagem solicitados em Programação de Software e Aplicativo II. Os códigos RF01–RF05, RNF01–RNF03 e RN01–RN03 foram mantidos de acordo com o enunciado da disciplina. Os demais itens foram ajustados ao escopo da versão 1.0.2, mantendo as limitações técnicas explicitadas nas seções correspondentes.
1. Visão geral do sistema
O BioCatalog permite que usuários cadastrados registrem observações de fauna e flora, consultem seu histórico e compartilhem voluntariamente determinados registros com a comunidade. Cada observação pode reunir descrição, data, fotografia, localização e identificação científica opcional, consultada na base GBIF. Registros publicados podem ser explorados em uma lista e em um mapa interativo. O projeto busca facilitar o acesso colaborativo a informações sobre a biodiversidade regional.
2. Análise de requisitos
2.1. Requisitos funcionais (RF)
Código	Descrição	Situação na v1.0.2
RF01	O sistema deve permitir que novos usuários se cadastrem utilizando e-mail e senha. OBRIGATÓRIO — NÃO REMOVER	Implementado
RF02	O sistema deve permitir a autenticação (login) de usuários e manter a sessão persistida no dispositivo. OBRIGATÓRIO — NÃO REMOVER	Implementado
RF03	O sistema deve disponibilizar a funcionalidade de recuperação de senha via envio de e-mail. OBRIGATÓRIO — NÃO REMOVER	Implementado
RF04	O sistema deve controlar as informações dos usuários no banco de dados em nuvem. OBRIGATÓRIO — NÃO REMOVER	Implementado
RF05	O aplicativo deve permitir o encerramento seguro da sessão do usuário (Logout). OBRIGATÓRIO — NÃO REMOVER	Implementado
RF06	Permitir o cadastro de observações de fauna e flora com categoria, data e informações descritivas.	Implementado
RF07	Permitir capturar fotografias pela câmera ou selecionar arquivos da galeria.	Implementado; upload sujeito à autorização de Storage
RF08	Permitir registrar coordenadas da observação por GPS.	Implementado
RF09	Permitir consultar o histórico pessoal de observações.	Implementado
RF10	Permitir editar informações de observações próprias.	Implementado
RF11	Permitir excluir observações próprias mediante confirmação.	Implementado
RF12	Permitir optar pela publicação comunitária ou manter a observação privada.	Implementado
RF13	Exibir observações comunitárias com localização compartilhada em mapa interativo.	Implementado
RF14	Permitir consultar fotografias, descrições e outras informações de publicações comunitárias.	Implementado
RF15	Disponibilizar pesquisa e filtros para explorar observações.	Implementado
RF16	Disponibilizar informações da conta e acesso ao histórico pessoal de observações.	Parcial: conta e histórico; painel completo de perfil é futuro
RF17	Permitir retirar a publicação comunitária, preservando o registro pessoal.	Implementado
RF18	Permitir pesquisar sugestões e correspondências de nomes científicos no GBIF.	Implementado
RF19	Exibir informações taxonômicas disponíveis na resposta do GBIF sem validar automaticamente a identificação da fotografia.	Implementado no fluxo de consulta, conforme dados disponíveis


Nota: a consulta taxonômica ao GBIF não confirma a identificação biológica da espécie fotografada. O catálogo educativo independente e a moderação de denúncias não fazem parte dos requisitos desta versão.
2.2. Requisitos não funcionais (RNF)
Código	Descrição	Observação
RNF01	A interface deve apresentar estados visuais explícitos para carregamento, mensagens de erros de conexão e sinalização de telas/listas vazias. OBRIGATÓRIO — NÃO REMOVER	Tratamentos implementados em fluxos do aplicativo; cobertura total não auditada
RNF02	As interfaces devem ser capazes de serem acessadas com, no mínimo, 3 cliques a partir da tela inicial. OBRIGATÓRIO — NÃO REMOVER	Texto literal do enunciado; interpretação deve ser confirmada com o professor
RNF03	A aplicação deve ser restrita a usuários que tenham cadastro ativo. OBRIGATÓRIO — NÃO REMOVER	Rotas internas protegidas por autenticação e verificação de e-mail
RNF04	Utilizar React Native e Expo com organização modular de código.	Estrutura por telas, serviços, componentes e modelos
RNF05	Utilizar Firebase para autenticação e persistência de dados e Supabase Storage para fotografias.	Arquitetura adotada na v1.0.2
RNF06	Restringir operações privadas por autenticação e regras de autorização.	Implementação existente; auditoria abrangente pendente
RNF07	Apresentar mensagens claras para resultados de operações, ausência de permissão e entradas inválidas.	Aplicado nos principais fluxos
RNF08	Oferecer interface utilizável em dispositivos Android compatíveis.	Validado em dispositivo físico; sem cobertura universal
RNF09	Manter fotografias associadas aos respectivos usuários e observações.	Referências no Firestore e arquivos no Supabase
RNF10	Não divulgar automaticamente coordenadas privadas na área comunitária.	Opções específicas de localização na publicação; auditoria de privacidade pendente
RNF11	Tratar indisponibilidade ou ausência de resultados do GBIF sem obrigar a identificação científica.	Identificação opcional


Sobre RNF02: a expressão “no mínimo, 3 cliques” foi mantida como escrita pelo professor, mesmo sendo pouco usual para uma meta de acessibilidade. Não foi alterada unilateralmente.
2.3. Regras de negócio (RN)
Código	Descrição	Situação na v1.0.2
RN01	Para realizar o cadastro, é obrigatório informar o nome, e-mail e uma senha. OBRIGATÓRIO — NÃO REMOVER	Aplicada
RN02	Para ativar o cadastro, é obrigatório que o usuário realize a validação do seu e-mail por um link. OBRIGATÓRIO — NÃO REMOVER	Aplicada
RN03	O sistema deve, obrigatoriamente, solicitar a permissão antes de acessar a câmera, localização e determinados sensores.	Aplicada para recursos acessados; não há sensores físicos adicionais no escopo
RN04	Vincular cada observação ao usuário que a cadastrou.	Aplicada
RN05	Permitir edição e exclusão somente de observações próprias.	Aplicada no fluxo do aplicativo
RN06	Exigir categoria fauna ou flora para cada observação.	Aplicada
RN07	Aplicar as validações de campos exigidos no formulário de observação; fotografia e localização seguem disponibilidade e opções da tela.	Aplicada conforme formulário
RN08	Permitir observação sem identificação científica.	Aplicada
RN09	Não apresentar uma identificação declarada pelo usuário como confirmação científica.	Aplicada
RN10	Manter observações privadas por padrão e publicar apenas por decisão do autor.	Aplicada
RN11	Respeitar o modo de localização pública escolhido: exata, aproximada, local selecionado ou oculta.	Implementado; precisão das regras não auditada exaustivamente
RN12	Permitir retirar a publicação sem excluir a observação pessoal.	Aplicada
RN13	Restringir funções internas a usuários autenticados com e-mail verificado.	Aplicada
RN14	Exibir informações e fotografias de outros usuários somente em registros publicados.	Aplicada no fluxo comunitário
RN15	Não obrigar o preenchimento do nome científico para registrar a observação.	Aplicada
RN16	Não tratar correspondência do GBIF como identificação biológica confirmada da fotografia.	Aplicada
RN17	Armazenar referência taxonômica retornada pelo GBIF quando associada à observação.	Aplicada conforme resposta disponível


Regra operacional conhecida: o upload no Supabase Storage depende de autorização específica. Novas contas, mesmo com e-mail verificado, podem precisar que um administrador atribua manualmente a custom claim role: authenticated, usando ferramenta administrativa separada do aplicativo. A automação desse processo ficou para uma versão posterior.
3. Diagramas UML
Os dois diagramas abaixo representam a modelagem adotada para explicar o sistema na disciplina.
3.1. Diagrama de Casos de Uso
Representa as interações dos visitantes e usuários autenticados com as funcionalidades do BioCatalog, além da consulta ao serviço externo GBIF.

3.2. Diagrama de Classes
Apresenta as entidades Usuario, Observacao, IdentificacaoTaxonomica e PublicacaoComunitaria, com seus atributos, operações e associações.

Observação: os diagramas são modelos explicativos do sistema e não uma transcrição literal de todas as funções ou classes implementadas no código.
4. Código-fonte
O código está disponível neste repositório, na branch upgrade/expo-sdk-58. A arquitetura, a organização dos arquivos, as instruções de execução, os testes e o APK estão documentados nas seções seguintes.
Arquitetura do sistema
O projeto foi organizado separando telas, componentes, modelos, serviços e configurações.
Fluxo geral
               USUÁRIO
                  |
                  v
         APLICATIVO BIOCATALOG
          React Native + Expo
                  |
        +---------+----------+
        |         |          |
        v         v          v
     FIREBASE   SUPABASE   SERVIÇOS
        |         |        EXTERNOS
        |         |          |
   Auth e      Fotografias  GBIF
   Firestore                OSM/Leaflet
        |
        v
  Usuários e observações
Responsabilidades
Firebase Authentication: identifica e autentica o usuário.

Cloud Firestore: armazena os perfis, as observações pessoais e os registros compartilhados com a comunidade.

Supabase Storage: armazena as fotografias utilizadas nas observações.

GBIF: fornece sugestões e informações relacionadas a nomes científicos.

Leaflet e OpenStreetMap: permitem visualizar observações geográficas em um mapa interativo.
Organização dos dados
O Firestore utiliza, entre outras, as seguintes coleções:
users
Armazena informações de perfil dos usuários autenticados.
observations
Armazena as observações pessoais, vinculadas ao identificador do usuário proprietário.
publicObservations
Armazena as versões das observações disponibilizadas voluntariamente à comunidade.

A separação entre observações pessoais e comunitárias permite que o aplicativo trabalhe com informações distintas conforme a finalidade de cada registro.

As fotografias são armazenadas no Supabase, enquanto os documentos Firestore mantêm as referências necessárias para sua utilização.
Estrutura do projeto
biocatalog/
├── assets/
├── scripts/
├── docs/
│   └── diagramas/
│       ├── casos-de-uso.png
│       ├── classes.png
│       └── README.md
├── src/
│   ├── app/
│   ├── components/
│   ├── config/
│   ├── constants/
│   ├── hooks/
│   ├── models/
│   └── services/
├── app.json
├── eas.json
├── package.json
├── package-lock.json
└── README.md
Telas principais — src/app
Arquivo	Responsabilidade
_layout.tsx	Estrutura de navegação e proteção de rotas
index.tsx	Tela de entrada
cadastro.tsx	Cadastro de usuários
login.tsx	Autenticação
recuperar-senha.tsx	Recuperação de senha
inicio.tsx	Tela inicial do usuário autenticado
nova-observacao.tsx	Formulário de novas observações
minhas-observacoes.tsx	Listagem, edição, exclusão e publicação
explore.tsx	Exploração comunitária e visualização do mapa


Serviços principais — src/services
Arquivo	Responsabilidade
authService.ts	Cadastro de contas e verificação de e-mail
userService.ts	Criação do perfil do usuário
observationService.ts	CRUD de observações pessoais
publicationService.ts	Publicação e retirada de observações
communityService.ts	Consulta das observações comunitárias
supabasePhotoService.ts	Upload, exclusão e acesso às fotos privadas
communityPhotoService.ts	Preparação e envio de fotografias públicas
gbifService.ts	Integração com a API GBIF
locationService.ts	Captura de coordenadas GPS
placeSearchService.ts	Pesquisa de localidades
communityMapService.ts	Consulta de registros para visualização geográfica
jpegPrivacyService.ts	Verificações de metadados em imagens JPEG


Configurações e modelos
Arquivo	Responsabilidade
src/config/firebase.ts	Inicialização do Firebase
src/config/supabase.ts	Conexão com o Supabase utilizando o token Firebase
src/models/observation.ts	Definições TypeScript das observações
src/components/MapaBiodiversidade.tsx	Componente do mapa Leaflet integrado via WebView
app.json	Configurações do aplicativo e da versão Android
eas.json	Perfis de build e distribuição


O repositório também contém componentes auxiliares, arquivos de estilo e implementações de apoio.
Como executar o projeto
Pré-requisitos
- Node.js e npm.
- Git.
- Ambiente compatível com Expo.
- Dispositivo Android ou emulador para testes.
- Projeto Firebase configurado.
- Projeto Supabase configurado.
- Variáveis de ambiente necessárias.
1. Clonar o repositório
git clone https://github.com/ShayeneWosnes/BioCatalog.git
cd BioCatalog
2. Selecionar a branch do projeto
git checkout upgrade/expo-sdk-58
3. Instalar dependências
npm install
4. Configurar as variáveis de ambiente
Crie um arquivo .env na raiz do projeto.

As configurações utilizadas pelo aplicativo incluem:
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_KEY=
Preencha os valores com as configurações do ambiente autorizado.

Segurança: não publique credenciais administrativas do Firebase, chaves service_role do Supabase nem arquivos de contas de serviço. Variáveis EXPO_PUBLIC_* são incorporadas ao aplicativo e não devem conter segredos administrativos.
5. Iniciar o Expo
npx expo start
Para limpar o cache:
npx expo start --clear
A execução completa das funcionalidades depende da disponibilidade dos serviços externos e das respectivas configurações de autenticação, banco de dados e armazenamento.
6. Verificar o TypeScript
npx tsc --noEmit
Geração do APK Android
O projeto utiliza EAS Build para gerar versões Android instaláveis.

O perfil preview está configurado para produzir um arquivo APK destinado a testes.

Com o EAS configurado e as variáveis de ambiente disponíveis:
npx eas-cli@latest build --platform android --profile preview
A versão Android testada durante o desenvolvimento foi a 1.0.2, identificada em app.json.

Pacote Android: com.biocatalog.app
Download do APK — BioCatalog v1.0.2
O BioCatalog está disponível para instalação em dispositivos Android.

Versão: 1.0.2
Formato: APK
Tamanho aproximado: 113 MB
Status: Pré-lançamento acadêmico (Pre-release)
Baixar BioCatalog v1.0.2 para Android
Também é possível consultar as informações completas da versão na página oficial:

Ver GitHub Release v1.0.2
Como instalar
1. Baixe o arquivo BioCatalog-v1.0.2.apk.
2. Abra o arquivo em um dispositivo Android.
3. Autorize a instalação pelo navegador ou gerenciador de arquivos, caso o Android solicite.
4. Abra o aplicativo BioCatalog.
Observação: algumas funcionalidades exigem acesso à internet e permissões do dispositivo. O envio de fotografias por novas contas pode exigir autorização administrativa.
Testes realizados
O desenvolvimento envolveu testes no Expo Go e em uma versão APK instalada diretamente no Android.

Foram exercitados e confirmados durante os testes funcionais:
- Cadastro, autenticação e encerramento de sessão.
- Criação de observações.
- Consulta de observações pessoais.
- Edição de observações.
- Exclusão de observações.
- Upload de fotografias em conta autorizada.
- Publicação comunitária.
- Visualização de registros no mapa.
- Exibição de marcadores geográficos.
- Retirada de publicações comunitárias.
- Funcionamento do mapa no APK Android 1.0.2.
A análise do código também foi acompanhada pela verificação de erros de TypeScript por meio do comando:
npx tsc --noEmit
Os testes confirmam os fluxos exercitados, mas não representam uma auditoria completa de segurança, desempenho ou compatibilidade com todos os dispositivos.
Desafios encontrados
1. Integração Firebase e Supabase
O aplicativo utiliza Firebase Authentication para identificar usuários e Supabase Storage para armazenar fotografias.

Durante os testes, ocorreram bloqueios de upload relacionados às políticas de segurança RLS do Supabase.

A solução utilizada para as contas de teste envolveu a integração dos tokens de autenticação e a atribuição da permissão necessária por meio do Firebase Admin SDK.
2. Mapa no aplicativo Android
Uma versão anterior apresentava encerramento inesperado ao abrir o mapa na instalação Android.

A investigação dos logs identificou uma dependência de configuração do Google Maps.

Para evitar a necessidade de utilizar essa integração, o mapa foi implementado com Leaflet, OpenStreetMap e React Native WebView.

A solução foi testada no APK 1.0.2.
3. Estabilização da build
Uma das versões iniciais do APK apresentou falha de inicialização.

Foram realizados ajustes nas configurações de compilação Android, incluindo as opções de otimização e redução de recursos.

Após os ajustes, a versão testada passou a iniciar e permitir a utilização das funcionalidades principais.
Limitações conhecidas
Autorização administrativa para fotografias
Atualmente, contas recém-criadas e verificadas no Firebase podem precisar de uma configuração administrativa adicional para utilizar o upload de fotografias no Supabase Storage.

Foi desenvolvido um script administrativo separado do aplicativo, utilizando Firebase Admin SDK, para atribuir a permissão role: authenticated a usuários elegíveis.

Esse procedimento não é executado automaticamente pelo aplicativo.

A automatização por Cloud Functions não foi implementada nesta versão, pois a equipe optou por não habilitar o plano Blaze do Firebase, que possui faturamento associado.
Identificação de espécies
O aplicativo consulta nomes científicos na base GBIF, mas não realiza identificação automática de espécies por análise de fotografias.
Validação técnica
Os controles de privacidade, as regras de acesso e os modos de compartilhamento geográfico possuem implementações específicas. Uma auditoria abrangente de segurança e de todos os cenários de acesso permanece como possibilidade de aprimoramento.
Melhorias futuras
Entre as possibilidades para versões posteriores estão:
- Automatizar a autorização de novos usuários para envio de fotografias.
- Ampliar os testes de segurança e privacidade.
- Implementar identificação assistida de espécies.
- Desenvolver fichas educativas de fauna e flora.
- Ampliar os recursos de pesquisa e exploração geográfica.
- Melhorar os mecanismos de validação e revisão de observações.
- Expandir a compatibilidade e os testes em diferentes dispositivos.
Esses recursos representam propostas futuras e não devem ser confundidos com funcionalidades já implementadas.
Vídeo demonstrativo
Pendente: inserir o link do vídeo de demonstração solicitado para a disciplina.

O vídeo apresentará o funcionamento real do aplicativo Android, incluindo autenticação, criação de observações, fotografias, localização, exploração comunitária e mapa.
Equipe de desenvolvimento
Shayene Vieira Wosnes
Matheus Gustmam
Luiz Ricardo Zimmermann Graffunder

Projeto acadêmico desenvolvido no Instituto Federal do Paraná — IFPR.

Disciplina: Programação de Software e Aplicativo II
Professor: Eduardo Alba
Ano: 2026
Referências e tecnologias
- React Native
- Expo
- Firebase
- Supabase
- GBIF
- Leaflet
- OpenStreetMap
- ODS 15 — ONU
