/**
 * Arc-length tracking for an arbitrary SVG path.
 *
 * A path slider has to answer one question on every pointer move: given this
 * pointer position, where along the path should the thumb be? Answering it with
 * a global nearest-point search falls apart the moment the path crosses itself —
 * at a crossing both branches are equally near, so the thumb teleports onto the
 * wrong one. Instead the search is *windowed* around where the thumb already is,
 * which forces it to walk the curve continuously and makes loops behave.
 *
 * Distances and arc lengths here are all in the path's own user-space units
 * (whatever the `d` string is authored in), not CSS pixels. Apart from
 * `buildLUT`, nothing in this file touches the DOM.
 */

const clamp = (value, low, high) => (value < low ? low : value > high ? high : value);

const MIN_SAMPLES = 200;
const MAX_SAMPLES = 4000;

/** Ternary-search steps used to refine a hit between two adjacent samples. */
const REFINE_ITERATIONS = 12;

/**
 * @typedef {object} LUT
 * @property {Float32Array} xs   Sampled x coordinates, `n + 1` of them.
 * @property {Float32Array} ys   Sampled y coordinates, index-matched to `xs`.
 * @property {number} n          Index of the last sample, so the count is `n + 1`.
 * @property {number} ds         Arc length between adjacent samples.
 * @property {number} length     Total arc length of the path.
 */

/**
 * @typedef {object} Hit
 * @property {number} s     Arc length of the matched point, 0 to `length`.
 * @property {number} dist  Distance from the query point to it, in user units.
 * @property {number} x     Matched point's x coordinate.
 * @property {number} y     Matched point's y coordinate.
 */

/**
 * Sample a path into a flat arc-length lookup table.
 *
 * This is the only expensive, DOM-touching call — `getPointAtLength` is a layout
 * read, so it runs once per path rather than once per pointer move. Sampling by
 * arc length (rather than by bezier parameter `t`) is what makes progress
 * advance at a constant spatial rate: 0.5 is genuinely halfway along the drawn
 * line, not halfway through the control-point parameterisation.
 *
 * @param {SVGPathElement} pathEl      Rendered path to sample.
 * @param {object} [options]
 * @param {number} [options.pitch=2]   Target gap between samples, in user units.
 * @returns {LUT | null} `null` for a degenerate or zero-length path.
 */
export function buildLUT(pathEl, { pitch = 2 } = {}) {
	// Total length of the path, or bail if there is nothing to sample.
	const length = pathEl.getTotalLength();
	if (!Number.isFinite(length) || length <= 0) return null;

	// Sample count from the requested pitch, kept within bounds.
	const n = clamp(Math.round(length / pitch), MIN_SAMPLES, MAX_SAMPLES);
	// Distance between one sample and the next.
	const ds = length / n;

	// Arrays to hold each sampled coordinate.
	const xs = new Float32Array(n + 1);
	const ys = new Float32Array(n + 1);

	// Step along the path and record every point.
	for (let i = 0; i <= n; i++) {
		const point = pathEl.getPointAtLength(i * ds);
		xs[i] = point.x;
		ys[i] = point.y;
	}

	// Return the finished lookup table.
	return { xs, ys, n, ds, length };
}

/**
 * Position at arc length `s`, linearly interpolated between samples.
 *
 * @param {LUT} lut     Table from `buildLUT`.
 * @param {number} s    Arc length along the path.
 * @returns {{ x: number, y: number }}
 */
export function pointAt(lut, s) {
	const { xs, ys, n, ds, length } = lut;

	// Fractional index into the lookup table.
	const exactIndex = clamp(s, 0, length) / ds;
	// Sample before it, capped so the next index stays in bounds.
	const behind = Math.min(Math.floor(exactIndex), n - 1);
	// Fraction of the way from that sample to the next.
	const blend = exactIndex - behind;

	// Return the point interpolated between the two samples.
	return {
		x: xs[behind] + (xs[behind + 1] - xs[behind]) * blend,
		y: ys[behind] + (ys[behind + 1] - ys[behind]) * blend
	};
}

