/* daikin-flow-card — animated hydraulic schematic for a Daikin Altherma in Home Assistant.
 * Plain custom element, no build step.
 * Data sources: the ESPHome Altherma device on X10A (live: flow, return temp, compressor, defrost) and the
 * Daikin Onecta cloud integration (controls, kWh counters, fallback temperatures).
 * Heat output = flow x (leaving - return) x 4.186 / 60. COP needs an electrical power sensor (`power_entity`, W or kW).
 * https://github.com/toldenburger/daikin_flow_card — MIT licence.
 */
const DEFAULTS = {
  title: null, // null = "Heat pump" in the card language
  language: "en", // "en" or "nl"
  water_heater: "water_heater.altherma",
  climate_room: "climate.altherma_room_temperature",
  climate_offset: "climate.altherma_leaving_water_offset",
  // Onecta (cloud) — used for controls and as fallback when the ESP is unavailable
  tank_temp: "sensor.altherma_domestichotwatertank_tank_temperature",
  leaving_water: "sensor.altherma_climatecontrol_leaving_water_temperature",
  outdoor_temp: "sensor.altherma_climatecontrol_outdoor_temperature",
  room_temp: "sensor.altherma_climatecontrol_room_temperature",
  powerful: "binary_sensor.altherma_domestichotwatertank_is_powerful_mode_active",
  setpoint_mode: "sensor.altherma_climatecontrol_setpoint_mode",
  control_mode: "sensor.altherma_climatecontrol_control_mode",
  ratelimit: "sensor.altherma_gateway_ratelimit_remaining_day",
  errors: [
    "binary_sensor.altherma_climatecontrol_is_in_error_state",
    "binary_sensor.altherma_domestichotwatertank_is_in_error_state",
    "binary_sensor.altherma_climatecontrol_is_in_emergency_state",
  ],
  warnings: [
    "binary_sensor.altherma_climatecontrol_is_in_warning_state",
    "binary_sensor.altherma_domestichotwatertank_is_in_warning_state",
  ],
  kwh: {
    day: [
      "sensor.altherma_climatecontrol_heating_daily_electrical_consumption",
      "sensor.altherma_climatecontrol_cooling_daily_electrical_consumption",
      "sensor.altherma_domestichotwatertank_heating_daily_electrical_consumption",
    ],
    week: [
      "sensor.altherma_climatecontrol_heating_weekly_electrical_consumption",
      "sensor.altherma_climatecontrol_cooling_weekly_electrical_consumption",
      "sensor.altherma_domestichotwatertank_heating_weekly_electrical_consumption",
    ],
    month: [
      "sensor.altherma_climatecontrol_heating_monthly_electrical_consumption",
      "sensor.altherma_climatecontrol_cooling_monthly_electrical_consumption",
      "sensor.altherma_domestichotwatertank_heating_monthly_electrical_consumption",
    ],
    year: [
      "sensor.altherma_climatecontrol_heating_yearly_electrical_consumption",
      "sensor.altherma_climatecontrol_cooling_yearly_electrical_consumption",
      "sensor.altherma_domestichotwatertank_heating_yearly_electrical_consumption",
    ],
  },
  // Optional extras; leave null to hide them.
  price: null, // electricity price, EUR/kWh (e.g. a Tibber price sensor)
  pv: null, // solar power, W
  grid: null, // grid import, W
  grid_export: null, // grid export, W
  // ESPHome Altherma (X10A) — live data
  esp: {
    tank_temp: "sensor.altherma_esp_dhw_tank_temp_r5t",
    leaving_water: "sensor.altherma_esp_leaving_water_temp_after_buh_r2t",
    leaving_before_buh: "sensor.altherma_esp_leaving_water_temp_before_buh_r1t",
    return_water: "sensor.altherma_esp_inlet_water_temp_r4t",
    lw_setpoint: "sensor.altherma_esp_lw_setpoint_main",
    flow: "sensor.altherma_esp_flow_sensor_l_min",
    outdoor: "sensor.altherma_esp_outdoor_air_temp_r1t",
    compressor: "sensor.altherma_esp_inv_frequency_rps",
    current: "sensor.altherma_esp_inv_primary_current_a",
    pressure: "sensor.altherma_esp_water_pressure_bar",
    pump: "sensor.altherma_esp_water_pump_signal_0_max_100_stop",
    discharge: "sensor.altherma_esp_discharge_pipe_temp",
    heat_exchanger: "sensor.altherma_esp_heat_exchanger_mid_temp",
    liquid: "sensor.altherma_esp_refrig_temp_liquid_side_r3t",
    op_mode: "sensor.altherma_esp_i_u_operation_mode",
    error_code: "sensor.altherma_esp_error_code",
    defrost: "binary_sensor.altherma_esp_defrost_operation",
    valve_dhw: "binary_sensor.altherma_esp_3way_valve_on_dhw_off_space",
    buh1: "binary_sensor.altherma_esp_buh_step1",
    buh2: "binary_sensor.altherma_esp_buh_step2",
  },
  // Electrical power of the heat pump in W (or kW): a real meter (Shelly, CT clamp) or a template estimate.
  // Set power_is_estimate: true for an estimate, so the card marks the COP with "≈".
  power_entity: null,
  power_is_estimate: false,
  cop_day: null, // energy-weighted COP for today (optional)
  min_flow: 0.5, // l/min above which water is considered to be flowing
  dhw_step: 1,
};

