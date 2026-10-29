/* @ds-bundle: {"format":4,"namespace":"Searly","components":[{"name":"Wordmark"},{"name":"Icon"},{"name":"Temp"},{"name":"Button"},{"name":"IconButton"},{"name":"SegmentedControl"},{"name":"HeatDial"},{"name":"ProbeZones"},{"name":"ConnectionPill"},{"name":"Battery"},{"name":"CookStatus"},{"name":"Notice"},{"name":"ApplyReceipt"},{"name":"TargetPicker"},{"name":"Sheet"},{"name":"ListGroup"},{"name":"ListRow"},{"name":"SegmentDisplay"},{"name":"DeviceG1"},{"name":"RetrySchedule"},{"name":"DebugLog"},{"name":"Screen"},{"name":"Phone"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef;

  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function useControlled(value, defaultValue, onChange) {
    var s = useState(defaultValue);
    var controlled = value !== undefined;
    return [controlled ? value : s[0], function (v) { if (!controlled) s[1](v); if (onChange) onChange(v); }];
  }

  /* Icons: 24px grid, 1.75 stroke, round caps and joins. */
  var ICONS = {
    bluetooth: ['M7 7.5l10 9-5 4.5V3l5 4.5-10 9'],
    'bluetooth-off': ['M7 7.5l3.5 3.15M13.6 13.6L17 16.5 12 21v-7.5M12 9.5V3l5 4.5-2.4 2.15', 'M3.5 3.5l17 17'],
    bolt: ['M13 2.5L5.5 13.5h6l-1 8 8-11h-6z'],
    probe: ['M2.5 12H12.8', 'M12.8 12l1.4-2h6.8a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-6.8z', 'M15.5 10v4M18.8 10v4'],
    dock: ['M5 10h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z', 'M12 3v9', 'M9 9l3 3 3-3'],
    thermometer: ['M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z', 'M12 15.5V9'],
    timer: ['M12 21a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z', 'M12 9.5v4l2.5 1.5', 'M9.5 2.5h5'],
    volume: ['M4 9.5h3.5L12 5.5v13l-4.5-4H4z', 'M15.5 9.2a4 4 0 0 1 0 5.6', 'M18.2 6.5a7.8 7.8 0 0 1 0 11'],
    'volume-low': ['M4 9.5h3.5L12 5.5v13l-4.5-4H4z', 'M15.5 9.2a4 4 0 0 1 0 5.6'],
    'volume-quiet': ['M4 9.5h3.5L12 5.5v13l-4.5-4H4z'],
    mute: ['M4 9.5h3.5L12 5.5v13l-4.5-4H4z', 'M16 9.5l5 5M21 9.5l-5 5'],
    sliders: ['M4 7h8.5M17.5 7H20M4 17h2.5M11.5 17H20', 'M15 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM9 19.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
    check: ['M5 12.5l4.5 4.5L19 7.5'],
    'check-circle': ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M8 12.2l2.8 2.8L16.2 9.5'],
    alert: ['M10.3 4.3L2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z', 'M12 9.5v4', 'M12 16.8v.2'],
    info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 11v5', 'M12 7.8v.2'],
    close: ['M6 6l12 12M18 6L6 18'],
    'chevron-right': ['M9.5 5.5L16 12l-6.5 6.5'],
    'chevron-down': ['M5.5 9.5L12 16l6.5-6.5'],
    plus: ['M12 5v14M5 12h14'],
    minus: ['M5 12h14'],
    refresh: ['M20 12a8 8 0 1 1-2.4-5.7', 'M20 4.5V9h-4.5'],
    unlink: ['M9.5 14.5l-2.3 2.3a3.2 3.2 0 0 1-4.5-4.5L5 10', 'M14.5 9.5l2.3-2.3a3.2 3.2 0 0 1 4.5 4.5L19 14', 'M3.5 3.5l17 17'],
    terminal: ['M4 6.5l5 5.5-5 5.5', 'M12 18h8'],
    'cloud-off': ['M7 18.5h9.5M20.5 15.5A4.2 4.2 0 0 0 17 10.1 6 6 0 0 0 8.9 6.2', 'M5.6 8.3A4.5 4.5 0 0 0 7 18.5', 'M3.5 3.5l17 17'],
    phone: ['M8 2.5h8a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2z', 'M11 18.5h2'],
    pencil: ['M14.5 5.5l4 4L8.5 19.5H4.5v-4z', 'M12.5 7.5l4 4'],
    copy: ['M9 9h10.5v10.5H9z', 'M15 9V4.5H4.5V15H9'],
    search: ['M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M15.5 15.5L20.5 20.5'],
    settings: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h0a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v0a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z'],
    lock: ['M6.5 10.5h11a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-7a1.5 1.5 0 0 1 1.5-1.5z', 'M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3']
  };

  function Icon(p) {
    var size = p.size || 24, paths = ICONS[p.name] || [];
    return h('svg', { className: cx('sr-icon', p.className), width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: p.strokeWidth || 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', role: p.title ? 'img' : undefined, 'aria-hidden': p.title ? undefined : true, 'aria-label': p.title },
      paths.map(function (d, i) { return h('path', { key: i, d: d }); }));
  }

  /* The mark: a 270 degree dial with the reading's bead near the top right. */
  function Mark(p) {
    return h('svg', { viewBox: '0 0 32 32', 'aria-hidden': true },
      h('path', { d: 'M8.22 23.78A11 11 0 1 1 23.78 23.78', fill: 'none', stroke: 'var(--line-strong)', strokeWidth: 3.6, strokeLinecap: 'round' }),
      h('path', { d: 'M8.22 23.78A11 11 0 1 1 24.9 9.53', fill: 'none', stroke: 'var(--sear)', strokeWidth: 3.6, strokeLinecap: 'round' }),
      h('circle', { cx: 24.9, cy: 9.53, r: 3.4, fill: 'var(--ink)' }));
  }
  function Wordmark(p) {
    return h('span', { className: cx('sr-wordmark', p.className), style: p.size ? { fontSize: p.size } : undefined, role: 'img', 'aria-label': 'Searly' },
      h(Mark), p.markOnly ? null : h('span', { 'aria-hidden': true }, 'searly'));
  }

  /* Temperature with the LCD's small trailing decimal. */
  function Temp(p) {
    var size = p.size || 'md', unit = p.unit === 'F' ? '°F' : '°C', decimals = p.decimals === undefined ? 1 : p.decimals;
    if (p.value === null || p.value === undefined || isNaN(p.value)) {
      return h('span', { className: cx('sr-temp', 'sr-temp-' + size, 'sr-temp-empty', p.className) }, '--', p.showUnit === false ? null : h('span', { className: 'sr-temp-unit' }, unit));
    }
    var s = Number(p.value).toFixed(decimals), dot = s.indexOf('.');
    var whole = dot < 0 ? s : s.slice(0, dot), dec = dot < 0 ? null : s.slice(dot);
    return h('span', { className: cx('sr-temp', 'sr-temp-' + size, p.className), 'aria-label': s + ' ' + unit, style: p.color ? { color: p.color } : undefined },
      h('span', { 'aria-hidden': true }, whole),
      dec ? h('span', { className: 'sr-temp-dec', 'aria-hidden': true }, dec) : null,
      p.showUnit === false ? null : h('span', { className: 'sr-temp-unit', 'aria-hidden': true }, p.unitLabel === 'degree' ? '°' : unit));
  }

  function Button(p) {
    var variant = p.variant || 'primary';
    return h('button', { type: 'button', className: cx('sr-btn', 'sr-btn-' + variant, p.size === 'lg' && 'sr-btn-lg', p.block && 'sr-btn-block', p.className), disabled: p.disabled || p.loading, onClick: p.onClick, 'aria-busy': p.loading || undefined },
      p.loading ? h('span', { className: 'sr-btn-spinner', 'aria-hidden': true }) : p.icon ? h(Icon, { name: p.icon, size: 20 }) : null,
      h('span', null, p.children),
      p.iconRight ? h(Icon, { name: p.iconRight, size: 20 }) : null);
  }

  function IconButton(p) {
    return h('button', { type: 'button', className: cx('sr-iconbtn', p.variant === 'filled' && 'sr-iconbtn-filled', p.className), 'aria-label': p.label, onClick: p.onClick },
      h(Icon, { name: p.icon, size: 22 }));
  }

  function SegmentedControl(p) {
    var opts = p.options || [];
    var st = useControlled(p.value, p.defaultValue !== undefined ? p.defaultValue : (opts[0] && opts[0].value), p.onChange);
    var idx = Math.max(0, opts.findIndex(function (o) { return o.value === st[0]; }));
    var n = Math.max(1, opts.length);
    return h('div', { className: cx('sr-seg', p.className), role: 'radiogroup', 'aria-label': p.label },
      h('span', { className: 'sr-seg-thumb', 'aria-hidden': true, style: { width: 'calc((100% - 8px) / ' + n + ')', transform: 'translateX(' + (idx * 100) + '%)' } }),
      opts.map(function (o) {
        return h('button', { key: o.value, type: 'button', role: 'radio', 'aria-checked': o.value === st[0], onClick: function () { st[1](o.value); } },
          o.icon ? h(Icon, { name: o.icon, size: 18 }) : null, o.label);
      }));
  }

  /* Heat dial: 270 degrees from ambient to target, coloured by the heat ramp. */
  function arcPoint(c, r, deg) { var a = deg * Math.PI / 180; return [c + r * Math.cos(a), c + r * Math.sin(a)]; }
  var dialSeq = 0;
  function HeatDial(p) {
    var size = p.size || 288, stroke = 14, c = size / 2, r = c - 30;
    var state = p.state || 'cooking';
    var idRef = useRef(null); if (!idRef.current) idRef.current = 'sr-heat-' + (++dialSeq);
    var tgt = p.target || 65, from = Math.min(startTemp(p), tgt - 1);
    var noArc = state === 'docked' || state === 'ready'; /* no cook running: no progress, no target */
    var f = noArc || p.core === null || p.core === undefined ? 0 : clamp((p.core - from) / Math.max(1, tgt - from), 0, 1);
    var done = state === 'cooking' && f >= 1;
    var s = arcPoint(c, r, 135), e = arcPoint(c, r, 45);
    var d = 'M' + s[0] + ' ' + s[1] + ' A' + r + ' ' + r + ' 0 1 1 ' + e[0] + ' ' + e[1];
    var L = r * Math.PI * 1.5;
    var ticks = [];
    for (var i = 0; i <= 54; i++) {
      var deg = 135 + i * 5, major = i % 9 === 0;
      var a = arcPoint(c, r + 18, deg), b = arcPoint(c, r + (major ? 26 : 22), deg);
      ticks.push(h('line', { key: i, className: major ? 'sr-major' : undefined, x1: a[0], y1: a[1], x2: b[0], y2: b[1], strokeWidth: major ? 2 : 1.25 }));
    }
    var headDeg = 135 + 270 * f, hp = arcPoint(c, r, headDeg);
    var t1 = arcPoint(c, r - 14, 45), t2 = arcPoint(c, r + 14, 45);
    var unitShort = p.unit === 'F' ? '°F' : '°C';
    var center;
    if (state === 'docked') {
      center = h('div', { className: 'sr-dial-center' },
        h('span', { style: { color: 'var(--signal)' } }, h(Icon, { name: 'bolt', size: 34, strokeWidth: 1.5 })),
        h('span', { className: 'sr-t-title' }, 'Docked'),
        h('span', { className: 'sr-dial-sub' }, 'Charging in the G1'));
    } else {
      center = h('div', { className: 'sr-dial-center' },
        h('span', { className: 'sr-t-overline' }, p.label || (state === 'stale' ? 'Last reading' : state === 'ready' ? 'Probe' : 'Core')),
        h(Temp, { value: p.core, unit: p.unit, size: 'hero', unitLabel: 'degree' }),
        state === 'ready' ? h('span', { className: 'sr-dial-sub' }, 'No cook running')
          : done ? h('span', { className: 'sr-dial-sub sr-dial-sub--done' }, h(Icon, { name: 'check', size: 16 }), 'At target')
          : state === 'stale' ? h('span', { className: 'sr-dial-sub' }, 'Target ', h('b', null, Math.round(tgt) + unitShort))
          : h('span', { className: 'sr-dial-sub' }, h('b', null, Math.max(1, Math.ceil(tgt - p.core)) + '°'), ' to go'),
        state === 'cooking' ? h('span', { className: 'sr-dial-sub2' }, 'Target ' + Math.round(tgt) + unitShort) : null);
    }
    return h('div', { className: cx('sr-dial', 'sr-dial--' + state, noArc && 'sr-dial--noarc', done && 'sr-dial--done', p.className), style: { width: size, height: size } },
      h('svg', { width: size, height: size, viewBox: '0 0 ' + size + ' ' + size, 'aria-hidden': true },
        h('defs', null, h('linearGradient', { id: idRef.current, gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: size, y2: 0 },
          h('stop', { offset: '0%', stopColor: 'var(--heat-0)' }), h('stop', { offset: '32%', stopColor: 'var(--heat-1)' }),
          h('stop', { offset: '55%', stopColor: 'var(--heat-2)' }), h('stop', { offset: '78%', stopColor: 'var(--heat-3)' }), h('stop', { offset: '100%', stopColor: 'var(--heat-4)' }))),
        h('g', { className: 'sr-dial-ticks' }, ticks),
        h('path', { className: 'sr-dial-track', d: d, strokeWidth: stroke }),
        noArc ? null : h('path', { className: 'sr-dial-halo', d: d, stroke: 'url(#' + idRef.current + ')', strokeWidth: stroke + 10, strokeDasharray: L, strokeDashoffset: L * (1 - f) }),
        noArc ? null : h('path', { className: 'sr-dial-progress', d: d, stroke: 'url(#' + idRef.current + ')', strokeWidth: stroke, strokeDasharray: L, strokeDashoffset: L * (1 - f) }),
        noArc ? null : h('g', { className: 'sr-dial-target' }, h('line', { x1: t1[0], y1: t1[1], x2: t2[0], y2: t2[1] })),
        noArc ? null : h('g', { className: 'sr-dial-head', style: { transform: 'rotate(' + (headDeg - 135) + 'deg)', transformOrigin: c + 'px ' + c + 'px' } },
          h('circle', { className: 'sr-bead-glow', cx: s[0], cy: s[1], r: 14 }),
          h('circle', { className: 'sr-bead', cx: s[0], cy: s[1], r: 9 }))),
      center);
  }

  /* Probe zones: a drawn probe, five zones tip to handle, the lowest marked as core. */
  /* The ramp runs from the core's temperature when the cook started to the target. Not ambient: that is oven air. */
  function startTemp(p) { return p.start !== undefined && p.start !== null ? p.start : (p.unit === 'F' ? 41 : 5); }
  function heatVar(v, from, tgt) {
    var t = clamp((v - from) / Math.max(1, tgt - from), 0, 1);
    return 'var(--heat-' + Math.round(t * 4) + ')';
  }
  /* The probe, measured from the real one: where each part ends, as a fraction of its length from the tip.
     The thick part (lower steel, band, upper steel, rim) is about 37% of the length; the shaft is about 40% of its width. */
  var PROBE = { tip: 0.06, shaft: 0.55, taper: 0.606, lower: 0.676, band: 0.842, upper: 0.975 };

  /* Sensor positions, as a fraction of the probe's length from the tip: T1 just behind the tip, T5 at the neck,
     evenly spaced between, and the ambient sensor in the cap end. */
  var SENSORS = [0.05, 0.17, 0.29, 0.41, 0.53], AMBIENT_AT = 0.95;

  function ProbeZones(p) {
    var zones = p.zones || [];
    var from = startTemp(p), tgt = p.target, ramp = tgt !== undefined && tgt !== null && !p.docked;
    var W = 340, H = 52, cy = 12, L = 336, thick = 10, thin = 4, rim = 11.5;
    function x(f) { return 2 + L * f; }
    var core = zones.length ? zones.indexOf(Math.min.apply(null, zones)) : -1;
    function labelX(i) { return W * (i + 0.5) / 6; }
    var points = zones.slice(0, 5).map(function (v, i) { return x(SENSORS[i]); }).concat([x(AMBIENT_AT)]);
    var leaders = points.map(function (px, i) {
      return h('path', { key: i, d: 'M' + px + ' ' + (cy + (i === 5 ? thick : thin) + 1) + 'V' + (cy + 15) + 'L' + labelX(i) + ' ' + (H - 1), fill: 'none', stroke: 'var(--line-strong)', strokeWidth: 1 });
    });
    var dots = zones.slice(0, 5).map(function (v, i) {
      return h('circle', { key: i, className: 'sr-zones-zone', cx: points[i], cy: cy, r: 3.6, fill: ramp ? heatVar(v, from, tgt) : p.docked ? 'var(--line-strong)' : 'var(--ink-faint)', stroke: 'var(--probe-steel-dark)', strokeWidth: 1 });
    });
    function label(i, value, caption, cls) {
      return h('div', { key: i, className: cx('sr-zones-label', cls), style: { left: (labelX(i) / W * 100) + '%' } },
        p.docked || value === undefined ? h('span', { className: 'sr-temp sr-temp-md sr-temp-empty' }, '--') : h(Temp, { value: value, unit: p.unit, size: 'md', showUnit: false, decimals: Math.abs(value) >= 100 ? 0 : 1 }),
        h('span', { className: 'sr-t-caption' }, caption));
    }
    return h('div', { className: cx('sr-zones', p.className) },
      h('div', { className: 'sr-zones-ends' }, h('span', { className: 'sr-t-overline' }, 'Tip'), h('span', { className: 'sr-t-overline' }, 'Handle')),
      h('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Probe sensors, tip to handle: ' + zones.join(', ') + (p.ambient === undefined ? '' : '; ambient ' + p.ambient) },
        leaders,
        h('path', { d: 'M2 ' + cy + 'L' + x(PROBE.tip) + ' ' + (cy - thin) + 'H' + x(PROBE.shaft) + 'L' + x(PROBE.taper) + ' ' + (cy - thick) + 'H' + x(PROBE.upper) + 'V' + (cy + thick) + 'H' + x(PROBE.taper) + 'L' + x(PROBE.shaft) + ' ' + (cy + thin) + 'H' + x(PROBE.tip) + 'Z', fill: 'var(--probe-steel)' }),
        h('path', { d: 'M2 ' + cy + 'L' + x(PROBE.tip) + ' ' + (cy + thin) + 'H' + x(PROBE.shaft) + 'L' + x(PROBE.taper) + ' ' + (cy + thick) + 'H' + x(PROBE.upper), fill: 'none', stroke: 'var(--probe-steel-dark)', strokeWidth: 1.25 }),
        h('rect', { x: x(PROBE.lower), y: cy - thick + 0.75, width: x(PROBE.band) - x(PROBE.lower), height: thick * 2 - 1.5, fill: 'var(--probe-band)', stroke: 'var(--probe-steel-dark)', strokeWidth: 1.5 }),
        h('text', { x: (x(PROBE.lower) + x(PROBE.band)) / 2, y: cy + 4.5, textAnchor: 'middle', fill: 'var(--probe-steel)', style: { font: '700 12px var(--font-display)' } }, p.probeNumber || '1'),
        h('rect', { x: x(PROBE.upper) - 1, y: cy - rim, width: W - 2 - x(PROBE.upper) + 1, height: rim * 2, rx: 3, fill: 'var(--probe-steel)', stroke: 'var(--probe-steel-dark)', strokeWidth: 1.25 }),
        dots,
        h('circle', { cx: points[5], cy: cy, r: 3.6, fill: 'var(--ink-muted)', stroke: 'var(--probe-steel-dark)', strokeWidth: 1 })),
      h('div', { className: 'sr-zones-labels' },
        zones.slice(0, 5).map(function (v, i) { return label(i, v, 'T' + (i + 1) + (i === core && !p.docked ? ' · Core' : ''), i === core && !p.docked && 'sr-zones-core'); }),
        label(5, p.ambient, 'Ambient', 'sr-zones-ambient')));
  }

  var PILL = {
    live: ['sr-pill-live', 'Live'], stale: ['sr-pill-stale', 'No data'], reconnecting: ['sr-pill-wait', 'Reconnecting'],
    searching: ['sr-pill-wait', 'Looking for G1'], connecting: ['sr-pill-wait', 'Connecting'], off: ['sr-pill-off', 'Bluetooth off'],
    permission: ['sr-pill-off', 'Permission needed'], error: ['sr-pill-error', 'Not paired']
  };
  function ConnectionPill(p) {
    var state = p.state || 'live', m = PILL[state] || PILL.live, text = p.children || m[1];
    if (state === 'stale' && p.seconds !== undefined) text = 'No data for ' + p.seconds + ' s';
    if (state === 'reconnecting' && p.seconds !== undefined) text = 'Retry in ' + p.seconds + ' s';
    return h('span', { className: cx('sr-pill', m[0], p.className), role: 'status' },
      state === 'off' ? h(Icon, { name: 'bluetooth-off', size: 16 }) : h('span', { key: p.beat, className: 'sr-pill-dot', 'aria-hidden': true }), text);
  }

  function Battery(p) {
    var lvl = clamp(p.level || 0, 0, 100), on = Math.ceil(lvl / 25), low = lvl <= 20 && !p.charging;
    var bars = [0, 1, 2, 3].map(function (i) { return h('span', { key: i, className: cx('sr-batt-bar', i < on && 'sr-on', p.charging && i === on && 'sr-next') }); });
    return h('span', { className: cx('sr-batt', low && 'sr-batt-low', p.charging && 'sr-batt-charging', p.className), role: 'img', 'aria-label': (p.label ? p.label + ' battery ' : 'Battery ') + lvl + '%' + (p.charging ? ', charging' : '') },
      p.label ? h('span', null, p.label) : null,
      h('span', { className: 'sr-batt-glyph', 'aria-hidden': true }, bars),
      h('b', { 'aria-hidden': true }, lvl + '%'),
      p.charging ? h(Icon, { name: 'bolt', size: 14 }) : null);
  }

  function fmtClock(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var hh = Math.floor(sec / 3600), mm = Math.floor(sec / 60) % 60, ss = sec % 60;
    return hh + ':' + (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
  }
  function CookStatus(p) {
    var state = p.state || 'cooking', mode = p.mode === 'smart' ? 'Smart' : 'Manual';
    var t = useState(p.elapsed || 0);
    useEffect(function () { t[1](p.elapsed || 0); }, [p.elapsed]);
    useEffect(function () {
      if (!p.running || state !== 'cooking') return undefined;
      var id = setInterval(function () { t[1](function (v) { return v + 1; }); }, 1000);
      return function () { clearInterval(id); };
    }, [p.running, state]);
    var chip = state === 'docked' ? h('span', { className: 'sr-chip sr-chip-docked' }, h(Icon, { name: 'bolt', size: 15 }), 'Docked, charging')
      : state === 'idle' ? h('span', { className: 'sr-chip' }, 'Ready to cook')
      : state === 'done' ? h('span', { className: 'sr-chip sr-chip-done' }, h(Icon, { name: 'check', size: 15 }), mode + ' · At target')
      : h('span', { className: 'sr-chip sr-chip-cooking' }, mode + ' · Cooking');
    return h('div', { className: cx('sr-cook', p.className) }, chip,
      state === 'cooking' || state === 'done' ? h('span', { className: 'sr-clock', 'aria-label': 'Elapsed ' + fmtClock(t[0]) }, h(Icon, { name: 'timer', size: 16 }), fmtClock(t[0])) : null);
  }

  var NOTICE_ICON = { info: 'info', warn: 'alert', danger: 'alert', signal: 'check' };
  function Notice(p) {
    var tone = p.tone || 'info';
    return h('div', { className: cx('sr-notice', 'sr-notice-' + tone, p.className), role: tone === 'danger' || tone === 'warn' ? 'alert' : 'status' },
      h('span', { className: 'sr-notice-disc', 'aria-hidden': true }, h(Icon, { name: p.icon || NOTICE_ICON[tone], size: 18, strokeWidth: 2 })),
      h('div', null,
        p.title ? h('p', { className: 'sr-notice-title' }, p.title) : null,
        p.children ? h('p', { className: 'sr-notice-body' }, p.children) : null,
        p.action ? h('div', { className: 'sr-notice-action' }, p.action) : null));
  }

  var STAGES = ['sending', 'acknowledged', 'applied'];
  var STAGE_TITLE = { sending: 'Sending to the G1', acknowledged: 'G1 acknowledged, checking it applied', applied: 'Applied on the G1', failed: 'No reply from the G1' };
  function ApplyReceipt(p) {
    var stage = p.stage || 'sending', failed = stage === 'failed';
    var at = failed ? (p.failedAt || 1) : STAGES.indexOf(stage);
    function node(i) {
      var cls = failed && i === at ? 'sr-fail' : i < at || (i === at && stage === 'applied') ? 'sr-done' : i === at ? 'sr-active' : '';
      return h('span', { key: 'n' + i, className: cx('sr-receipt-node', cls) });
    }
    function wire(i) { return h('span', { key: 'w' + i, className: 'sr-receipt-wire', style: { '--fill': i < at ? 1 : 0 } }); }
    var icon = failed ? 'alert' : stage === 'applied' ? 'check-circle' : 'refresh';
    return h('div', { className: cx('sr-receipt', 'sr-receipt-' + stage, p.className), role: 'status', 'aria-live': 'polite' },
      h('div', { className: 'sr-receipt-head' }, h(Icon, { name: icon, size: 20 }), p.title || STAGE_TITLE[stage]),
      h('div', { className: 'sr-receipt-track', 'aria-hidden': true }, node(0), wire(0), node(1), wire(1), node(2)),
      h('div', { className: 'sr-receipt-labels', 'aria-hidden': true }, ['Sent', 'Acknowledged', 'Applied'].map(function (l, i) { return h('span', { key: l, className: i <= at ? 'sr-reached' : undefined }, l); })),
      p.detail ? h('p', { className: 'sr-receipt-detail' }, p.detail) : null,
      failed && p.onRetry ? h(Button, { variant: 'secondary', icon: 'refresh', onClick: p.onRetry }, 'Try again') : null);
  }

  /* Target picker: big value, plus and minus, and a ruler you drag. */
  function TargetPicker(p) {
    var F = p.unit === 'F';
    var min = p.min !== undefined ? p.min : (F ? 86 : 30), max = p.max !== undefined ? p.max : (F ? 212 : 100), step = p.step || 1, px = 12;
    var st = useControlled(p.value, p.defaultValue !== undefined ? p.defaultValue : (F ? 149 : 65), p.onChange);
    var live = useState(null), drag = useRef(null);
    var shown = live[0] !== null ? live[0] : st[0];
    function set(v) { st[1](clamp(Math.round(v / step) * step, min, max)); }
    function down(e) { drag.current = { x: e.clientX, v: st[0] }; e.currentTarget.setPointerCapture(e.pointerId); }
    function move(e) { if (!drag.current) return; live[1](clamp(drag.current.v - (e.clientX - drag.current.x) / px, min, max)); }
    function up() { if (!drag.current) return; drag.current = null; if (live[0] !== null) set(live[0]); live[1](null); }
    function key(e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { set(st[0] + step); e.preventDefault(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { set(st[0] - step); e.preventDefault(); }
    }
    var ticks = [];
    for (var v = min; v <= max; v++) {
      var major = v % 5 === 0, off = (v - shown) * px;
      if (Math.abs(off) > 220) continue;
      ticks.push(h('span', { key: 't' + v, className: cx('sr-ruler-tick', major && 'sr-major'), style: { left: 'calc(50% + ' + off + 'px)' } }));
      if (v % 10 === 0) ticks.push(h('span', { key: 'n' + v, className: 'sr-ruler-num', style: { left: 'calc(50% + ' + off + 'px)' } }, v));
    }
    var rounded = Math.round(shown / step) * step;
    return h('div', { className: cx('sr-picker', p.className) },
      h('div', { className: 'sr-picker-main' },
        h('button', { type: 'button', className: 'sr-picker-step', 'aria-label': 'Lower target by 1 degree', disabled: st[0] <= min, onClick: function () { set(st[0] - step); } }, h(Icon, { name: 'minus', size: 24 })),
        h('div', { className: 'sr-picker-value' }, h(Temp, { value: rounded, unit: p.unit, size: 'xl', decimals: 0 })),
        h('button', { type: 'button', className: 'sr-picker-step', 'aria-label': 'Raise target by 1 degree', disabled: st[0] >= max, onClick: function () { set(st[0] + step); } }, h(Icon, { name: 'plus', size: 24 }))),
      h('div', { className: 'sr-ruler', role: 'slider', tabIndex: 0, 'aria-label': 'Target temperature', 'aria-valuemin': min, 'aria-valuemax': max, 'aria-valuenow': st[0], 'aria-valuetext': st[0] + (F ? ' °F' : ' °C'), onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up, onKeyDown: key },
        h('div', { className: 'sr-ruler-strip' }, ticks), h('span', { className: 'sr-ruler-needle' })),
      h('div', { className: 'sr-picker-range' }, h('span', null, min + (F ? '°F' : '°C')), h('span', null, 'Drag or tap'), h('span', null, max + (F ? '°F' : '°C'))));
  }

  function Sheet(p) {
    var panel = h('div', { className: cx('sr-sheet', p.className), role: 'dialog', 'aria-modal': p.overlay ? true : undefined, 'aria-label': p.title },
      h('span', { className: 'sr-sheet-grab', 'aria-hidden': true }),
      p.title ? h('div', { className: 'sr-sheet-head' },
        h('div', null, h('h2', { className: 'sr-t-title' }, p.title), p.subtitle ? h('p', { className: 'sr-t-body' }, p.subtitle) : null),
        p.onClose !== false ? h(IconButton, { icon: 'close', label: 'Close', variant: 'filled', onClick: p.onClose }) : null) : null,
      p.children,
      p.footer ? h('div', { className: 'sr-sheet-foot' }, p.footer) : null);
    if (!p.overlay) return panel;
    return h('div', { className: 'sr-sheet-layer' }, h('div', { className: 'sr-sheet-scrim', onClick: p.onClose || undefined }), panel);
  }

  function ListGroup(p) {
    return h('section', { className: cx('sr-list', p.className) },
      p.title ? h('h3', { className: 'sr-t-overline', style: { margin: '0 4px' } }, p.title) : null,
      h('div', { className: 'sr-list-box' }, p.children),
      p.footnote ? h('p', { className: 'sr-list-foot' }, p.footnote) : null);
  }
  function ListRow(p) {
    var tag = p.onClick ? 'button' : 'div';
    return h(tag, { type: tag === 'button' ? 'button' : undefined, className: cx('sr-listrow', p.tone === 'danger' && 'sr-listrow-danger', p.className), onClick: p.onClick, style: p.icon ? undefined : { gridTemplateColumns: '1fr auto' } },
      p.icon ? h('span', { className: 'sr-listrow-icon', 'aria-hidden': true }, h(Icon, { name: p.icon, size: 20 })) : null,
      h('span', { className: 'sr-listrow-text' }, h('span', { className: 'sr-t-strong', style: p.tone === 'danger' ? { color: 'var(--danger)' } : undefined }, p.title), p.subtitle ? h('span', { className: 'sr-listrow-sub' }, p.subtitle) : null),
      p.value || p.chevron ? h('span', { className: 'sr-listrow-value' }, p.value, p.chevron ? h(Icon, { name: 'chevron-right', size: 18 }) : null) : h('span'),
      p.children ? h('div', { className: 'sr-listrow-full' }, p.children) : null);
  }

  /* Seven-segment glyphs with ghosted unlit segments, as on the G1's LCD. */
  var SEG = { '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg', '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '', O: 'abcdef', F: 'aefg', P: 'abefg', A: 'abcefg', r: 'eg', E: 'adefg', n: 'ceg', C: 'adef', L: 'def', b: 'cdefg', d: 'bcdeg', H: 'bcefg', t: 'defg', u: 'cde', S: 'acdfg', y: 'bcdfg', o: 'cdeg', i: 'c' };
  function segPolys(W, H, t) {
    var g = 1.2, L = t / 2, R = W - t / 2, T = t / 2, M = H / 2, B = H - t / 2, q = t / 2;
    function hz(xa, xb, y) { return [[xa, y], [xa + q, y - q], [xb - q, y - q], [xb, y], [xb - q, y + q], [xa + q, y + q]]; }
    function vt(x, ya, yb) { return [[x, ya], [x + q, ya + q], [x + q, yb - q], [x, yb], [x - q, yb - q], [x - q, ya + q]]; }
    return { a: hz(L + g, R - g, T), g: hz(L + g, R - g, M), d: hz(L + g, R - g, B), f: vt(L, T + g, M - g), b: vt(R, T + g, M - g), e: vt(L, M + g, B - g), c: vt(R, M + g, B - g) };
  }
  function SegmentDisplay(p) {
    var text = String(p.text === undefined ? '88.8' : p.text), height = p.height || 48;
    var W = 28, H = 50, t = 5.4, adv = W + 9, polys = segPolys(W, H, t);
    var chars = [];
    for (var i = 0; i < text.length; i++) {
      if (text[i] === '.') { if (chars.length) chars[chars.length - 1].dot = true; continue; }
      chars.push({ ch: text[i], dot: false });
    }
    var lit = p.color || 'var(--lcd-segment)', ghost = p.ghost === false ? 'transparent' : (p.ghostColor || 'var(--lcd-ghost)');
    var width = chars.length * adv + 4;
    return h('svg', { className: cx('sr-segdisp', p.className), height: height, width: height * (width + 6) / (H + 4), viewBox: '-4 -2 ' + (width + 6) + ' ' + (H + 4), role: 'img', 'aria-label': p.label || text },
      h('g', { transform: 'skewX(-6)' }, chars.map(function (c, k) {
        var on = SEG[c.ch] || '';
        return h('g', { key: k, transform: 'translate(' + (k * adv + 4) + ' 0)' },
          'abcdefg'.split('').map(function (s) { return h('polygon', { key: s, points: polys[s].map(function (pt) { return pt.join(','); }).join(' '), fill: on.indexOf(s) >= 0 ? lit : ghost }); }),
          c.dot ? h('circle', { cx: W + 4.5, cy: H - t / 2, r: t / 2 + 0.3, fill: lit }) : null);
      })));
  }

  /* The G1, drawn from simple shapes. Not a reproduction of any artwork. */
  var g1Seq = 0;
  function DeviceG1(p) {
    var idRef = useRef(null); if (!idRef.current) idRef.current = 'sr-g1-crop-' + (++g1Seq);
    var hl = p.highlight, probe = p.probe || 'docked';
    var crop = p.crop === undefined ? 400 : p.crop;
    var top = probe === 'lift' ? -200 : -50; /* headroom for the lifted probe */
    var pc = 139, thick = 22, thin = 9, rimW = 25, len = 355;
    function py(f) { return -10 + len * (1 - f); } /* y of a point on the docked probe, by fraction from the tip */
    var seg = 'var(--lcd-segment)';
    var label = { font: '600 8px var(--font-sans)', letterSpacing: '0.02em' };
    /* Docked: OFF. Out of the dock (connected or not): the reading, then Target | Ambient, as on the G1. */
    function lcdDocked() { return h('g', { transform: 'translate(52 92)' }, h(SegmentDisplay, { text: 'OFF', height: 40 })); }
    function lcdOut() {
      return h('g', null,
        h('g', { transform: 'translate(50 84)' }, h(SegmentDisplay, { text: p.reading || '25.7', height: 32 })),
        h('line', { x1: 48, y1: 132, x2: 152, y2: 132, stroke: seg, strokeWidth: 1 }),
        h('line', { x1: 101, y1: 140, x2: 101, y2: 184, stroke: seg, strokeWidth: 1 }),
        h('text', { x: 54, y: 146, fill: seg, style: label }, 'Target'),
        h('text', { x: 109, y: 146, fill: seg, style: label }, 'Ambient'),
        h('g', { transform: 'translate(52 153)' }, h(SegmentDisplay, { text: String(p.target === undefined ? 65 : p.target), height: 24 })),
        h('g', { transform: 'translate(107 153)' }, h(SegmentDisplay, { text: String(p.ambient === undefined ? 26 : p.ambient), height: 24 })));
    }
    var lcd = p.lcd !== undefined ? (typeof p.lcd === 'string' ? h('g', { transform: 'translate(52 92)' }, h(SegmentDisplay, { text: p.lcd, height: 40 })) : p.lcd)
      : probe === 'out' ? lcdOut()
      : probe === 'lift' ? h('g', null, h('g', { className: 'sr-g1-lcd-docked' }, lcdDocked()), h('g', { className: 'sr-g1-lcd-out' }, lcdOut()))
      : lcdDocked();
    var cls = cx('sr-g1', (hl === 'ok' || hl === 'probe') && 'sr-g1--pulse', probe === 'lift' && 'sr-g1--lift', p.className);
    var children = [
      h('defs', { key: 'defs' }, h('clipPath', { id: idRef.current }, h('rect', { x: -40, y: top - 30, width: 280, height: crop - top + 30 }))),
      h('g', { key: 'all', clipPath: 'url(#' + idRef.current + ')' },
        /* Probe, top down: rim, upper steel, band, lower steel, tapered neck, shaft, tip. Only the rim shows while docked. */
        probe === 'out' ? null : h('g', { className: 'sr-g1-probe' },
          h('path', { d: 'M' + (pc - thin / 2) + ' ' + py(PROBE.shaft) + 'V' + py(PROBE.tip) + 'L' + pc + ' ' + py(0) + 'L' + (pc + thin / 2) + ' ' + py(PROBE.tip) + 'V' + py(PROBE.shaft) + 'Z', fill: 'var(--probe-steel)' }),
          h('rect', { x: pc + 1, y: py(PROBE.shaft), width: 2, height: py(PROBE.tip) - py(PROBE.shaft), rx: 1, fill: 'var(--probe-steel-dark)', opacity: 0.5 }),
          h('path', { d: 'M' + (pc - thick / 2) + ' ' + py(PROBE.taper) + 'H' + (pc + thick / 2) + 'L' + (pc + thin / 2) + ' ' + py(PROBE.shaft) + 'H' + (pc - thin / 2) + 'Z', fill: 'var(--probe-steel)' }),
          h('rect', { x: pc - thick / 2, y: py(PROBE.upper), width: thick, height: py(PROBE.taper) - py(PROBE.upper), fill: 'var(--probe-steel)' }),
          h('rect', { x: pc + 4, y: py(PROBE.upper), width: 4, height: py(PROBE.taper) - py(PROBE.upper), fill: 'var(--probe-steel-dark)', opacity: 0.5 }),
          h('rect', { x: pc - thick / 2 + 0.75, y: py(PROBE.band), width: thick - 1.5, height: py(PROBE.lower) - py(PROBE.band), rx: 1.5, fill: 'var(--probe-band)', stroke: 'var(--probe-steel-dark)', strokeWidth: 1.5 }),
          h('text', { x: pc, y: (py(PROBE.band) + py(PROBE.lower)) / 2 + 5, textAnchor: 'middle', fill: 'var(--probe-steel)', style: { font: '700 14px var(--font-display)' } }, '1'),
          h('rect', { x: pc - rimW / 2, y: py(1), width: rimW, height: py(PROBE.upper) - py(1) + 1, rx: 3, fill: 'var(--probe-steel)', stroke: 'var(--probe-steel-dark)', strokeWidth: 1.25 }),
          hl === 'probe' ? h('rect', { className: 'sr-g1-ring', x: pc - 23, y: py(1) - 6, width: 46, height: 30, rx: 10 }) : null),
        h('rect', { x: 20, y: 6, width: 160, height: 560, rx: 44, fill: 'var(--device-body)' }),
        h('rect', { x: 20.75, y: 6.75, width: 158.5, height: 558.5, rx: 43.25, fill: 'none', stroke: 'var(--device-shade)', strokeWidth: 1.5, opacity: 0.8 }),
        h('rect', { x: 40, y: 46, width: 120, height: 148, rx: 7, fill: 'var(--lcd-glass)' }),
        h('rect', { x: 40, y: 46, width: 120, height: 148, rx: 7, fill: 'none', stroke: 'var(--device-shade)', strokeWidth: 1.5 }),
        h('g', { transform: 'translate(54 54) scale(0.55)', fill: 'none', stroke: seg, strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round', className: p.bluetoothBlink ? 'sr-g1-blink' : undefined }, h('path', { d: 'M7 7.5l10 9-5 4.5V3l5 4.5-10 9' })),
        h('g', { transform: 'translate(91 54) scale(0.55)', fill: 'none', stroke: seg, strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' }, h('path', { d: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4z' }), h('path', { d: 'M16 9.5l5 5M21 9.5l-5 5' })),
        h('rect', { x: 128, y: 58, width: 18, height: 9, rx: 1.5, fill: 'none', stroke: seg, strokeWidth: 1.4 }),
        h('rect', { x: 130.5, y: 60.5, width: 13, height: 4, fill: seg }),
        h('line', { x1: 48, y1: 74, x2: 152, y2: 74, stroke: seg, strokeWidth: 1 }),
        lcd,
        h('g', { key: 'keys' },
          h('circle', { cx: 66, cy: 254, r: 21, fill: 'var(--device-key)', stroke: 'var(--device-shade)', strokeWidth: 1.5 }),
          h('text', { x: 66, y: 258.5, textAnchor: 'middle', fill: 'var(--device-shade)', style: { font: '700 12px var(--font-sans)', letterSpacing: '0.04em' } }, 'SET'),
          h('circle', { cx: 66, cy: 310, r: 21, fill: 'var(--device-key)', stroke: 'var(--device-shade)', strokeWidth: 1.5 }),
          h('text', { x: 66, y: 314.5, textAnchor: 'middle', fill: 'var(--device-shade)', style: { font: '700 12px var(--font-sans)', letterSpacing: '0.04em' } }, 'OK'),
          hl === 'ok' ? h('circle', { className: 'sr-g1-ring', cx: 66, cy: 310, r: 24 }) : null,
          hl === 'ok' ? h('circle', { cx: 66, cy: 310, r: 24, fill: 'none', stroke: 'var(--ink)', strokeWidth: 2.5 }) : null,
          h('rect', { x: 112, y: 232, width: 44, height: 100, rx: 22, fill: 'var(--device-key)', stroke: 'var(--device-shade)', strokeWidth: 1.5 }),
          h('path', { d: 'M126 258l8-8 8 8M126 306l8 8 8-8', fill: 'none', stroke: 'var(--device-shade)', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' })))
    ];
    return h('svg', { className: cls, width: p.width || 200, viewBox: '0 ' + top + ' 200 ' + (crop - top), role: 'img', 'aria-label': p.label || 'ThermoMaven G1' }, children);
  }

  function RetrySchedule(p) {
    var steps = p.steps || [1, 2, 5, 10, 10, 10], at = p.attempt || 0;
    var maxS = Math.max.apply(null, steps);
    return h('div', { className: cx('sr-retry', p.className), role: 'img', 'aria-label': 'Reconnect attempt ' + (at + 1) + '. Retries after 1, 2, 5 and 10 seconds, then every 10 seconds.' },
      steps.map(function (s, i) {
        return h('div', { key: i, className: cx('sr-retry-step', i < at && 'sr-done', i === at && 'sr-now') },
          h('div', { className: 'sr-retry-bar', style: { height: 6 + (s / maxS) * 30 } }), h('span', null, s + 's'));
      }),
      h('div', { className: 'sr-retry-step', style: { flex: 'none' } }, h('span', { style: { paddingBottom: 0 } }, '…')));
  }

  var DIR = { tx: '→', rx: '←', sys: '·', err: '!' };
  function DebugLog(p) {
    return h('div', { className: cx('sr-log', p.className), role: 'log', style: p.maxHeight ? { maxHeight: p.maxHeight, overflowY: 'auto' } : undefined },
      (p.entries || []).map(function (e, i) {
        var parts = String(e.text).split(/(\b[A-Za-z0-9]+:[A-Za-z]+:[A-Za-z]+\b)/);
        return h('div', { key: i, className: cx('sr-log-row', 'sr-log-' + (e.dir || 'sys')) },
          h('span', { className: 'sr-log-time' }, e.t), h('span', { className: 'sr-log-dir', 'aria-label': e.dir }, DIR[e.dir || 'sys']),
          h('span', { className: 'sr-log-text' }, parts.map(function (s, k) { return k % 2 ? h('b', { key: k }, s) : s; })));
      }));
  }

  function Screen(p) {
    var timer = useRef(null);
    function start() { if (!p.onTitleLongPress) return; timer.current = setTimeout(p.onTitleLongPress, 600); }
    function stop() { clearTimeout(timer.current); }
    return h('div', { className: cx('sr-screen', p.className) },
      p.title !== undefined || p.actions ? h('header', { className: 'sr-screen-bar' },
        h('div', { className: 'sr-screen-title', onPointerDown: start, onPointerUp: stop, onPointerLeave: stop },
          typeof p.title === 'string' ? h('span', { className: 'sr-t-heading' }, p.title) : p.title,
          p.subtitle ? h('span', { className: 'sr-t-caption' }, p.subtitle) : null),
        h('div', { className: 'sr-screen-actions' }, p.actions)) : null,
      h('div', { className: 'sr-screen-body', style: p.bodyStyle }, p.children),
      p.footer ? h('footer', { className: 'sr-screen-foot' }, p.footer) : null,
      p.overlay || null);
  }

  /* Showcase only: an Android phone frame for screen mockups. Not part of the app. */
  function Phone(p) {
    var frame = h('div', { className: 'sr-phone', 'data-theme': p.theme },
      h('div', { className: 'sr-phone-glass' },
        h('span', { className: 'sr-phone-cam' }),
        h('div', { className: 'sr-phone-status' }, h('span', null, p.time || '18:42'),
          h('i', null, h(Icon, { name: 'bluetooth', size: 15, strokeWidth: 2 }), h('svg', { width: 16, height: 12, viewBox: '0 0 16 12', 'aria-hidden': true }, h('path', { d: 'M1 11h2V8H1zM5 11h2V6H5zM9 11h2V3H9zM13 11h2V0h-2z', fill: 'currentColor' })), h('svg', { width: 22, height: 12, viewBox: '0 0 22 12', 'aria-hidden': true }, h('rect', { x: 0.75, y: 0.75, width: 18, height: 10.5, rx: 2.5, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, opacity: 0.5 }), h('rect', { x: 2.5, y: 2.5, width: 12, height: 7, rx: 1, fill: 'currentColor' }), h('rect', { x: 19.8, y: 4, width: 1.6, height: 4, rx: 0.8, fill: 'currentColor', opacity: 0.5 })))),
        h('div', { className: 'sr-phone-body' }, p.children),
        h('div', { className: 'sr-phone-nav' })));
    if (!p.caption) return frame;
    return h('div', { className: 'sr-phone-cap' }, frame, h('p', null, p.caption));
  }

  var api = { Wordmark: Wordmark, Icon: Icon, Temp: Temp, Button: Button, IconButton: IconButton, SegmentedControl: SegmentedControl, HeatDial: HeatDial, ProbeZones: ProbeZones, ConnectionPill: ConnectionPill, Battery: Battery, CookStatus: CookStatus, Notice: Notice, ApplyReceipt: ApplyReceipt, TargetPicker: TargetPicker, Sheet: Sheet, ListGroup: ListGroup, ListRow: ListRow, SegmentDisplay: SegmentDisplay, DeviceG1: DeviceG1, RetrySchedule: RetrySchedule, DebugLog: DebugLog, Screen: Screen, Phone: Phone, ICONS: ICONS, fmtClock: fmtClock };
  window.Searly = Object.assign(window.Searly || {}, api);
})();
