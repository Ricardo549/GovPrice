import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Structured Axios client for Compras.gov.br API
  const comprasApiClient = axios.create({
    baseURL: 'https://dadosabertos.compras.gov.br',
    timeout: 30000,
    headers: {
      'accept': 'application/json',
      'User-Agent': 'SistemaPesquisaPrecos-GovMGPrice/1.0 (contato: ricardo.costa@bombeiros.mg.gov.br)'
    }
  });

  // Proxy for detailed item info (CATMAT/CATSER)
  app.get("/api/catalogo/detalhe/:tipo/:codigo", async (req, res) => {
    const { tipo, codigo } = req.params;
    try {
      const endpoint = tipo === 'servico' ? 'servicos' : 'materiais';
      const url = `https://api.compras.dados.gov.br/compras/v1/${endpoint}/${codigo}.json`;
      const response = await axios.get(url, { timeout: 5000 });
      res.json(response.data);
    } catch (error) {
      console.error("Erro ao buscar detalhe do item:", error);
      res.status(500).json({ error: "Erro ao buscar detalhe do item" });
    }
  });

  // Proxy for licitations related to a material
  app.get("/api/licitacoes/item/:codigo", async (req, res) => {
    const { codigo } = req.params;
    try {
      const url = `https://api.compras.dados.gov.br/licitacoes/v1/item_licitacao.json?item_material=${codigo}`;
      const response = await axios.get(url, { timeout: 5000 });
      res.json(response.data);
    } catch (error) {
      console.error("Erro ao buscar licitações do item:", error);
      res.status(500).json({ error: "Erro ao buscar licitações" });
    }
  });

  // Proxy for CATMAT/CATSER search
  app.get("/api/catalogo/search", async (req, res) => {
    const { termo, tipo } = req.query;
    if (!termo) return res.status(400).json({ error: "Termo de busca é obrigatório" });

    try {
      // Module 4.4 for Material and 5.6 for Service as per API documentation
      const endpoint = tipo === 'servico' ? '5_consultarItemServico' : '4_consultarItemMaterial';
      
      // Use the structured client
      const response = await comprasApiClient.get(`/modulo-catalogo/${endpoint}`, {
        params: { 
          nome: termo, 
          pagina: 1,
          tamanhoPagina: 20
        }
      });
      
      // The API response structure for these modules usually has a 'resultado' array
      res.json(response.data.resultado || response.data);
    } catch (error) {
      console.error("Erro ao consultar catálogo:", error.message);
      // Fallback mock data for demo if API fails or returns 404
      const tipoStr = req.query.tipo as string;
      const mockCatalog = tipoStr === 'servico' ? [
        { codigo: "1234", nome: "Serviço de Limpeza e Conservação", descricao: "Limpeza predial administrativa" },
        { codigo: "5678", nome: "Serviço de Vigilância Monitorada", descricao: "Vigilância patrimonial 24h" }
      ] : [
        { codigo: "470674", nome: "Ventilador de Coluna", descricao: "Ventilador oscilante 40cm" },
        { codigo: "150500", nome: "Cadeira de Escritório", descricao: "Cadeira giratória ergonômica" },
        { codigo: "223344", nome: "Papel A4 Branco", descricao: "Resma 500 folhas 75g" }
      ];
      res.json(mockCatalog);
    }
  });

  // Proxy for Compras.gov API to avoid CORS
  app.get("/api/precos/:catmat", async (req, res) => {
    const { catmat } = req.params;
    const { uf } = req.query;
    
    try {
      const endpoint = '/modulo-pesquisa-preco/1_consultarMaterial';
      const response = await comprasApiClient.get(endpoint, {
        params: {
          pagina: 1,
          tamanhoPagina: 100,
          codigoltemCatalogo: catmat,
          estado: uf || 'MG'
        }
      });
      
      const rawResults = response.data.resultado || [];
      
      // Map API response to our PrecoItem interface
      const formattedData = rawResults.map((item: any, index: number) => ({
        orgao: item.nomeOrgao || "Órgão não identificado",
        data: item.dataResultado || "N/A",
        valor: parseFloat(item.precoUnitario || 0),
        idCompra: item.idCompra || `COMPRA-${index}`,
        nomeFornecedor: item.nomeFornecedor || "Fornecedor não informado",
        marca: item.marca || "N/A",
        itemSustentavel: item.itemSustentavel === true,
        porteFornecedor: item.porteFornecedor || "N/A",
        numeroControlePNCP: item.numeroControlePNCP || null,
        selected: true,
        categoria: 'material'
      }));

      res.json(formattedData);
    } catch (error) {
      console.error('Erro ao consultar API do Governo:', error.message);
      
      // Fallback mock data for demo
      const mockData = [
        { orgao: "Comando da Marinha", data: "2023-05-01", valor: 250.00, idCompra: "123/2023", nomeFornecedor: "ALPHA SUPRIMENTOS LTDA", marca: "VENTISOL", itemSustentavel: true, porteFornecedor: "ME/EPP", selected: true, categoria: 'material' },
        { orgao: "Prefeitura de SP", data: "2023-06-15", valor: 280.50, idCompra: "456/2023", nomeFornecedor: "BETA COMERCIAL EIRELI", marca: "ARGE", itemSustentavel: false, porteFornecedor: "Demais", selected: true, categoria: 'material' },
        { orgao: "Exército Brasileiro", data: "2023-04-10", valor: 210.00, idCompra: "789/2023", nomeFornecedor: "GAMMA DISTRIBUIDORA", marca: "MONDIAL", itemSustentavel: false, porteFornecedor: "ME/EPP", selected: true, categoria: 'material' },
        { orgao: "Tribunal de Justiça", data: "2023-07-20", valor: 650.00, idCompra: "012/2023", nomeFornecedor: "DELTA TECH", marca: "CADENCE", itemSustentavel: false, porteFornecedor: "Demais", selected: true, categoria: 'material' },
        { orgao: "Ministério da Saúde", data: "2023-08-01", valor: 235.00, idCompra: "345/2023", nomeFornecedor: "EPSILON VENDAS", marca: "VENTISOL", itemSustentavel: true, porteFornecedor: "ME/EPP", selected: true, categoria: 'material' },
        { orgao: "Universidade Federal", data: "2023-09-12", valor: 245.00, idCompra: "678/2023", nomeFornecedor: "ZETA ATACADO", marca: "ARGE", itemSustentavel: false, porteFornecedor: "ME/EPP", selected: true, categoria: 'material' },
        { orgao: "Secretaria de Educação", data: "2023-10-05", valor: 260.00, idCompra: "901/2023", nomeFornecedor: "ETA COMERCIO", marca: "MONDIAL", itemSustentavel: false, porteFornecedor: "Demais", selected: true, categoria: 'material' }
      ];
      res.json(mockData);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