const STRINGS = {
  en: {
    title: "Heat pump", standby: "Standby", fault: "Fault", defrost: "Defrost", dhw: "Hot water", heating: "Heating",
    circulating: "Circulating", heating_off: "Heating off", backup: "Backup heater", boost: "Boost",
    inferred: "inferred", inferred_tip: "ESP unavailable; activity is inferred from temperatures",
    aria: "Diagram of heat pump, hot water tank and floor heating", pv: "Solar", grid: "Grid", export: "Export",
    outdoor: "Outdoor", flow: "Flow", ret: "Return", target: "Target", off: "Off", on: "On", room: "Room",
    tank_target: "Tank target", room_target: "Room target", tank: "Tank", lower: "lower", higher: "higher",
    heat_now: "heat now", cop_now: "COP now", cop_need: "COP (needs meter)", est: "(est.)", flow_rate: "flow rate",
    today: "today", week: "week", month: "month", year: "year", cost_today: "cost today", cop_today: "COP today",
    note: "Daikin counts whole kWh; “today” lags behind the cloud.", esp_down: " ESP unreachable: live values missing.",
    details: "Details", d_lw_after: "Leaving water (after backup heater)", d_lw_before: "Leaving water (before backup heater)",
    d_ret: "Return water", d_lw_set: "Leaving water setpoint", d_out: "Outdoor temperature", d_room: "Room temperature",
    d_tank: "Tank temperature", d_press: "Water pressure", d_comp: "Compressor", comp_off: "off",
    d_power: "Electrical power", d_current: "Inverter current", d_discharge: "Discharge pipe", d_hx: "Heat exchanger",
    d_liquid: "Refrigerant liquid side", d_pump: "Pump signal (100 = stop)", d_opmode: "Operation mode",
    d_err: "Error code", d_spmode: "Setpoint mode", d_ctlmode: "Control mode", d_offset: "Leaving water offset",
    d_calls: "Onecta calls left today",
  },
  nl: {
    title: "Warmtepomp", standby: "Standby", fault: "Storing", defrost: "Ontdooien", dhw: "Warm water", heating: "Verwarmen",
    circulating: "Circulatie", heating_off: "Verwarming uit", backup: "Bijverwarming", boost: "Boost",
    inferred: "afgeleid", inferred_tip: "ESP niet beschikbaar; activiteit is afgeleid uit temperaturen",
    aria: "Schema warmtepomp, boiler en vloerverwarming", pv: "PV", grid: "Net", export: "Teruglevering",
    outdoor: "Buiten", flow: "Aanvoer", ret: "Retour", target: "Doel", off: "Uit", on: "Aan", room: "Kamer",
    tank_target: "Boiler doel", room_target: "Kamer doel", tank: "Boiler", lower: "lager", higher: "hoger",
    heat_now: "warmte nu", cop_now: "COP nu", cop_need: "COP (meter nodig)", est: "(schatting)", flow_rate: "debiet",
    today: "vandaag", week: "week", month: "maand", year: "jaar", cost_today: "kosten vandaag", cop_today: "COP vandaag",
    note: "Daikin telt in hele kWh; “vandaag” loopt achter op de cloud.", esp_down: " ESP niet bereikbaar: livewaarden ontbreken.",
    details: "Details", d_lw_after: "Aanvoer (na bijverwarming)", d_lw_before: "Aanvoer (voor bijverwarming)",
    d_ret: "Retour", d_lw_set: "Aanvoer streefwaarde", d_out: "Buitentemperatuur", d_room: "Kamertemperatuur",
    d_tank: "Boilertemperatuur", d_press: "Waterdruk", d_comp: "Compressor", comp_off: "uit",
    d_power: "Elektrisch vermogen", d_current: "Stroom omvormer", d_discharge: "Persgas", d_hx: "Warmtewisselaar",
    d_liquid: "Vloeistofzijde koudemiddel", d_pump: "Pompsignaal (100 = stop)", d_opmode: "Bedrijfsmodus",
    d_err: "Foutcode", d_spmode: "Setpoint-modus", d_ctlmode: "Regelmodus", d_offset: "Offset aanvoer",
    d_calls: "Onecta-calls over vandaag",
  },
};

