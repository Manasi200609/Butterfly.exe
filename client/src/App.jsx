import { useCallback, useEffect, useMemo, useState } from "react";
import { createExperiment, getComparison, getExperiment, getExplanation, getHealth, getRecentExperiments, getSuggestions, getWorld, getWorlds } from "./services/api.js";
import { formatNumber, WorldScene } from "./components/WorldScene.jsx";
import "./styles/butterfly.css";

const DEFAULT_KIND = { city: "closeRoad", ecosystem: "resourceDelta", unknown: "exchangeRate" };
const DEFAULT_MOD = {
  city: { closeRoad: "" }, ecosystem: { resourceDelta: -20 }, unknown: { exchangeRate: 0.4 },
};
const kindOptions = {
  city: [["closeRoad", "Close a road"], ["reduceCapacity", "Reduce road capacity"], ["changeDemand", "Change commuter demand"], ["delayTransit", "Delay departures"]],
  ecosystem: [["resourceDelta", "Change plant resources"], ["rainfall", "Change rainfall"], ["regeneration", "Change regeneration"], ["removeSpecies", "Remove a species"]],
  unknown: [["exchangeRate", "Change exchange rate"], ["connectionProbability", "Change connection probability"], ["resourceDelta", "Change agent resources"], ["removeConnection", "Remove a connection"]],
};

const titleCase = (value = "") => value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
const metricValue = (value) => value === null || value === undefined ? "—" : formatNumber(value, 2);

function ButterflyMark() {
  return <svg className="butterfly-mark" viewBox="0 0 34 34" aria-hidden="true"><path d="M17 17C12 5 5 5 5 11c0 4 5 7 12 6Zm0 0C22 5 29 5 29 11c0 4-5 7-12 6Zm0 0c-4 0-8 4-7 8 1 3 5 2 7-3 2 5 6 6 7 3 1-4-3-8-7-8Z" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M17 10v15m0-15-3-4m3 4 3-4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
}

function Spinner({ label = "Working" }) { return <span className="loading-inline" role="status"><i className="spinner" />{label}</span>; }

function NumberField({ label, value, min, max, step = 1, onChange, suffix }) {
  return <label className="field-label">{label}<span className="number-input-wrap"><input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /><small>{suffix}</small></span></label>;
}

