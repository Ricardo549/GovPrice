# GovMGPrice - Sistema de Pesquisa de Preços Governamentais

## 1. Propósito da Aplicação
O **GovMGPrice** é uma ferramenta de suporte à decisão para gestores públicos, pregoeiros e equipes de planejamento de contratações. Sua função primordial é automatizar a **Pesquisa de Preços** para processos licitatórios, consumindo dados reais e atualizados do Portal de Dados Abertos do Governo Federal (Compras.gov.br).

A aplicação permite:
- Identificação precisa de itens nos catálogos oficiais (**CATMAT** e **CATSER**).
- Extração de preços praticados em contratações públicas recentes.
- Saneamento de dados com remoção de *outliers* (preços excessivamente altos ou baixos).
- Cálculo de métricas estatísticas (Média, Mediana e Desvio Padrão).
- Geração de memórias de cálculo auditáveis em formato PDF.

---

## 2. Base Legal e Normativa
O sistema foi desenvolvido para estar em estrita conformidade com o arcabouço legal das compras públicas brasileiras:

### Lei nº 14.133/2021 (Nova Lei de Licitações)
- **Art. 23**: Define que o valor estimado da contratação deve ser compatível com os valores praticados pelo mercado.
- **Parâmetro de Pesquisa**: Utiliza o "Painel de Preços" e contratações similares de outros órgãos públicos como fonte prioritária.

### Instrução Normativa SEGES/ME nº 65/2021
- **Art. 5º**: Estabelece os parâmetros para a pesquisa de preços, incluindo a utilização de dados do sistema oficial de governo.
- **Cálculo do Preço Estimado**: Suporta a utilização da **Média**, **Mediana** ou o **Menor dos Valores** obtidos, conforme a justificativa do gestor.
- **Saneamento**: Permite o descarte de valores manifestamente inexequíveis ou excessivamente elevados.

### Lei Complementar nº 123/2006
- Identificação de fornecedores **ME/EPP** para aplicação de benefícios legais e tratamento diferenciado em licitações.

---

## 3. Endpoints Oficiais Utilizados (API Compras.gov.br v2.0)
A aplicação consome os seguintes módulos da API de Dados Abertos:

### Módulo de Catálogo (Identificação do Objeto)
- **Materiais (Módulo 4.4)**: `https://dadosabertos.compras.gov.br/modulo-catalogo/4_consultarItemMaterial`
- **Serviços (Módulo 5.6)**: `https://dadosabertos.compras.gov.br/modulo-catalogo/5_consultarItemServico`

### Módulo de Pesquisa de Preços (Extração de Valores)
- **Consulta de Preços (Módulo 6.1)**: `https://dadosabertos.compras.gov.br/modulo-pesquisa-preco/1_consultarMaterial`
- **Detalhes do Preço**: `https://dadosabertos.compras.gov.br/modulo-pesquisa-preco/2_consultarMaterialDetalhe`

### Módulo de Licitações e Contratos
- **Itens de Licitação**: `https://api.compras.dados.gov.br/licitacoes/v1/item_licitacao.json`
- **PNCP (Portal Nacional de Contratações Públicas)**: Integração via `numeroControlePNCP` para acesso aos documentos oficiais de homologação.

---

## 4. Transparência e Identificação
Conforme as boas práticas de consumo de APIs governamentais, todas as requisições enviadas pelo sistema incluem o cabeçalho `User-Agent` identificando a aplicação e o responsável técnico, garantindo a rastreabilidade e transparência no acesso aos dados públicos.