const CP = 4.186 / 60; // kW per (l/min * K)

const num = (s) => {
  if (!s) return null;
  const v = parseFloat(s.state);
  return Number.isFinite(v) ? v : null;
};
const fmt = (v, d = 0, u = "") => (v === null || v === undefined ? "–" : `${v.toFixed(d)}${u}`);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// click-for-more-info attributes, only when an entity is configured
const more = (ent) => (ent ? `data-act="more" data-entity="${esc(ent)}"` : "");

// 15 °C blue -> 55 °C orange-red
function tempColor(t) {
  if (t === null || t === undefined) return "#8a8f98";
  const k = Math.max(0, Math.min(1, (t - 15) / 40));
  const stops = [[0, [41, 182, 246]], [0.45, [255, 193, 7]], [1, [244, 81, 30]]];
  let a = stops[0], b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) if (k >= stops[i][0] && k <= stops[i + 1][0]) { a = stops[i]; b = stops[i + 1]; }
  const f = (k - a[0]) / (b[0] - a[0] || 1);
  return `rgb(${a[1].map((c, i) => Math.round(c + (b[1][i] - c) * f)).join(",")})`;
}

class DaikinFlowCard extends HTMLElement {
  setConfig(config) {
    this._cfg = {
      ...DEFAULTS, ...config,
      kwh: { ...DEFAULTS.kwh, ...(config.kwh || {}) },
      esp: { ...DEFAULTS.esp, ...(config.esp || {}) },
    };
    this._t = STRINGS[this._cfg.language] || STRINGS.en;
    this._uid = "dfc" + Math.random().toString(36).slice(2, 7);
    this._key = null;
    this._detailsOpen = false;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      this.shadowRoot.addEventListener("click", (e) => this._click(e));
    }
  }

  getCardSize() { return 6; }
  static getStubConfig() { return {}; }

  set hass(hass) {
    this._hass = hass;
    const c = this._cfg;
    const ids = [c.water_heater, c.climate_room, c.climate_offset, c.tank_temp, c.leaving_water, c.outdoor_temp,
      c.room_temp, c.powerful, c.setpoint_mode, c.control_mode, c.ratelimit, c.price, c.pv, c.grid, c.grid_export,
      c.power_entity, c.cop_day, ...c.errors, ...c.warnings, ...Object.values(c.esp), ...Object.values(c.kwh).flat()];
    const key = ids.filter(Boolean).map((i) => {
      const s = hass.states[i];
      return s ? s.state + (s.attributes && s.attributes.temperature) : "x";
    }).join("|") + this._detailsOpen;
    if (key === this._key) return;
    this._key = key;
    this._render();
  }

  _s(id) { return id ? this._hass.states[id] : undefined; }
  _n(id) { return num(this._s(id)); }
  _pick(...ids) {
    for (const id of ids) { const v = this._n(id); if (v !== null) return v; }
    return null;
  }
  _sum(list) {
    let t = 0, any = false;
    for (const id of list) { const v = this._n(id); if (v !== null) { t += v; any = true; } }
    return any ? t : null;
  }
  _on(id) {
    const s = this._s(id);
    if (!s || ["unknown", "unavailable"].includes(s.state)) return null;
    return s.state === "on";
  }
  _text(id) {
    const s = this._s(id);
    return s && !["unknown", "unavailable"].includes(s.state) ? s.state : "–";
  }

  _click(e) {
    const t = e.target.closest("[data-act]");
    if (!t) return;
    const c = this._cfg, h = this._hass, act = t.dataset.act;
    if (act === "more") {
      this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: t.dataset.entity } }));
    } else if (act === "details") {
      this._detailsOpen = !this._detailsOpen; this._key = null; this.hass = h;
    } else if (act === "dhw") {
      const wh = this._s(c.water_heater);
      const cur = wh && wh.attributes.temperature;
      if (cur != null) h.callService("water_heater", "set_temperature", { entity_id: c.water_heater, temperature: cur + Number(t.dataset.d) * c.dhw_step });
    } else if (act === "room") {
      const cl = this._s(c.climate_room);
      const cur = cl && cl.attributes.temperature;
      if (cur != null) h.callService("climate", "set_temperature", { entity_id: c.climate_room, temperature: cur + Number(t.dataset.d) * 0.5 });
    } else if (act === "dhwpower") {
      const wh = this._s(c.water_heater);
      if (wh) h.callService("water_heater", "set_operation_mode", { entity_id: c.water_heater, operation_mode: wh.state === "off" ? "heat_pump" : "off" });
    }
  }

  _render() {
    const c = this._cfg, E = c.esp, T = this._t, S = (i) => this._s(i), N = (i) => this._n(i);
    const wh = S(c.water_heater), cl = S(c.climate_room), off = S(c.climate_offset);

    // live ESP values, Onecta as fallback
    const tank = this._pick(E.tank_temp, c.tank_temp);
    const vl = this._pick(E.leaving_water, c.leaving_water);
    const rl = N(E.return_water);
    const flow = N(E.flow);
    const out = this._pick(E.outdoor, c.outdoor_temp);
    const room = N(c.room_temp);
    const freq = N(E.compressor);
    const espOk = flow !== null;

    const dhwTarget = wh && wh.attributes.temperature != null ? wh.attributes.temperature : null;
    const roomTarget = cl && cl.attributes.temperature != null ? cl.attributes.temperature : null;
    const offVal = off && off.attributes.temperature != null ? off.attributes.temperature : null;
    const dhwOn = wh && wh.state !== "off" && wh.state !== "unavailable";
    const powerful = this._on(c.powerful);
    const errCode = N(E.error_code);
    const err = c.errors.some((e) => this._on(e)) || (errCode !== null && errCode !== 0);
    const warn = c.warnings.some((e) => this._on(e));
    const defrost = this._on(E.defrost) === true;
    const buh = this._on(E.buh1) === true || this._on(E.buh2) === true;
    const valveDhw = this._on(E.valve_dhw);

    // activity: real when the ESP answers, otherwise inferred from Onecta
    const running = freq !== null && freq > 0;
    const flowing = flow !== null && flow > c.min_flow;
    let dhw, heat, inferred = false;
    if (espOk) {
      dhw = flowing && valveDhw === true;
      heat = flowing && valveDhw === false;
    } else {
      inferred = true;
      const tgt = dhwTarget;
      dhw = !!(dhwOn && tank !== null && tgt !== null && tank < tgt - 0.5);
      heat = !!(cl && cl.state !== "off" && !dhw && vl !== null && room !== null && vl > room + 2);
    }
    const active = dhw || heat;

    // heat output and COP
    // only while something actually heats: supply/return sensors differ by ~0.3 K when idle
    const heatKw = flowing && (running || buh) && vl !== null && rl !== null ? Math.max(0, flow * (vl - rl) * CP) : null;
    let power = N(c.power_entity);
    const pe = S(c.power_entity);
    if (power !== null && pe && pe.attributes.unit_of_measurement === "kW") power *= 1000;
    const cop = heatKw !== null && heatKw > 0 && power !== null && power > 100 ? heatKw / (power / 1000) : null;

    const pv = N(c.pv), gridIn = N(c.grid), gridOut = N(c.grid_export);
    const grid = gridIn === null ? null : gridIn - (gridOut || 0);
    const kwhDay = this._sum(c.kwh.day), kwhWeek = this._sum(c.kwh.week), kwhMonth = this._sum(c.kwh.month), kwhYear = this._sum(c.kwh.year);
    const price = N(c.price);
    const costDay = kwhDay !== null && price !== null ? kwhDay * price : null;
    const rl_ = S(c.ratelimit);
    const press = N(E.pressure);
    const copDay = N(c.cop_day);
    const est = c.power_is_estimate;

    const hot = tempColor(vl), cold = tempColor(rl !== null ? rl : vl !== null ? vl - 5 : null);
    const id = this._uid;
    const dur = flowing ? Math.max(0.45, Math.min(2.2, 2.2 - flow * 0.1)) : 1;
    const pipe = (on, col) => (on ? col : "var(--divider-color, #8885)");

    let status = T.standby, statusCls = "ok";
    if (err) { status = T.fault; statusCls = "bad"; }
    else if (defrost) { status = T.defrost; statusCls = "def"; }
    else if (dhw) { status = T.dhw; statusCls = "run"; }
    else if (heat) { status = T.heating; statusCls = "run"; }
    else if (flowing) { status = T.circulating; statusCls = "ok"; }
    else if (cl && cl.state === "off") status = T.heating_off;
    if (!err && warn && !active) statusCls = "warn";
    if (err && active) statusCls = "bad";

    const tile = (v, l, ent) => `<div class="tile" ${more(ent)}><b>${v}</b><span>${l}</span></div>`;
    const row = (l, v, ent) => `<div class="row" ${more(ent)}><span>${l}</span><b>${v}</b></div>`;
    const st = (i) => esc(this._text(i));

    const gradTop = tank !== null ? tempColor(tank + 4) : "#888", gradBot = tank !== null ? tempColor(tank - 14) : "#888";
    const waves = heat ? `<g class="wave" stroke="${hot}"><path d="M512 188 q4 -6 0 -12 t0 -12"/><path d="M526 188 q4 -6 0 -12 t0 -12"/><path d="M540 188 q4 -6 0 -12 t0 -12"/></g>` : "";
    const hpStroke = defrost ? "#29b6f6" : active ? "#ff8a65" : "var(--divider-color)";
    const hpState = defrost ? T.defrost : dhw ? T.dhw : heat ? T.heating : T.standby;
    const sources = (c.pv ? `<g ${more(c.pv)}><circle cx="50" cy="38" r="22" fill="none" stroke="#f9a825" stroke-width="2"/><text x="50" y="43" text-anchor="middle" font-size="16">☀</text><text x="50" y="76" text-anchor="middle" class="sub">${T.pv} ${fmt(pv, 0, " W")}</text></g>` : "")
      + (c.grid ? `<g ${more(c.grid)}><circle cx="${c.pv ? 130 : 50}" cy="38" r="22" fill="none" stroke="#78909c" stroke-width="2"/><text x="${c.pv ? 130 : 50}" y="43" text-anchor="middle" font-size="14">⚡</text><text x="${c.pv ? 130 : 50}" y="76" text-anchor="middle" class="sub">${grid !== null && grid < 0 ? T.export : T.grid} ${fmt(grid === null ? null : Math.abs(grid), 0, " W")}</text></g>` : "");
    const copLabel = c.power_entity ? `${T.cop_now}${est ? " " + T.est : ""}` : T.cop_need;

    this.shadowRoot.innerHTML = `
<style>
:host{display:block}
ha-card{padding:16px;overflow:hidden}
.head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px;flex-wrap:wrap}
.title{font-size:1.2em;font-weight:500}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chip{padding:3px 10px;border-radius:14px;font-size:.8em;background:var(--secondary-background-color);color:var(--primary-text-color)}
.chip.run{background:#ff8a6533;color:#e64a19}.chip.ok{background:#66bb6a33;color:#2e7d32}
.chip.warn{background:#ffca2833;color:#b28704}.chip.bad{background:#e5393533;color:#c62828}
.chip.def{background:#29b6f633;color:#0288d1}
.chip.est{opacity:.7}
.body{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:16px}
@media(max-width:760px){.body{grid-template-columns:1fr}}
svg{width:100%;height:auto;display:block}
svg text{fill:var(--primary-text-color);font-family:inherit}
.sub{font-size:10px;fill:var(--secondary-text-color)!important}
.big{font-size:20px;font-weight:600}
.lbl{font-size:12px;font-weight:500}
.pipe{fill:none;stroke-width:7;stroke-linecap:round;stroke-linejoin:round}
.flow{fill:none;stroke:#fff;stroke-opacity:0;stroke-width:2.5;stroke-dasharray:2 9;stroke-linecap:round}
.flow.on{stroke-opacity:.9;animation:dash var(--dur,1s) linear infinite}
@keyframes dash{to{stroke-dashoffset:-22}}
.wave{fill:none;stroke-width:1.6;stroke-linecap:round;opacity:0;animation:wv 2.4s ease-in infinite}
.wave path:nth-child(2){animation-delay:.4s}
@keyframes wv{0%{opacity:0;transform:translateY(6px)}40%{opacity:.8}100%{opacity:0;transform:translateY(-8px)}}
.pulse{animation:pl 2s ease-in-out infinite}
@keyframes pl{50%{opacity:.55}}
.fan{transform-origin:92px 211px;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
[data-act]{cursor:pointer}
@media(prefers-reduced-motion:reduce){.flow.on,.wave,.pulse,.fan{animation:none}}
.side{display:flex;flex-direction:column;gap:10px}
.ctl{display:flex;flex-wrap:wrap;gap:8px}
.pill{display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:18px;background:var(--secondary-background-color);font-size:.85em}
.pill button{border:0;background:var(--primary-color);color:var(--text-primary-color,#fff);width:24px;height:24px;border-radius:50%;font-size:15px;line-height:1;cursor:pointer}
.pill button.t{width:auto;padding:0 10px;border-radius:12px;font-size:.9em}
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.tile{background:var(--secondary-background-color);border-radius:10px;padding:8px;display:flex;flex-direction:column;align-items:center;text-align:center}
.tile b{font-size:1.05em}.tile span{font-size:.7em;color:var(--secondary-text-color)}
.dh{cursor:pointer;display:flex;justify-content:space-between;color:var(--secondary-text-color);font-size:.9em;padding:2px 0;user-select:none}
.row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--divider-color);font-size:.85em}
.row span{color:var(--secondary-text-color)}
.note{font-size:.7em;color:var(--secondary-text-color)}
</style>
<ha-card>
  <div class="head">
    <div class="title">${esc(c.title || T.title)}</div>
    <div class="chips">
      <span class="chip ${statusCls}">${status}</span>
      ${buh ? `<span class="chip warn">${T.backup}</span>` : ""}
      ${powerful ? `<span class="chip warn">${T.boost}</span>` : ""}
      ${inferred ? `<span class="chip est" title="${T.inferred_tip}">${T.inferred}</span>` : ""}
    </div>
  </div>
  <div class="body">
  <svg viewBox="0 0 640 330" style="--dur:${dur.toFixed(2)}s" role="img" aria-label="${T.aria}">
    <defs>
      <linearGradient id="${id}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${gradTop}"/><stop offset="1" stop-color="${gradBot}"/></linearGradient>
      <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${hot}"/><stop offset="1" stop-color="${cold}"/></linearGradient>
    </defs>

    <!-- energy sources (optional) -->
    ${sources}

    <!-- pipes: leaving water (hot) top, return (cold) bottom; each segment animates only where water flows -->
    <path class="pipe" d="M170 205 H212" stroke="${pipe(active, hot)}"/>
    <path class="flow ${active ? "on" : ""}" d="M170 205 H212"/>
    <path class="pipe" d="M212 205 H470" stroke="${pipe(heat, hot)}"/>
    <path class="flow ${heat ? "on" : ""}" d="M212 205 H470"/>
    <path class="pipe" d="M470 255 H188" stroke="${pipe(heat, cold)}"/>
    <path class="flow ${heat ? "on" : ""}" d="M470 255 H188"/>
    <path class="pipe" d="M188 255 H170" stroke="${pipe(active, cold)}"/>
    <path class="flow ${active ? "on" : ""}" d="M188 255 H170"/>
    <!-- DHW branch via 3-way valve -->
    <path class="pipe" d="M212 205 V118 H258" stroke="${pipe(dhw, hot)}"/>
    <path class="flow ${dhw ? "on" : ""}" d="M212 205 V118 H258"/>
    <path class="pipe" d="M258 150 H188 V255" stroke="${pipe(dhw, cold)}"/>
    <path class="flow ${dhw ? "on" : ""}" d="M258 150 H188 V255"/>
    <circle cx="212" cy="205" r="11" fill="var(--card-background-color,#fff)" stroke="var(--primary-text-color)" stroke-width="2"/>
    <text x="212" y="209" text-anchor="middle" font-size="12">${dhw ? "↑" : "→"}</text>

    <!-- heat pump -->
    <g ${more(espOk ? E.compressor : c.leaving_water)}>
      <rect x="14" y="150" width="156" height="130" rx="12" fill="var(--secondary-background-color)" stroke="${hpStroke}" stroke-width="2.5" ${active || defrost ? 'class="pulse"' : ""}/>
      <text x="92" y="170" text-anchor="middle" class="lbl">${T.title}</text>
      <rect x="62" y="180" width="60" height="62" rx="6" fill="#2b2f36"/>
      <g stroke="#555b66" stroke-width="1.5">${[188, 196, 204, 212, 220, 228, 236].map((y) => `<line x1="68" x2="116" y1="${y}" y2="${y}"/>`).join("")}</g>
      ${running ? `<g class="fan" stroke="#9aa3b2" stroke-width="2.5" stroke-linecap="round"><line x1="80" y1="211" x2="104" y2="211"/><line x1="92" y1="199" x2="92" y2="223"/></g>` : ""}
      <text x="92" y="259" text-anchor="middle" class="sub">${T.outdoor} ${fmt(out, 1, " °C")}${running ? " · " + fmt(freq, 0, " rps") : ""}</text>
      <text x="92" y="272" text-anchor="middle" class="sub">${hpState}</text>
    </g>
    <text x="226" y="224" class="sub">${T.flow} ${fmt(vl, 1, " °C")}</text>
    ${rl !== null ? `<text x="226" y="272" class="sub">${T.ret} ${fmt(rl, 1, " °C")}</text>` : ""}
    ${flowing ? `<text x="330" y="224" class="sub">${fmt(flow, 1, " l/min")}${heatKw !== null && heatKw > 0 ? " · " + fmt(heatKw, 1, " kW") : ""}</text>` : ""}

    <!-- hot water tank -->
    <g ${more(E.tank_temp)}>
      <text x="298" y="30" text-anchor="middle" class="lbl">${T.dhw}</text>
      <rect x="258" y="40" width="80" height="140" rx="16" fill="url(#${id}t)" stroke="var(--divider-color)" stroke-width="2"/>
      <text x="298" y="112" text-anchor="middle" class="big" fill="#fff" style="fill:#fff;paint-order:stroke;stroke:#0006;stroke-width:3px">${fmt(tank, 0, " °C")}</text>
      <text x="298" y="196" text-anchor="middle" class="sub">${dhwOn ? T.target + " " + fmt(dhwTarget, 0, " °C") : T.off}${powerful ? " · boost" : ""}</text>
    </g>

    <!-- house -->
    <g ${more(c.climate_room)}>
      <path d="M420 95 L500 40 L580 95 V185 H420 Z" fill="var(--secondary-background-color)" stroke="var(--divider-color)" stroke-width="2"/>
      <text x="500" y="118" text-anchor="middle" class="lbl">${T.room}</text>
      <text x="500" y="146" text-anchor="middle" class="big">${fmt(room, 1, " °C")}</text>
      <text x="500" y="164" text-anchor="middle" class="sub">${T.target} ${fmt(roomTarget, 1, " °C")}</text>
    </g>
    ${waves}

    <!-- heating circuit -->
    <g ${more(c.climate_offset)}>
      <rect x="470" y="190" width="120" height="80" rx="8" fill="var(--secondary-background-color)" stroke="var(--divider-color)" stroke-width="2"/>
      ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${480 + i * 15}" y="198" width="9" height="64" rx="4" fill="url(#${id}r)" opacity="${heat ? 1 : 0.45}"/>`).join("")}
      <text x="530" y="288" text-anchor="middle" class="sub">${T.heating}${offVal !== null ? " · offset " + (offVal > 0 ? "+" : "") + offVal : ""}</text>
    </g>
  </svg>

  <div class="side">
    <div class="ctl">
      <div class="pill">${T.tank_target} <button data-act="dhw" data-d="-1" aria-label="${T.tank_target} ${T.lower}">−</button><b>${fmt(dhwTarget, 0, " °C")}</b><button data-act="dhw" data-d="1" aria-label="${T.tank_target} ${T.higher}">+</button></div>
      <div class="pill">${T.room_target} <button data-act="room" data-d="-1" aria-label="${T.room_target} ${T.lower}">−</button><b>${fmt(roomTarget, 1, " °C")}</b><button data-act="room" data-d="1" aria-label="${T.room_target} ${T.higher}">+</button></div>
      <div class="pill">${T.tank} <button class="t" data-act="dhwpower">${dhwOn ? T.on : T.off}</button></div>
    </div>
    <div class="tiles">
      ${tile(heatKw !== null && heatKw > 0 ? fmt(heatKw, 1, " kW") : "–", T.heat_now, E.flow)}
      ${tile(cop !== null ? (est ? "≈ " : "") + fmt(cop, 1) : "–", copLabel, c.power_entity)}
      ${tile(flow !== null ? fmt(flow, 1, " l/min") : "–", T.flow_rate, E.flow)}
      ${tile(fmt(kwhDay, 0, " kWh"), T.today, c.kwh.day[0])}
      ${tile(fmt(kwhWeek, 0, " kWh"), T.week, c.kwh.week[0])}
      ${tile(fmt(kwhMonth, 0, " kWh"), T.month, c.kwh.month[0])}
      ${c.price ? tile(costDay === null ? "–" : "€" + costDay.toFixed(2), T.cost_today, c.price) : ""}
      ${tile(fmt(kwhYear, 0, " kWh"), T.year, c.kwh.year[0])}
      ${c.cop_day ? tile(copDay !== null ? (est ? "≈ " : "") + fmt(copDay, 1) : "–", `${T.cop_today}${est ? " " + T.est : ""}`, c.cop_day) : ""}
    </div>
    <div class="note">${T.note}${espOk ? "" : T.esp_down}</div>
    <div class="dh" data-act="details"><span>${T.details} ${this._detailsOpen ? "▴" : "▾"}</span></div>
    ${this._detailsOpen ? `
      ${row(T.d_lw_after, fmt(vl, 1, " °C"), E.leaving_water)}
      ${row(T.d_lw_before, fmt(N(E.leaving_before_buh), 1, " °C"), E.leaving_before_buh)}
      ${row(T.d_ret, fmt(rl, 1, " °C"), E.return_water)}
      ${row(T.d_lw_set, fmt(N(E.lw_setpoint), 1, " °C"), E.lw_setpoint)}
      ${row(T.d_out, fmt(out, 1, " °C"), E.outdoor)}
      ${row(T.d_room, fmt(room, 1, " °C"), c.room_temp)}
      ${row(T.d_tank, fmt(tank, 1, " °C"), E.tank_temp)}
      ${row(T.d_press, fmt(press, 1, " bar"), E.pressure)}
      ${row(T.d_comp, running ? fmt(freq, 0, " rps") : T.comp_off, E.compressor)}
      ${c.power_entity ? row(`${T.d_power}${est ? " " + T.est : ""}`, power !== null ? fmt(power, 0, " W") : "–", c.power_entity) : ""}
      ${row(T.d_current, fmt(N(E.current), 1, " A"), E.current)}
      ${row(T.d_discharge, fmt(N(E.discharge), 1, " °C"), E.discharge)}
      ${row(T.d_hx, fmt(N(E.heat_exchanger), 1, " °C"), E.heat_exchanger)}
      ${row(T.d_liquid, fmt(N(E.liquid), 1, " °C"), E.liquid)}
      ${row(T.d_pump, fmt(N(E.pump), 0), E.pump)}
      ${row(T.d_opmode, st(E.op_mode), E.op_mode)}
      ${row(T.d_err, st(E.error_code), E.error_code)}
      ${row(T.d_spmode, st(c.setpoint_mode), c.setpoint_mode)}
      ${row(T.d_ctlmode, st(c.control_mode), c.control_mode)}
      ${row(T.d_offset, offVal === null ? "–" : String(offVal), c.climate_offset)}
      ${row(T.d_calls, esc(rl_ ? rl_.state : "–"), c.ratelimit)}` : ""}
  </div>
  </div>
</ha-card>`;
  }
}

if (!customElements.get("daikin-flow-card")) customElements.define("daikin-flow-card", DaikinFlowCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "daikin-flow-card", name: "Daikin flow card", description: "Animated Altherma hydraulic schematic (ESPHome Altherma + Onecta entities)" });
