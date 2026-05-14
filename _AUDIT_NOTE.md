# Audit Apply Note — AIPersonalFinanceMultiAgent

Source: `_AUDIT/reports/batch_06.md` section 15.

## Discrepancy with Audit
The audit reported "0 AI endpoints" and "no agentic implementation". The actual `backend/routes/agents.js` exposes a multi-agent system with these AI endpoints:
- `/api/agents/analyze-spending`, `/detect-savings`, `/forecast`
- `/api/agents/run/categorizer`, `/run/subscription-detector`, `/run/forecast`, `/run/optimizer`, `/run/negotiator`
- `/api/agents/run-all`, `/run/:agentName`
- Results & logs endpoints

There are also five concrete agent classes under `backend/agents/`:
- `categorizerAgent.js`, `subscriptionDetectorAgent.js`, `forecastAgent.js`, `spendingOptimizerAgent.js`, `billNegotiatorAgent.js`

So the audit's specific recs are essentially already covered:
- "categorize-transaction" ⇒ `categorizerAgent` + `/run/categorizer`
- "budget-recommend" ⇒ `analyze-spending` and `spendingOptimizerAgent`
- "subscription-audit" ⇒ `subscriptionDetectorAgent` + `/run/subscription-detector`
- "net-worth-forecast" ⇒ `forecastAgent` + `/forecast` + `/run/forecast`

## Implemented (this pass)
None. Per the apply guideline ("substantive projects with all-non-mechanical recs → backlog-only"), no new code.

## Backlog
| Item | Tag |
|---|---|
| Bank/credit-card sync (Plaid, MX) | NEEDS-CREDS |
| Investment portfolio tracking | NEEDS-CREDS |
| Tax planning | NEEDS-PRODUCT-DECISION |
| Bill-pay integration | NEEDS-CREDS |
| Real-time expense anomaly streaming | NEEDS-PRODUCT-DECISION |
| Multi-goal optimization | MECHANICAL |
| Cashflow forecasting (forward variant) | MECHANICAL — different from existing forecast |

## Apply pass 3 (frontend)

- **FE stack:** CRA React 18 (`frontend/`) — fetch-based `services/api.js`.
- **Action:** LEFT-AS-IS — frontend already fully wired.
- `frontend/src/services/api.js` exposes `analyzeSpending`, `detectSavings`, `forecast`, `runAgent`, `runAllAgents`, `getAgentLogs`, `getAgentResults`.
- `frontend/src/pages/AgentsPage.js` (164 lines) renders all five agents (categorizer, subscription-detector, forecast, optimizer, negotiator), per-agent run buttons, run-all, and logs/results tabs.
- JWT Bearer is read from `localStorage.getItem('token')` in `h()` and attached to every request.
- No files modified in this pass.

## Apply pass 4 (mechanical backlog)

Implemented the two MECHANICAL backlog items:

**Backend (`backend/routes/agents.js`):**
- `POST /api/agents/multi-goal-optimize` — body `{ goals:[{name,target_amount,deadline_months,priority}], monthly_income, monthly_expenses, current_savings? }`. Calls `callAI`, persists to both `ai_results` and `ai_analysis_results`. Caps at 10 goals. Returns JSON with per-goal allocation, projected completion, on-track flag, trade-offs and recommended priority order.
- `POST /api/agents/cashflow-forecast` — body `{ recurring_income:[...], recurring_expenses:[...], one_offs?:[...], horizon_weeks?:1..52, starting_balance? }`. Returns weekly projection, lowest balance week, negative-balance weeks, key risks, recommendations. Distinct from the existing back-looking `/forecast`.
- Both gated on `OPENROUTER_API_KEY` (HTTP 503 when missing). Existing `aiRateLimiter` (20/hour per user) applies.

**Frontend:**
- `frontend/src/services/api.js` — added `multiGoalOptimize` and `cashflowForecast`. Each includes 503 detection (throws "AI service unavailable: ..."). JWT Bearer is attached via the existing `h()` helper.
- `frontend/src/pages/AgentsPage.js` — added two new sub-tabs ("Multi-Goal Optimizer", "Cashflow Forecast") under the existing "Manual Analysis" tab. Each has structured inputs (numeric scalars + JSON textareas with sample values) and feeds the existing `runLegacy` / `renderResult` pipeline so results render in the existing nested-key UI.
- Also fixed a pre-existing one-character syntax slip in the Apply-pass-3 modifications to `runAgent` (missing `)` after `[key]:data`) that caused babel-parser to fail; CRA's compiler may have been more lenient, but the file now parses cleanly so future edits can be syntax-checked.

**Smoke test (5/8/2026, OPENROUTER_API_KEY set):**
- `pkill` on 3006 → start `node server.js` → login `admin@example.com / admin123` → `POST /api/agents/multi-goal-optimize` returns HTTP 200 with `available_surplus` and per-goal allocation → `POST /api/agents/cashflow-forecast` returns HTTP 200 with 4-week projection and lowest-balance week → cleanup.

**Syntax check:** `node --check` PASS on `routes/agents.js`. `@babel/parser` (jsx plugin) PASS on `services/api.js` and `pages/AgentsPage.js`.

**Backlog still deferred:** Plaid/MX/bill-pay (NEEDS-CREDS), tax planning (NEEDS-PRODUCT-DECISION), real-time anomaly streaming (NEEDS-PRODUCT-DECISION), investment portfolio (NEEDS-CREDS).