/**
 * Unit tangent at arc length `s`, from a central difference of its neighbours.
 *
 * @param {LUT} lut     Table from `buildLUT`.
 * @param {number} s    Arc length along the path.
 * @returns {{ x: number, y: number }} Unit vector pointing the way the path runs.
 */
export function tangentAt(lut, s) {
	const { xs, ys, n, ds, length } = lut;

	// Nearest index in the lookup table.
	const nearest = clamp(Math.round(clamp(s, 0, length) / ds), 0, n);
	// Get the index before and after that is within bounds.
	const behind = Math.max(0, nearest - 1);
	const ahead = Math.min(n, nearest + 1);

	// Create the vector for the tangent.
	const deltaX = xs[ahead] - xs[behind];
	const deltaY = ys[ahead] - ys[behind];

	// Get magnitude to create a unit vector.
	const magnitude = Math.hypot(deltaX, deltaY) || 1;

	// Return unit tangent vector.
	return { x: deltaX / magnitude, y: deltaY / magnitude };
}

/**
 * Tangent direction at arc length `s`, in degrees — ready for an SVG `rotate()`.
 *
 * @param {LUT} lut     Table from `buildLUT`.
 * @param {number} s    Arc length along the path.
 * @returns {number} Degrees clockwise from the positive x axis.
 */
export function angleAt(lut, s) {
	// Unit tangent vector at that point.
	const tangent = tangentAt(lut, s);
	// Return its direction, converted from radians to degrees.
	return (Math.atan2(tangent.y, tangent.x) * 180) / Math.PI;
}

/**
 * Squared distance to the curve at `s`, plus an optional pull toward `sExpected`.
 *
 * The `lambda` term is what disambiguates a self-crossing: where two branches sit
 * equally close to the pointer, the one nearer to where the thumb was expected to
 * be wins. Keeping `lambda < 1` guarantees it never causes lag — for a pointer
 * sitting exactly on the curve at offset d from `sExpected`, the true point costs
 * `lambda * d²` against `d²` for standing still, so the true point always wins.
 *
 * @param {LUT} lut           Table from `buildLUT`.
 * @param {number} px         Query point x, in user units.
 * @param {number} py         Query point y, in user units.
 * @param {number} s          Candidate arc length being scored.
 * @param {number} sExpected  Arc length the thumb was predicted to reach.
 * @param {number} lambda     Weight on the continuity pull; 0 disables it.
 * @returns {number} Lower is better. Squared units, never square-rooted.
 */
function cost(lut, px, py, s, sExpected, lambda) {
	// Point on the curve at s.
	const point = pointAt(lut, s);

	// Squared distance from the query point to it.
	const dx = px - point.x;
	const dy = py - point.y;
	const distanceSq = dx * dx + dy * dy;

	// Distance alone when there is no continuity pull.
	if (!lambda) return distanceSq;

	// How far s sits from where the thumb was expected.
	const drift = s - sExpected;

	// Return the distance plus the drift penalty.
	return distanceSq + lambda * drift * drift;
}

/**
 * Narrow a best-sample index down to a sub-sample arc length.
 *
 * @param {LUT} lut           Table from `buildLUT`.
 * @param {number} px         Query point x, in user units.
 * @param {number} py         Query point y, in user units.
 * @param {number} index      Winning sample index from the caller's scan.
 * @param {number} sExpected  Arc length the thumb was predicted to reach.
 * @param {number} lambda     Weight on the continuity pull; 0 disables it.
 * @returns {Hit}
 */
