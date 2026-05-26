import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ChatAnthropic } from '@langchain/anthropic';
import {
  getMarketDataTool,
  analyzeSentimentTool,
  createPortfolioTool,
  createExecuteOrderTool,
  createSetAlertTool,
} from './tools';

const SYSTEM_PROMPT = `Tu es un agent IA financier expert, disponible exclusivement pour les membres PRO de Dozanta.

Tu as accès à ces outils :
- **get_market_data** : données OHLCV + indicateurs techniques (RSI, MACD, SMA/EMA)
- **analyze_sentiment** : consensus analystes, valorisation fondamentale
- **get_portfolio_state** : positions, cash, P&L du portefeuille paper trading
- **execute_order** : enregistre un ordre paper trading en base de données (prix via Yahoo Finance)
- **set_alert** : création d'alertes sur conditions de marché

Directives :
1. Toujours utiliser les outils pour baser tes analyses sur des données réelles, pas des suppositions.
2. Pour les rapports de marché, utilise TOUJOURS get_market_data ET analyze_sentiment.
3. Avant d'exécuter un ordre (execute_order), résume clairement l'ordre prévu et demande une confirmation explicite.
4. Rédige en français, de façon structurée, avec des sections claires.
5. Explique ton raisonnement : données brutes → interprétation → recommandation.
6. Rappelle toujours que c'est du paper trading et non des conseils financiers.

Pour un rapport structuré, utilise ce format :
## 📊 Analyse [SYMBOLE]
### Données de marché
### Indicateurs techniques
### Sentiment & Fondamentaux
### Conclusion & Recommandation`;

export function createFinanceAgent(userId: string) {
  const llm = new ChatAnthropic({
    model: 'claude-sonnet-4-5',
    apiKey: process.env.ANTHROPIC_API_KEY,
    temperature: 0.1,
    streaming: true,
  });

  const tools = [
    getMarketDataTool,
    analyzeSentimentTool,
    createPortfolioTool(userId),
    createExecuteOrderTool(userId),
    createSetAlertTool(userId),
  ];

  return createReactAgent({
    llm,
    tools,
    messageModifier: SYSTEM_PROMPT,
  });
}