function ModificationFields({ world, definition, kind, onKind, mod, onMod }) {
  const roads = definition?.initialState?.roads || [], species = definition?.initialState?.species || [], agents = definition?.initialState?.agents || [], links = definition?.initialState?.connections || [];
  const set = (key, value) => onMod({ [key]: value });
  return <div className="mod-fields">
    <label className="field-label">Change to explore<select value={kind} onChange={(event) => onKind(event.target.value)}>{kindOptions[world].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    {world === "city" && kind === "closeRoad" && <><label className="field-label">Road<select value={mod.closeRoad || ""} onChange={(event) => set("closeRoad", event.target.value)}><option value="">Open roads · run baseline</option>{roads.map((road) => <option key={road.id} value={road.id}>{road.id} · capacity {road.capacity}</option>)}</select></label>{mod.closeRoad && <button type="button" className="button button-quiet road-reopen-button" onClick={() => set("closeRoad", "")}>Reopen selected road <span>↺</span></button>}</>}
    {world === "city" && kind === "reduceCapacity" && <><label className="field-label">Road<select value={mod.reduceCapacity?.roadId || roads[0]?.id || ""} onChange={(event) => set("reduceCapacity", { ...(mod.reduceCapacity || { amount: 1 }), roadId: event.target.value })}>{roads.map((road) => <option key={road.id} value={road.id}>{road.id} · capacity {road.capacity}</option>)}</select></label><NumberField label="Capacity reduction" value={mod.reduceCapacity?.amount ?? 1} min={1} max={10} onChange={(value) => set("reduceCapacity", { ...(mod.reduceCapacity || { roadId: roads[0]?.id }), amount: value })} suffix="units" /></>}
    {world === "city" && kind === "changeDemand" && <NumberField label="Add or remove commuters" value={mod.changeDemand ?? 2} min={-5} max={20} onChange={(value) => set("changeDemand", value)} suffix="people" />}
    {world === "city" && kind === "delayTransit" && <NumberField label="Departure delay" value={mod.delayTransit?.steps ?? 2} min={0} max={10} onChange={(value) => set("delayTransit", { steps: value })} suffix="steps" />}
    {world === "ecosystem" && kind === "resourceDelta" && <NumberField label="Plant resource change" value={mod.resourceDelta ?? -20} min={-100} max={100} onChange={(value) => set("resourceDelta", value)} suffix="units" />}
    {world === "ecosystem" && kind === "rainfall" && <NumberField label="Rainfall factor" value={mod.rainfall ?? 0.6} min={0} max={2} step={0.1} onChange={(value) => set("rainfall", value)} suffix="×" />}
    {world === "ecosystem" && kind === "regeneration" && <NumberField label="Resource regeneration" value={mod.regeneration ?? 4} min={0} max={20} onChange={(value) => set("regeneration", value)} suffix="per step" />}
    {world === "ecosystem" && kind === "removeSpecies" && <label className="field-label">Species<select value={mod.removeSpecies || species[0]?.id || ""} onChange={(event) => set("removeSpecies", event.target.value)}>{species.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}</select></label>}
    {world === "unknown" && kind === "exchangeRate" && <NumberField label="Fraction exchanged each step" value={mod.exchangeRate ?? 0.4} min={0} max={0.5} step={0.05} onChange={(value) => set("exchangeRate", value)} suffix="rate" />}
    {world === "unknown" && kind === "connectionProbability" && <NumberField label="New connection chance" value={mod.connectionProbability ?? 0.5} min={0} max={1} step={0.05} onChange={(value) => set("connectionProbability", value)} suffix="per pair" />}
    {world === "unknown" && kind === "resourceDelta" && <NumberField label="Resource change per agent" value={mod.resourceDelta ?? 2} min={-10} max={10} step={0.5} onChange={(value) => set("resourceDelta", value)} suffix="units" />}
    {world === "unknown" && kind === "removeConnection" && <label className="field-label">Connection<select value={(mod.removeConnection || links[0] || []).join("|")} onChange={(event) => set("removeConnection", event.target.value.split("|"))}>{links.map(([a, b]) => <option key={`${a}-${b}`} value={`${a}|${b}`}>{a} ↔ {b}</option>)}</select></label>}
    <p className="field-hint">Only supported parameters can be changed. Every run uses this exact intervention.</p>
  </div>;
}

function MetricTable({ differences }) {
  if (!differences || !Object.keys(differences).length) return <p className="muted-note">No comparable metrics were returned.</p>;
  return <div className="metric-table-wrap"><table className="metric-table"><thead><tr><th>Measured output</th><th>Baseline</th><th>Modified</th><th>Δ change</th><th>Δ %</th></tr></thead><tbody>{Object.entries(differences).map(([key, value]) => <tr key={key}><th scope="row">{titleCase(key)}</th><td>{metricValue(value.baseline)}</td><td className="modified-value">{metricValue(value.modified)}</td><td>{value.absoluteDifference === null ? "—" : `${value.absoluteDifference > 0 ? "+" : ""}${metricValue(value.absoluteDifference)}`}</td><td>{value.percentageDifference === null ? "—" : `${value.percentageDifference > 0 ? "+" : ""}${metricValue(value.percentageDifference)}%`}</td></tr>)}</tbody></table></div>;
}

function TrajectoryPlot({ world, experiment }) {
  const key = world === "city" ? "completedTrips" : world === "ecosystem" ? "plantResource" : "components";
  const series = (scenario) => (scenario?.trajectories || []).map((point) => world === "ecosystem" ? point.resources?.plants : world === "unknown" ? point.components?.length : point[key]).filter(Number.isFinite);
  const baseline = series(experiment?.baseline), modified = series(experiment?.modified), all = [...baseline, ...modified];
  if (!all.length) return null;
  const min = Math.min(0, ...all), max = Math.max(1, ...all), coords = (values) => values.map((value, index) => `${12 + (index / Math.max(1, values.length - 1)) * 276},${86 - ((value - min) / (max - min || 1)) * 70}`).join(" ");
  return <div className="trajectory-panel"><div className="section-overline">STEP TRACE <span>from recorded simulation states</span></div><svg className="trajectory-chart" viewBox="0 0 300 100" role="img" aria-label={`${titleCase(key)} by simulation step, baseline and modified scenario`}><path d="M12 86H288M12 51H288M12 16H288" className="chart-grid" /><polyline points={coords(baseline)} className="chart-line chart-baseline" /><polyline points={coords(modified)} className="chart-line chart-modified" /></svg><div className="chart-legend"><span><i className="legend-baseline" />Baseline</span><span><i className="legend-modified" />Modified</span><small>Step 1 → {Math.max(baseline.length, modified.length)}</small></div></div>;
}

function FindingDetail({ finding, onInvestigate }) {
  if (!finding) return <div className="evidence-empty"><span className="evidence-glyph">◎</span><p>Select a finding to inspect its event records and evidence.</p></div>;
  return <div className="finding-detail" aria-live="polite"><div className="detail-kicker">EVIDENCE INSPECTOR <span>{finding.evidenceStatus === "candidate_explanation" ? "CANDIDATE MECHANISM" : "UNVERIFIED HYPOTHESIS"}</span></div><h3>{finding.whatChanged}</h3><p>{finding.candidateExplanation}</p><div className="detail-source">Flagged because · {finding.flaggedBecause}</div>
    {finding.evidence?.length ? <div className="event-references">{finding.evidence.map((reference, index) => <article className="event-reference" key={`${reference.scenario}-${reference.eventIndex}-${index}`}><span className="event-ref-no">{String(reference.eventIndex + 1).padStart(2, "0")}</span><div><div className="event-title"><strong>{titleCase(reference.event.type.replaceAll("_", " "))}</strong><small>{reference.scenario} · step {reference.event.step}</small></div><pre>{JSON.stringify(reference.event, null, 2)}</pre></div></article>)}</div> : <p className="no-event-evidence">No matching event was recorded. The mechanism remains unverified.</p>}
    {finding.suggestedFollowUp && <div className="followup-row"><span><small>FOLLOW-UP</small>{finding.suggestedFollowUp}</span><button className="button button-quiet" onClick={onInvestigate}>Explore another change <span>↗</span></button></div>}
  </div>;
}

export default function App() {
  const [worlds, setWorlds] = useState([]), [world, setWorld] = useState("city"), [definition, setDefinition] = useState(null);
  const [worldVersion, setWorldVersion] = useState(0);
  const [health, setHealth] = useState(null), [healthError, setHealthError] = useState(""), [worldError, setWorldError] = useState(""), [worldsError, setWorldsError] = useState("");
  const [kind, setKind] = useState(DEFAULT_KIND.city), [modByWorld, setModByWorld] = useState(DEFAULT_MOD);
  const [steps, setSteps] = useState(10), [seed, setSeed] = useState(42), [experiment, setExperiment] = useState(null), [comparison, setComparison] = useState(null), [persistence, setPersistence] = useState("demo");
  const [running, setRunning] = useState(false), [recent, setRecent] = useState([]), [recentError, setRecentError] = useState("");
  const [suggestions, setSuggestions] = useState(null), [suggestionError, setSuggestionError] = useState(""), [suggesting, setSuggesting] = useState(false);
  const [explanation, setExplanation] = useState(null), [explaining, setExplaining] = useState(false), [explanationError, setExplanationError] = useState("");
  const [selectedFinding, setSelectedFinding] = useState(null), [scene, setScene] = useState("modified"), [message, setMessage] = useState("");
  const [baselineReady, setBaselineReady] = useState(false), [selectedAgent, setSelectedAgent] = useState("");
  const mod = modByWorld[world] || {};

  const refreshRecent = useCallback(async (signal) => {
    try { const response = await getRecentExperiments({ signal }); setRecent(response.experiments || []); setRecentError(""); }
    catch (error) { if (error.name !== "AbortError") setRecentError(error.message); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getWorlds({ signal: controller.signal }).then((response) => {
      if (controller.signal.aborted) return;
      setWorlds(Array.isArray(response?.worlds) ? response.worlds : []);
      setWorldsError("");
    }).catch((error) => { if (!controller.signal.aborted && error.name !== "AbortError") setWorldsError(error.message); });
    getHealth({ signal: controller.signal }).then((response) => {
      if (controller.signal.aborted) return;
      setHealth(response);
      setHealthError("");
    }).catch((error) => { if (!controller.signal.aborted && error.name !== "AbortError") setHealthError(error.message); });
    refreshRecent(controller.signal);
    return () => controller.abort();
  }, [refreshRecent]);

  useEffect(() => {
    const controller = new AbortController();
    setDefinition(null); setWorldError(""); setKind(DEFAULT_KIND[world]);
    getWorld(world, { signal: controller.signal }).then((response) => {
      if (controller.signal.aborted || response?.id !== world) return;
      setDefinition(response);
      setWorldError("");
    }).catch((error) => { if (!controller.signal.aborted && error.name !== "AbortError") setWorldError(error.message); });
    return () => controller.abort();
  }, [world, worldVersion]);

  const selectWorld = (id) => { if (id === world) return; setWorld(id); setExperiment(null); setComparison(null); setSelectedFinding(null); setSuggestions(null); setExplanation(null); setSelectedAgent(""); setBaselineReady(false); setMessage(""); setSteps(Math.min(10, 30)); };
  const updateMod = (patch) => setModByWorld((previous) => ({ ...previous, [world]: { ...(previous[world] || DEFAULT_MOD[world]), ...patch } }));
  const activeModification = useMemo(() => {
    if (!kind) return {};
    const value = mod[kind];
    if (kind === "closeRoad" && !value) return {};
    if (kind === "removeSpecies" && !value) return {};
    if (kind === "removeConnection" && !value?.length) return {};
    if (value !== undefined) return { [kind]: value };
    const roads = definition?.initialState?.roads || [], species = definition?.initialState?.species || [], links = definition?.initialState?.connections || [];
    const defaults = {
      city: { closeRoad: roads[1]?.id || roads[0]?.id, reduceCapacity: { roadId: roads[0]?.id, amount: 1 }, changeDemand: 2, delayTransit: { steps: 2 } },
      ecosystem: { resourceDelta: -20, rainfall: 0.6, regeneration: 4, removeSpecies: species[0]?.id },
      unknown: { exchangeRate: 0.4, connectionProbability: 0.5, resourceDelta: 2, removeConnection: links[0] },
    };
    return defaults[world]?.[kind] === undefined ? {} : { [kind]: defaults[world][kind] };
  }, [definition, kind, mod, world]);

  async function run(modification = activeModification, { baselineOnly = false } = {}) {
    if (!definition || running) return;
    setRunning(true); setMessage(""); setSuggestionError(""); setExplanation(null); setSelectedFinding(null); setSelectedAgent("");
    try {
      const created = await createExperiment({ world, steps, seed: Math.max(0, Math.min(4294967295, Math.trunc(seed))), modification });
      setScene(baselineOnly ? "baseline" : "modified");
      setExperiment(created.experiment); setComparison({ baseline: created.experiment.baseline.metrics, modified: created.experiment.modified.metrics, differences: created.experiment.comparison }); setPersistence(created.persistence || "demo");
      if (world === "city") setBaselineReady(true);
      try { const compare = await getComparison(created.experiment.id); setComparison(compare); }
      catch (error) { setMessage(`Experiment saved. The comparison endpoint could not be refreshed; showing the comparison included in the experiment response. ${error.message}`); }
      await refreshRecent();
    } catch (error) { setMessage(error.message); }
    finally { setRunning(false); }
  }

  async function openRecent(id) {
    if (running) return;
    setRunning(true); setMessage("");
    try {
      const { experiment: loaded, persistence: mode } = await getExperiment(id);
      const compare = await getComparison(id);
      setWorld(loaded.world); setExperiment(loaded); setComparison(compare); setPersistence(mode || "demo"); setScene("modified"); setSelectedFinding(null); setSelectedAgent(""); setBaselineReady(loaded.world === "city"); setExplanation(null);
      setSteps(loaded.parameters.steps); setSeed(loaded.parameters.seed);
      const [key] = Object.keys(loaded.parameters.modification || {});
      setKind(key || DEFAULT_KIND[loaded.world]); setModByWorld((current) => ({ ...current, [loaded.world]: { ...loaded.parameters.modification } }));
    } catch (error) { setMessage(error.message); }
    finally { setRunning(false); }
  }

  async function askSuggestions() {
    setSuggesting(true); setSuggestionError(""); setSuggestions(null);
    try { const response = await getSuggestions({ world, ...(experiment?.id ? { experimentId: experiment.id } : {}) }); setSuggestions(response); }
    catch (error) { setSuggestionError(error.message); }
    finally { setSuggesting(false); }
  }

  function applySuggestion(suggestion) {
    const keys = Object.keys(suggestion.modification || {}), [suggestionKind] = keys;
    if (keys.length !== 1) { setSuggestionError("This idea changes more than one condition. Choose a single-variable suggestion before loading it."); return; }
    if (!kindOptions[world].some(([option]) => option === suggestionKind)) { setSuggestionError("This suggestion does not match a control supported by the selected world."); return; }
    setKind(suggestionKind); setModByWorld((current) => ({ ...current, [world]: { ...(current[world] || {}), ...suggestion.modification } })); setMessage("Suggestion loaded into the controls. Run it when you’re ready.");
  }

  async function askExplanation() {
    if (!experiment) return;
    setExplaining(true); setExplanationError("");
    try { setExplanation(await getExplanation({ experimentId: experiment.id })); }
    catch (error) { setExplanationError(error.message); }
    finally { setExplaining(false); }
  }

  const findings = experiment?.findings || [];
  const selected = findings.find((finding) => finding.id === selectedFinding) || null;
  const scenario = scene === "baseline" ? experiment?.baseline : experiment?.modified;
  const worldTitle = worlds.find((item) => item.id === world)?.name || titleCase(world);
  const worldIntroduction = {
    city: "Close a link or change its capacity, then trace routes, queues, and completed trips across this small city.",
    ecosystem: "Change plant supply, rainfall, or regeneration and follow how food availability moves through species populations.",
    unknown: "Change exchange or connection rules and inspect how resources and network structure shift among agents.",
  }[world];
  const baselineMetric = experiment?.baseline?.metrics || {};
  const modifiedMetric = experiment?.modified?.metrics || {};
  const diffMetric = comparison?.differences || experiment?.comparison || {};

  const selectRoad = (roadId) => { setKind("closeRoad"); const reopen = mod.closeRoad === roadId; updateMod({ closeRoad: reopen ? "" : roadId }); setMessage(reopen ? `Road ${roadId} removed from the intervention. Run the baseline to see the open-road result.` : `Road ${roadId} selected. Run the modified comparison to measure its effect.`); };
  const selectSpecies = (speciesId) => { setKind("removeSpecies"); updateMod({ removeSpecies: speciesId }); setMessage(`${speciesId} selected. Run the experiment to measure how removing it changes the food web.`); };
  const selectConnection = (connection) => { setKind("removeConnection"); updateMod({ removeConnection: connection }); setMessage(`Connection ${connection.join(" ↔ ")} selected. Run the experiment to measure the network response.`); };
  const inspectAgent = (agentId) => { setSelectedAgent(agentId); };

  return <div className={`lab-app world-${world}`}>
    <header className="topbar"><div className="brand"><ButterflyMark /><span>butterfly<span className="brand-exe">.exe</span></span></div><div className="topbar-center"><span className="live-dot" /> CONSEQUENCE LAB <span className="topbar-divider">/</span> SANDBOX 01</div><div className="topbar-status"><span className={`api-status ${health ? "is-online" : "is-offline"}`}><i />{health ? "API online" : "API unavailable"}</span><span className="topbar-separator" /><span className="provider-state">{health?.aiConfigured ? "Gemini configured" : "Rule-based suggestions"}</span></div></header>
    <main>
      {healthError && <div className="connect-error" role="alert"><span>Connection needed</span><p>{healthError}</p><button onClick={() => { getHealth().then((value) => { setHealth(value); setHealthError(""); }).catch((error) => setHealthError(error.message)); getWorlds().then((value) => { setWorlds(value.worlds || []); setWorldsError(""); }).catch((error) => setWorldsError(error.message)); refreshRecent(); }}>Retry connection</button></div>}
      {worldsError && <div className="connect-error" role="alert"><span>World list unavailable</span><p>{worldsError}</p><button onClick={() => getWorlds().then((value) => { setWorlds(value.worlds || []); setWorldsError(""); }).catch((error) => setWorldsError(error.message))}>Retry world list</button></div>}
      {!!worlds.length && <div className="world-tabs" role="tablist" aria-label="Choose a simulation world">{worlds.map((item, index) => <button key={item.id} role="tab" disabled={running || suggesting || explaining} aria-selected={world === item.id} className={`world-tab ${world === item.id ? "is-active" : ""}`} onClick={() => selectWorld(item.id)}><span className="world-index">0{index + 1}</span><span>{item.name}</span><span className="world-tab-mark">{world === item.id ? "●" : "○"}</span></button>)}</div>}
      <section className="intro-row"><div><div className="eyebrow">{worldTitle.toUpperCase()} <span>·</span> EXPERIMENT WINDOW</div><h1>Change one rule. Run the world. Discover the consequences.</h1><p>{worldIntroduction} Outcomes are measured in a simplified sandbox.</p></div><div className="intro-stats"><div><small>HORIZON</small><strong>{steps} <i>steps</i></strong></div><div><small>RUN SEED</small><strong>{seed}</strong></div><div><small>STORAGE</small><strong>{persistence}</strong></div></div></section>
      <section className="lab-grid" aria-label="Simulation workspace">
        <aside className="control-panel">
          <div className="panel-heading"><div className="section-overline">01 <span>EXPERIMENT CONTROLS</span></div><button className="reset-button" disabled={running} onClick={() => { setModByWorld((current) => ({ ...current, [world]: DEFAULT_MOD[world] })); setKind(DEFAULT_KIND[world]); setSteps(10); setSeed(42); setExperiment(null); setComparison(null); setScene("modified"); setBaselineReady(false); setSelectedFinding(null); setSelectedAgent(""); setMessage(""); setSuggestions(null); setExplanation(null); }} title="Reset controls and return to the initial scenario">Reset <span>↺</span></button></div>
          {worldError ? <div className="inline-error" role="alert">{worldError}<button onClick={() => { setWorldError(""); setWorldVersion((version) => version + 1); }}>Retry world</button></div> : !definition ? <div className="control-loading"><Spinner label="Loading world definition" /></div> : <>
            <div className="model-note"><span className="model-note-mark">◌</span><p>{definition.description}</p></div>
            <ModificationFields world={world} definition={definition} kind={kind} onKind={setKind} mod={mod} onMod={updateMod} />
            <div className="control-divider" />
            <label className="field-label">Simulation horizon <span className="range-readout">{steps} <small>steps</small></span><input className="range-input" aria-label="Simulation horizon in steps" type="range" min="1" max={definition.limits.maxSteps} value={steps} onChange={(event) => setSteps(Number(event.target.value))} /><span className="range-caption"><span>1 step</span><span>max {definition.limits.maxSteps}</span></span></label>
            <NumberField label="Reproduction seed" value={seed} min={0} max={4294967295} onChange={(value) => setSeed(Math.max(0, Math.min(4294967295, Math.trunc(value))))} suffix="uint32" />
            <button className="run-button" onClick={() => world === "city" && (!baselineReady || !Object.keys(activeModification).length) ? run({}, { baselineOnly: true }) : run()} disabled={!definition || running}>{running ? <Spinner label="Running model" /> : <><span>{world === "city" ? (!baselineReady || !Object.keys(activeModification).length ? "Run baseline" : "Run modified comparison") : "Run experiment"}</span><b>↗</b></>}</button>
            {world === "city" && baselineReady && Object.keys(activeModification).length > 0 && <p className="baseline-ready-note">Baseline saved for this run. The comparison starts from the same city and seed.</p>}
            <div className="repro-note"><span>⟲</span> Baseline and modified scenarios begin from the same state and seed.</div>
          </>}
        </aside>
        <section className="world-panel" aria-label={`${worldTitle} visualization`}>
          <div className="world-panel-head"><div><div className="section-overline">02 <span>WORLD STATE</span></div><h2>{worldTitle}<span className="world-state-tag">{experiment ? `${scene.toUpperCase()} SCENARIO` : "INITIAL CONDITIONS"}</span></h2></div><div className="scene-actions">{experiment && <div className="scene-toggle" role="group" aria-label="Choose scenario to view"><button className={scene === "baseline" ? "chosen" : ""} onClick={() => setScene("baseline")}>Baseline</button><button className={scene === "modified" ? "chosen" : ""} onClick={() => setScene("modified")}>Modified</button></div>}<button className="icon-reset" onClick={() => { setExperiment(null); setComparison(null); setScene("modified"); setSelectedFinding(null); setSelectedAgent(""); setBaselineReady(false); setExplanation(null); }} title="Return to initial conditions" aria-label="Reset world view">↺</button></div></div>
          <div className={`world-stage stage-${world}`}><WorldScene key={`${world}-${experiment?.id || "initial"}`} world={world} state={scenario?.finalState || definition?.initialState} referenceState={definition?.initialState} events={scenario?.events || []} trajectories={scenario?.trajectories || []} metrics={scenario?.metrics} scene={scene} timelineKey={experiment?.id || ""} selectedRoad={mod.closeRoad} selectedSpecies={mod.removeSpecies} selectedAgent={selectedAgent} selectedConnection={mod.removeConnection} empty={!definition} onSelectRoad={selectRoad} onSelectSpecies={selectSpecies} onSelectAgent={inspectAgent} onSelectConnection={selectConnection} /><div className="stage-overlay"><span><i />{experiment ? `${scene} run · seed ${experiment.parameters.seed}` : "READY TO SIMULATE"}</span>{experiment && <span>{scenario?.events?.length || 0} recorded events</span>}</div></div>
          <div className="stage-foot"><span>{definition?.rules?.[0] || "Loading simulation rules…"}</span><span className="stage-model">MODEL · BOUNDED</span></div>
        </section>
      </section>

      {message && <div className="notice-line" role="status"><span>!</span><p>{message}</p><button aria-label="Dismiss notice" onClick={() => setMessage("")}>×</button></div>}

      <section className={`discovery-section ${experiment ? "has-results" : "is-empty"}`} aria-live="polite">
        <div className="discovery-heading"><div><div className="section-overline">03 <span>DISCOVERIES</span></div><h2>The Surprise Detector</h2><p>Only significant differences measured in the simulation appear here.</p></div>{experiment && <div className="discovery-heading-actions"><span className="experiment-id">RUN {experiment.id.slice(0, 8).toUpperCase()}</span><button className="button button-quiet" onClick={askExplanation} disabled={explaining}>{explaining ? <Spinner label="Reading evidence" /> : "Explain measured results"}</button></div>}</div>
        {!experiment ? <div className="empty-discovery"><span className="empty-orbit"><i /><b /><em /></span><div><strong>No observations yet</strong><p>Adjust a world rule and run an experiment. Findings come from measured changes, never from a preview.</p></div><span className="empty-lock">AWAITING SIMULATION</span></div> : <>
          <div className="summary-strip"><div><small>{world === "city" ? "BASELINE COMPLETED" : world === "ecosystem" ? "BASELINE POPULATION" : "BASELINE SURVIVORS"}</small><strong>{metricValue(baselineMetric.completedTrips ?? baselineMetric.totalPopulation ?? baselineMetric.survivingAgents)}</strong><span>{world === "city" ? "trips" : world === "ecosystem" ? "total population" : "surviving agents"}</span></div><div className="summary-arrow">→</div><div><small>{world === "city" ? "MODIFIED RESULT" : world === "ecosystem" ? "MODIFIED POPULATION" : "MODIFIED SURVIVORS"}</small><strong className="amber-text">{metricValue(modifiedMetric.completedTrips ?? modifiedMetric.totalPopulation ?? modifiedMetric.survivingAgents)}</strong><span>{world === "city" ? "trips" : world === "ecosystem" ? "total population" : "surviving agents"}</span></div><div className="summary-divider" /><div className="surprise-count"><strong>{findings.length.toString().padStart(2, "0")}</strong><span>threshold findings</span></div><div className="summary-score"><small>HEURISTIC SIGNAL</small><strong>{formatNumber(experiment.summary?.surpriseScore || 0, 2)}</strong></div></div>
          <div className="result-grid"><div className="result-left"><div className="result-section-title"><div><div className="section-overline">MEASURED COMPARISON</div><h3>What moved?</h3></div><span>actual engine output</span></div><MetricTable differences={diffMetric} /><TrajectoryPlot world={world} experiment={experiment} />
            <div className="event-log"><div className="result-section-title"><div><div className="section-overline">RECORDED TRANSITIONS</div><h3>Event log</h3></div><span>{(scenario?.events || []).length} events · {scene}</span></div><div className="event-list">{(scenario?.events || []).slice(0, 10).map((event, index) => <div className="event-row" key={`${event.type}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{titleCase(event.type.replaceAll("_", " "))}</strong><small>step {event.step}</small><code>{event.roadId || event.speciesId || event.commuterId || event.agents?.join("↔") || event.evidence || "state transition"}</code></div>)}{!scenario?.events?.length && <p className="muted-note">No discrete events were recorded for this scenario.</p>}</div></div>
          </div>
          <div className="findings-block"><div className="result-section-title"><div><div className="section-overline">SURPRISE DETECTOR · THRESHOLD {formatNumber(experiment.parameters?.surpriseThreshold || 0.15, 2)}</div><h3>Unexpected effects</h3></div><span>heuristic · not scientifically calibrated</span></div>
            {findings.length ? <div className="findings-layout"><div className="finding-list">{findings.map((finding, index) => <button className={`finding-item ${selectedFinding === finding.id ? "is-selected" : ""}`} key={finding.id} onClick={() => setSelectedFinding(finding.id)}><span className="finding-count">{String(index + 1).padStart(2, "0")}</span><span className="finding-main"><strong>{finding.whatChanged}</strong><small>{finding.flaggedBecause}</small><span className="finding-tags"><i>OBSERVED CHANGE</i><i className={finding.evidenceStatus === "candidate_explanation" ? "tag-candidate" : "tag-unverified"}>{finding.evidenceStatus === "candidate_explanation" ? "CANDIDATE MECHANISM" : "UNVERIFIED HYPOTHESIS"}</i></span></span><span className="finding-delta">{finding.values?.absoluteDifference > 0 ? "+" : ""}{metricValue(finding.values?.absoluteDifference)}<small>{finding.values?.percentageDifference === null ? "no % baseline" : `${formatNumber(finding.values?.percentageDifference, 1)}%`}</small></span></button>)}</div><FindingDetail finding={selected} onInvestigate={askSuggestions} /></div> : <div className="no-findings"><span>∅</span><div><strong>No changes crossed the surprise threshold.</strong><p>Measured differences are still shown above. Try another intervention and compare a new run.</p></div></div>}
          </div>
          </div>
          {(explanation || explanationError) && <div className="explanation-panel">{explanationError ? <p role="alert">{explanationError}</p> : <><div className="section-overline">EVIDENCE-BOUND EXPLANATION · {explanation.mode?.replaceAll("_", " ").toUpperCase()}</div><p>{explanation.note || "Explanation returned with its source findings."}</p>{(explanation.explanations || []).map((item, index) => <article key={`${item.metric}-${index}`}><strong>{titleCase(item.metric)}</strong><p>{item.text}</p><small>{item.evidenceStatus?.replaceAll("_", " ")}</small></article>)}{(explanation.explanation || []).map((item, index) => <article key={`${item.metric}-${index}`}><strong>{titleCase(item.metric)}</strong><p>{item.candidateExplanation}</p><small>{item.evidenceStatus?.replaceAll("_", " ")}</small></article>)}</>}</div>}
        </>}
      </section>

      <section className="experiment-ideas"><div className="ideas-copy"><div className="section-overline">04 <span>INVESTIGATE</span></div><h2>What else could happen?</h2><p>Request a few valid next experiments. Suggestions are hypotheses until you choose to run them.</p><button className="button button-outline" onClick={askSuggestions} disabled={suggesting || !definition}>{suggesting ? <Spinner label="Thinking" /> : "Suggest an experiment"}<span>↗</span></button></div><div className="ideas-results">{suggestionError ? <div className="inline-error" role="alert">{suggestionError}<button onClick={askSuggestions}>Retry</button></div> : suggestions?.suggestions?.length ? <><div className="suggestion-mode">{suggestions.mode === "gemini" ? "GEMINI SUGGESTION · HYPOTHESIS" : suggestions.mode === "deterministic_fallback" ? "GEMINI UNAVAILABLE · RULE-BASED FALLBACK" : "RULE-BASED SUGGESTION · HYPOTHESIS"}</div><div className="suggestion-list">{suggestions.suggestions.map((suggestion, index) => <article className="suggestion-item" key={`${index}-${suggestion.hypothesis}`}><span>0{index + 1}</span><div><p>{suggestion.hypothesis}</p><code>{JSON.stringify(suggestion.modification)}</code></div><button aria-label={`Load suggestion: ${suggestion.hypothesis}`} onClick={() => applySuggestion(suggestion)}>Load ↗</button></article>)}</div><small className="suggestion-note">{suggestions.note}</small></> : <div className="ideas-idle">Suggestions use supported world parameters. Nothing runs until you choose an idea and press Run experiment.</div>}</div></section>

      <section className="recent-section"><div className="section-overline">SESSION MEMORY <span>·</span> LAST 25 RUNS</div><div className="recent-heading"><h2>Recent experiments</h2><button className="text-button" onClick={() => refreshRecent()} aria-label="Refresh recent experiments">Refresh ↻</button></div>{recentError ? <p className="recent-error">{recentError}</p> : recent.length ? <div className="recent-list">{recent.slice(0, 5).map((item) => <button className={`recent-item ${experiment?.id === item.id ? "is-current" : ""}`} key={item.id} onClick={() => openRecent(item.id)} disabled={running}><span className="recent-world">{titleCase(item.world)}</span><span className="recent-change">{Object.keys(item.parameters?.modification || {}).map(titleCase).join(" · ") || "Baseline"}</span><span className="recent-time">{new Date(item.createdAt).toLocaleString()}</span><span className="recent-arrow">↗</span></button>)}</div> : <p className="recent-empty">No runs yet. Your completed experiments will appear here while the backend retains them.</p>}</section>
      <footer className="footer"><span><ButterflyMark /> BUTTERFLY.EXE</span><p>Outcomes are simulated, bounded and illustrative. They do not predict real-world results.</p><span>SEED YOUR CURIOSITY <i>✳</i></span></footer>
    </main>
  </div>;
}