function refine(lut, px, py, index, sExpected, lambda) {
	const { n, ds, length } = lut;

	// Bracket the answer between the neighbouring samples.
	let low = Math.max(0, index - 1) * ds;
	let high = Math.min(n, index + 1) * ds;

	// Ternary search: score two interior points and drop the worse outer third.
	for (let step = 0; step < REFINE_ITERATIONS; step++) {
		const third = (high - low) / 3;
		const lowerProbe = low + third;
		const upperProbe = high - third;
		const lowerCost = cost(lut, px, py, lowerProbe, sExpected, lambda);
		const upperCost = cost(lut, px, py, upperProbe, sExpected, lambda);

		if (lowerCost < upperCost) high = upperProbe;
		else low = lowerProbe;
	}

	// Midpoint of the collapsed bracket.
	const s = clamp((low + high) / 2, 0, length);
	// Point sitting there.
	const point = pointAt(lut, s);

	// Return the refined hit and its distance from the query point.
	return { s, dist: Math.hypot(px - point.x, py - point.y), x: point.x, y: point.y };
}

/**
 * Nearest point on the whole path — a full scan.
 *
 * Used only on pointerdown, where jumping the thumb to wherever the track was
 * grabbed is the expected behaviour. A press landing exactly on a self-crossing
 * is genuinely ambiguous; ties break toward the lower arc length.
 *
 * @param {LUT} lut     Table from `buildLUT`.
 * @param {number} px   Query point x, in user units.
 * @param {number} py   Query point y, in user units.
 * @returns {Hit}
 */
export function nearestGlobal(lut, px, py) {
	const { xs, ys, n } = lut;

	// Closest sample seen so far.
	let best = 0;
	let bestDistanceSq = Infinity;

	// Scan every sample, comparing squared distances to skip a square root.
	for (let i = 0; i <= n; i++) {
		const dx = px - xs[i];
		const dy = py - ys[i];
		const distanceSq = dx * dx + dy * dy;

		if (distanceSq < bestDistanceSq) {
			bestDistanceSq = distanceSq;
			best = i;
		}
	}

	// Refine the winner, with no continuity pull to apply.
	return refine(lut, px, py, best, 0, 0);
}

/**
 * Nearest point within `radius` of `sExpected`, measured in arc length.
 *
 * This is the drag-time solver. Because it can only ever return a position inside
 * the window, the thumb is physically unable to hop between branches of a
 * self-intersecting path — it has to travel there along the curve.
 *
 * The cost formula is inlined rather than calling cost(): this runs once per
 * sample per frame, and the call would allocate a point object each time.
 *
 * @param {LUT} lut                      Table from `buildLUT`.
 * @param {number} px                    Query point x, in user units.
 * @param {number} py                    Query point y, in user units.
 * @param {object} options
 * @param {number} options.sExpected     Arc length the thumb was predicted to reach.
 * @param {number} options.radius        Half-width of the searched window, in arc length.
 * @param {number} [options.lambda=0.25] Weight on the continuity pull. Keep below 1.
 * @returns {Hit}
 */
export function nearestLocal(lut, px, py, { sExpected, radius, lambda = 0.25 }) {
	const { xs, ys, n, ds, length } = lut;

	// Window around sExpected, clipped to the path.
	const low = clamp(sExpected - radius, 0, length);
	const high = clamp(sExpected + radius, 0, length);
	// Its two ends as table indices.
	const firstIndex = clamp(Math.floor(low / ds), 0, n);
	const lastIndex = clamp(Math.ceil(high / ds), 0, n);

	// Lowest-cost sample seen so far.
	let best = firstIndex;
	let bestCost = Infinity;

	// Scan the window, scoring distance plus drift from sExpected.
	for (let i = firstIndex; i <= lastIndex; i++) {
		const dx = px - xs[i];
		const dy = py - ys[i];
		const drift = i * ds - sExpected;
		const sampleCost = dx * dx + dy * dy + lambda * drift * drift;

		if (sampleCost < bestCost) {
			bestCost = sampleCost;
			best = i;
		}
	}

	// Refine the winner under the same scoring.
	return refine(lut, px, py, best, sExpected, lambda);
}
