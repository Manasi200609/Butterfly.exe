import { useCallback, useEffect, useRef, useState } from "react";
import { WorldRenderer } from "./world3d/renderer.js";
import "./world3d/world3d.css";

const EMPTY = [];
const number = (value, digits = 1) => value === null || value === undefined || !Number.isFinite(Number(value)) ? "—" : new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);

function readouts(world, state, metrics) {
  if (world === "city") return [
    ["COMPLETED", metrics?.completedTrips, metrics ? " / " + number(metrics.demand, 0) + " trips" : " trips"],
    ["AVG TRAVEL", metrics?.averageTravelTime, " steps"],
    ["QUEUE EVENTS", metrics?.congestionEvents, " recorded"],
    ["TOTAL DELAY", metrics?.totalDelay, " steps"],
  ];
  if (world === "ecosystem") {
    const population = metrics?.totalPopulation ?? state?.species?.reduce((sum, item) => sum + item.population, 0);
    return [
      ["PLANT RESOURCE", state?.resources?.plants, " / " + number(state?.resources?.carryingCapacity, 0) + " cap"],
      ["POPULATION", population, " across species"],
      ["SPECIES PRESENT", metrics?.speciesCount ?? state?.species?.length, ""],
      ["SURVIVAL", Number.isFinite(metrics?.survivalRate) ? number(metrics.survivalRate * 100, 0) + "%" : "—", ""],
    ];
  }
  return [
    ["AGENTS", state?.agents?.length, " nodes"],
    ["CONNECTIONS", state?.connections?.length, " links"],
    ["CONNECTED SETS", metrics?.connectedComponents, ""],
    ["RESOURCE INEQUALITY", metrics ? number(metrics.resourceInequality, 3) : "—", ""],
  ];
}

export function WorldScene({
  world, state, referenceState, events = EMPTY, trajectories = EMPTY, metrics, empty = false, scene = "modified", timelineKey = "",
  selectedRoad, selectedSpecies, selectedAgent, selectedConnection,
  onSelectRoad, onSelectSpecies, onSelectAgent, onSelectConnection,
}) {
  const canvasRef = useRef(null), rendererRef = useRef(null), callbacksRef = useRef({});
  const [error, setError] = useState("");
  const [playback, setPlayback] = useState({ step: 0, total: 0 });
  const [inspected, setInspected] = useState(null);
  callbacksRef.current = { onSelectRoad, onSelectSpecies, onSelectAgent, onSelectConnection };
  const handleRoad = useCallback((id) => callbacksRef.current.onSelectRoad?.(id), []);
  const handleSpecies = useCallback((id) => { setInspected({ type: "species", id }); callbacksRef.current.onSelectSpecies?.(id); }, []);
  const handleAgent = useCallback((id) => { setInspected({ type: "agent", id }); callbacksRef.current.onSelectAgent?.(id); }, []);
  const handleConnection = useCallback((pair) => { setInspected({ type: "connection", id: pair.join(" ↔ ") }); callbacksRef.current.onSelectConnection?.(pair); }, []);
  const handleStep = useCallback((step, total) => setPlayback({ step, total }), []);
  const rendererProps = {
    world, state, referenceState, events, trajectories, metrics, scene, timelineKey,
    selectedRoad, selectedSpecies, selectedAgent, selectedConnection,
    onSelectRoad: handleRoad, onSelectSpecies: handleSpecies, onSelectAgent: handleAgent, onSelectConnection: handleConnection, onPlaybackStep: handleStep,
  };

  useEffect(() => {
    if (!canvasRef.current || empty || !state) return undefined;
    try {
      const renderer = new WorldRenderer(canvasRef.current, rendererProps);
      rendererRef.current = renderer;
      setError("");
      return () => { renderer.dispose(); rendererRef.current = null; };
    } catch (cause) {
      setError(cause.message || "The 3D scene could not start.");
      return undefined;
    }
  // Canvas lifecycle is keyed by data availability. Data changes update the existing renderer below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empty, Boolean(state)]);

  useEffect(() => {
    rendererRef.current?.update(rendererProps);
  // renderer callbacks are stable; update scene data and selected entities without recreating the WebGL context.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, state, referenceState, events, trajectories, metrics, scene, timelineKey, selectedRoad, selectedSpecies, selectedAgent, selectedConnection]);

  useEffect(() => { setInspected(null); }, [world, scene, timelineKey]);

  const resetCamera = () => rendererRef.current?.resetCamera();
  const seek = (value) => rendererRef.current?.setPlaybackStep(Number(value));
  const values = readouts(world, state, metrics);
  let inspectedText = "";
  if (inspected?.type === "species") {
    const species = state?.species?.find((item) => item.id === inspected.id);
    if (species) inspectedText = inspected.id + " · population " + number(species.population, 2) + " · feeds on " + species.food;
  } else if (inspected?.type === "agent") {
    const agent = state?.agents?.find((item) => item.id === inspected.id);
    if (agent) inspectedText = inspected.id + " · " + number(agent.resource, 2) + " resource units";
  } else if (inspected?.type === "connection") inspectedText = "Connection " + inspected.id + " · select again to remove it in the experiment";
  const worldName = world === "city" ? "The City" : world === "ecosystem" ? "The Ecosystem" : "The Unknown";

  return <div className={"world-3d-view world-3d-" + world}>
    <div className="world-3d-topline">
      <span><i className="world-live-mark" />{scene === "baseline" ? "BASELINE" : scene === "modified" && timelineKey ? "MODIFIED OUTCOME" : "INITIAL STATE"}</span>
      <span>{trajectories.length ? "RECORDED STEP " + Math.min(trajectories.length, playback.step + 1) + " / " + trajectories.length : "LIVE WORLD STATE"}</span>
      <button type="button" onClick={resetCamera} aria-label="Reset 3D camera">Reset camera ↺</button>
    </div>
    <div className="world-3d-canvas-wrap">
      {empty || !state ? <div className="world-3d-loading" role="status">Loading {worldName.toLowerCase()}…</div> : error ? <div className="world-3d-error" role="alert"><strong>3D view unavailable</strong><span>{error}</span></div> : <canvas ref={canvasRef} className="world-3d-canvas" aria-label={worldName + " interactive 3D simulation scene"} />}
      <div className="world-3d-help"><span>DRAG · ORBIT</span><span>RIGHT DRAG · PAN</span><span>SCROLL · ZOOM</span></div>
      {inspectedText && <div className="world-3d-inspector" role="status">{inspectedText}<button type="button" onClick={() => setInspected(null)} aria-label="Close inspected entity">×</button></div>}
      {trajectories.length > 1 && <label className="world-3d-timeline">SIMULATION PLAYBACK
        <input type="range" min="0" max={trajectories.length - 1} step="1" value={Math.min(playback.step, trajectories.length - 1)} onChange={(event) => seek(event.target.value)} aria-label="Simulation playback step" />
        <span>STEP {Math.min(trajectories.length, playback.step + 1)} / {trajectories.length}</span>
      </label>}
    </div>
    <div className="world-3d-readouts">{values.map(([label, value, unit]) => <div key={label}><small>{label}</small><strong>{number(value, label === "RESOURCE INEQUALITY" ? 3 : 1)}<i>{unit}</i></strong></div>)}</div>
    <div className="world-3d-foot"><span>SELECT OBJECTS TO INSPECT OR CHANGE THE EXPERIMENT</span><span>WEBGL · SIMULATION-DERIVED</span></div>
  </div>;
}

export function formatNumber(value, digits = 1) { return number(value, digits); }
