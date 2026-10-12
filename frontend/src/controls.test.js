import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import AgentsPage from './pages/AgentsPage';
import LoginPage from './pages/LoginPage';
import AIReport from './components/AIReport';
import AIWorkspace, { workspaceFields, workspacePresets } from './components/AIWorkspace';

let container, root;
beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); global.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(() => { act(() => root.unmount()); container.remove(); jest.restoreAllMocks(); });
const click = (button) => act(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));

test('manual AI presets fill every editable field on all five tabs without sending a request', () => {
  const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() => { throw new Error('unexpected request'); });
  act(() => root.render(<AgentsPage />));
  click([...container.querySelectorAll('button')].find(b => b.textContent === 'Manual Analysis'));
  for (const tab of ['Spending Analyzer','Savings Finder','Spending Forecast','Multi-Goal Optimizer','Cashflow Forecast']) {
    click([...container.querySelectorAll('button')].find(b => b.textContent === tab));
    for (const label of ['Steady household','Debt payoff','Variable income']) {
      click([...container.querySelectorAll('button')].find(b => b.textContent === `Fill ${label}`));
      const fields = [...container.querySelectorAll('textarea,input[type="number"]')];
      expect(fields.length).toBeGreaterThan(0);
      fields.forEach(field => expect(field.value).not.toBe(''));
      JSON.parse(fields[0].value);
    }
  }
  expect(fetchSpy).not.toHaveBeenCalled();
});

test('workspace presets cover required and optional fields', () => {
  const presets = workspacePresets({ title:'Cashflow forecasting', samples:[] });
  expect(presets).toHaveLength(3);
  presets.forEach(preset => workspaceFields.forEach(field => expect(preset.values[field.key]).toBeTruthy()));
});

test('saved and returned JSON shows sections, tables, zero, false and empty string', () => {
  const report = { feature:'sample', input:{goal:'Review'}, result:'ignored', result_json:{summary:{approved:false,change:0,note:''},items:[{name:'Rent',amount:1800},{name:'Food',amount:200}]}};
  const html = renderToStaticMarkup(<AIReport response={report} />);
  expect(html).toContain('Summary'); expect(html).toContain('Approved'); expect(html).toContain('No');
  expect(html).toContain('Change'); expect(html).toContain('0'); expect(html).toContain('Empty string');
  expect(html).toContain('<table'); expect(html).toContain('Rent');
  const returned = renderToStaticMarkup(<AIReport response={{id:0,result:false,note:''}} />);
  expect(returned).toContain('Id'); expect(returned).toContain('Result'); expect(returned).toContain('No'); expect(returned).toContain('Empty string');
});

test('demo button fills configured fields without submitting', () => {
  const old = [process.env.REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL,process.env.REACT_APP_DEMO_EMAIL,process.env.REACT_APP_DEMO_PASSWORD];
  const entries = Object.fromEntries(require('fs').readFileSync(require('path').resolve(__dirname, '../../.env'),'utf8').split(/\r?\n/).filter(line => /^(DEMO_EMAIL|DEMO_PASSWORD)=/.test(line)).map(line => { const at = line.indexOf('='); return [line.slice(0,at), line.slice(at+1).replace(/^['\"]|['\"]$/g,'')]; }));
  expect(Boolean(entries.DEMO_EMAIL && entries.DEMO_PASSWORD)).toBe(true);
  process.env.REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL='true';process.env.REACT_APP_DEMO_EMAIL=entries.DEMO_EMAIL;process.env.REACT_APP_DEMO_PASSWORD=entries.DEMO_PASSWORD;
  const fetchSpy = jest.spyOn(global,'fetch').mockImplementation(() => { throw new Error('unexpected request'); });
  try {
    act(() => root.render(<LoginPage onLogin={jest.fn()} />));
    const button = [...container.querySelectorAll('button')].find(b => b.textContent === 'Fill demo credentials');
    expect(button.disabled).toBe(false); click(button);
    expect(container.querySelector('input[type="email"]').value === entries.DEMO_EMAIL).toBe(true);
    expect(container.querySelector('input[type="password"]').value === entries.DEMO_PASSWORD).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally {
    ['REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL','REACT_APP_DEMO_EMAIL','REACT_APP_DEMO_PASSWORD'].forEach((key,i) => { if (old[i] === undefined) delete process.env[key]; else process.env[key]=old[i]; });
  }
});

test('workspace buttons fill optional fields and saved history opens as a report', async () => {
  const saved = {id:7,feature:'fixture',input:{goal:'Review cash flow',budget:''},result:'ignored',result_json:{facts:{on_track:false,variance:0,note:''},rows:[{month:'October',amount:42}]},model:'fixture',created_at:'2026-10-10T00:00:00Z'};
  const fetchSpy = jest.spyOn(global,'fetch').mockResolvedValue({ok:true,json:async()=>({items:[saved]})});
  await act(async () => root.render(<AIWorkspace feature={{id:'fixture',title:'Cashflow forecasting',description:'Fixture report'}} token="fixture" />));
  expect(fetchSpy).toHaveBeenCalledTimes(1);
  for (const label of ['Household plan','Debt review','Variable income']) {
    click([...container.querySelectorAll('button')].find(b => b.textContent === label));
    workspaceFields.forEach(field => expect(container.querySelector(`#fixture-${field.key}`).value).not.toBe(''));
  }
  expect(fetchSpy).toHaveBeenCalledTimes(1);
  click(container.querySelector('.ai-history-row'));
  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog.textContent).toContain('Review cash flow');
  expect(dialog.textContent).toContain('On track');
  expect(dialog.textContent).toContain('No');
  expect(dialog.textContent).toContain('Variance');
  expect(dialog.textContent).toContain('0');
  expect(dialog.textContent).toContain('Empty string');
  expect(dialog.querySelector('table')).not.toBeNull();
});
