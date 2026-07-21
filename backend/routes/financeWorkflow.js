const express = require('express');
const pool = require('../models/db');
const { reconcileInputs, calculateSnapshot, validateTransition } = require('../domain/financePolicy');

const router = express.Router();
const tenantFor = (user) => String(user.tenant_id || user.tenantId || user.id);
const actorFor = (user) => String(user.id);

router.post('/cases', async (req, res) => {
  const client = await pool.connect();
  try {
    const { case_ref, purpose, effective_at, idempotency_key, correlation_id } = req.body || {};
    const inputs = reconcileInputs(req.body?.inputs);
    if (!case_ref || !purpose || !effective_at || !idempotency_key || !correlation_id || Number.isNaN(new Date(effective_at).valueOf())) throw new Error('case_ref, purpose, valid effective_at, idempotency_key, and correlation_id are required');
    const tenantId = tenantFor(req.user);
    const actorId = actorFor(req.user);
    await client.query('BEGIN');
    let result = await client.query(
      `INSERT INTO finance_cases (tenant_id, case_ref, purpose, effective_at, created_by, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (tenant_id, idempotency_key) DO NOTHING RETURNING *`,
      [tenantId, case_ref, purpose, effective_at, actorId, idempotency_key]
    );
    const inserted = result.rows.length === 1;
    if (!inserted) result = await client.query('SELECT * FROM finance_cases WHERE tenant_id=$1 AND idempotency_key=$2', [tenantId, idempotency_key]);
    const financeCase = result.rows[0];
    if (inserted) {
      for (const input of inputs) {
        await client.query(
          `INSERT INTO finance_inputs (case_id, source_system, record_ref, source_version, checksum, effective_at, amount, currency, payload)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [financeCase.id, input.source_system, input.record_ref, input.source_version, input.checksum, input.effective_at, input.amount ?? null, input.currency ?? null, JSON.stringify(input.payload || {})]
        );
      }
    }
    await client.query(
      `INSERT INTO finance_workflow_audit (tenant_id, case_id, actor_id, action, to_stage, evidence, correlation_id)
       VALUES ($1,$2,$3,'created','intake',$4,$5) ON CONFLICT (tenant_id, correlation_id) DO NOTHING`,
      [tenantId, financeCase.id, actorId, JSON.stringify({ input_count: inputs.length }), correlation_id]
    );
    await client.query('COMMIT');
    res.status(inserted ? 201 : 200).json(financeCase);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(error.code === '23505' ? 409 : 400).json({ error: error.message });
  } finally {
    client.release();
  }
});

router.post('/cases/:caseRef/calculate', async (req, res) => {
  const client = await pool.connect();
  try {
    const tenantId = tenantFor(req.user);
    const actorId = actorFor(req.user);
    const { expected_version, formula_version, input_digest, correlation_id, snapshot } = req.body || {};
    if (!Number.isInteger(expected_version) || !formula_version || !input_digest || !correlation_id) throw new Error('integer expected_version, formula_version, input_digest, and correlation_id are required');
    const calculated = calculateSnapshot(snapshot || {});
    await client.query('BEGIN');
    const priorAudit = await client.query('SELECT case_id FROM finance_workflow_audit WHERE tenant_id=$1 AND correlation_id=$2', [tenantId, correlation_id]);
    if (priorAudit.rows.length) {
      const existing = await client.query('SELECT * FROM finance_cases WHERE id=$1', [priorAudit.rows[0].case_id]);
      await client.query('COMMIT');
      return res.json(existing.rows[0]);
    }
    const current = await client.query('SELECT * FROM finance_cases WHERE tenant_id=$1 AND case_ref=$2 FOR UPDATE', [tenantId, req.params.caseRef]);
    if (!current.rows.length) throw Object.assign(new Error('finance case not found'), { status: 404 });
    const financeCase = current.rows[0];
    if (financeCase.version !== expected_version) throw Object.assign(new Error('stale workflow version'), { status: 409 });
    validateTransition(financeCase.stage, 'calculated', { role: req.user.role, actorId, createdBy: financeCase.created_by });
    await client.query(
      `INSERT INTO finance_calculations (case_id, formula_version, input_digest, net_worth, monthly_cashflow, assumptions, calculated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [financeCase.id, formula_version, input_digest, calculated.net_worth, calculated.monthly_cashflow, JSON.stringify(req.body.assumptions || {}), actorId]
    );
    const updated = await client.query("UPDATE finance_cases SET stage='calculated', version=version+1, updated_at=NOW() WHERE id=$1 RETURNING *", [financeCase.id]);
    await client.query(
      `INSERT INTO finance_workflow_audit (tenant_id, case_id, actor_id, action, from_stage, to_stage, evidence, correlation_id)
       VALUES ($1,$2,$3,'calculate',$4,'calculated',$5,$6)`,
      [tenantId, financeCase.id, actorId, financeCase.stage, JSON.stringify({ formula_version, input_digest, ...calculated }), correlation_id]
    );
    await client.query('COMMIT');
    res.json(updated.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(error.status || (error.code === '23505' ? 409 : 400)).json({ error: error.message });
  } finally {
    client.release();
  }
});

router.post('/cases/:caseRef/transition', async (req, res) => {
  const client = await pool.connect();
  try {
    const tenantId = tenantFor(req.user);
    const actorId = actorFor(req.user);
    const { to_stage, expected_version, correlation_id, evidence = {} } = req.body || {};
    if (to_stage === 'calculated') throw new Error('use the calculate endpoint for calculated transitions');
    if (!to_stage || !Number.isInteger(expected_version) || !correlation_id) throw new Error('to_stage, integer expected_version, and correlation_id are required');
    await client.query('BEGIN');
    const priorAudit = await client.query('SELECT case_id FROM finance_workflow_audit WHERE tenant_id=$1 AND correlation_id=$2', [tenantId, correlation_id]);
    if (priorAudit.rows.length) {
      const existing = await client.query('SELECT * FROM finance_cases WHERE id=$1', [priorAudit.rows[0].case_id]);
      await client.query('COMMIT');
      return res.json(existing.rows[0]);
    }
    const current = await client.query('SELECT * FROM finance_cases WHERE tenant_id=$1 AND case_ref=$2 FOR UPDATE', [tenantId, req.params.caseRef]);
    if (!current.rows.length) throw Object.assign(new Error('finance case not found'), { status: 404 });
    const financeCase = current.rows[0];
    if (financeCase.version !== expected_version) throw Object.assign(new Error('stale workflow version'), { status: 409 });
    validateTransition(financeCase.stage, to_stage, { ...evidence, role: req.user.role, actorId, createdBy: financeCase.created_by });
    const updated = await client.query('UPDATE finance_cases SET stage=$1, version=version+1, explanation=COALESCE($2,explanation), provider_receipt=COALESCE($3,provider_receipt), correction_reference=COALESCE($4,correction_reference), updated_at=NOW() WHERE id=$5 RETURNING *', [to_stage, evidence.explanation || null, evidence.providerReceipt || null, evidence.correctionReference || null, financeCase.id]);
    await client.query(
      `INSERT INTO finance_workflow_audit (tenant_id, case_id, actor_id, action, from_stage, to_stage, evidence, correlation_id)
       VALUES ($1,$2,$3,'transition',$4,$5,$6,$7)`,
      [tenantId, financeCase.id, actorId, financeCase.stage, to_stage, JSON.stringify(evidence), correlation_id]
    );
    await client.query('COMMIT');
    res.json(updated.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(error.status || 400).json({ error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
