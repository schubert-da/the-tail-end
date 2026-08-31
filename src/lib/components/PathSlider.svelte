<!--
	PathSlider — a slider whose track is an arbitrary SVG path.

	The thumb is constrained to a path that may curve, double back, or cross
	itself, and the user drags it along by tracing the shape. `progress` (0..1) is
	measured in arc length, so it advances at a constant spatial rate regardless
	of how the curve is parameterised.

	The tracking maths lives in $utils/path-tracker.js — see the header there for
	why the drag solver searches a window rather than the whole path.

	Units: `tolerance`, `padding`, `strokeWidth` and `thumbRadius` are all in the
	path's own user-space units — the coordinate system the `d` string is written
	in — not CSS pixels. A scaled SVG makes that distinction visible.

	Theming: the internals paint straight from Tailwind theme tokens, so setting
	any of these on an ancestor retints that subtree. The thumb body uses
	Tailwind's default palette and is restyled with the `thumb` snippet instead.

		--color-track         unfilled track
		--color-track-active  filled portion
		--color-thumb-ring    thumb outline
		--color-accent        thumb outline on focus
-->
<script>
	import {
		angleAt,
		buildLUT,
		nearestGlobal,
		nearestLocal,
		pointAt,
		tangentAt
	} from '$utils/path-tracker.js';

	let {
		/** SVG path data. Any valid `d` string; self-intersection is fine. */
		d,
		/** Position along the path, 0 at the start and 1 at the end. */
		progress = $bindable(0),
		/** True while the pointer has strayed further than `tolerance` mid-drag. */
		offPath = $bindable(false),
		/** True between pointerdown and pointerup. */
		dragging = $bindable(false),
		/** Omit to derive one from the path's bounding box (costs a reflow on hydrate). */
		viewBox = null,
		padding = 12,
		strokeWidth = 8,
		thumbRadius = 14,
		/** How far the pointer may stray before the thumb stalls. `Infinity` = always snap. */
		tolerance = 48,
		/** Forward-only: progress can increase but never decrease. */
		monotonic = false,
		disabled = false,
		/** Turn the thumb to face along the path. */
		rotateThumb = false,
		/** Keyboard increment; Shift multiplies it by 10. */
		step = 0.01,
		label = 'Progress',
		class: className = '',
		/** ({ progress, x, y, angle, offPath }) on every change, drag or keyboard. */
		onchange,
		/** ({ progress }) when a drag ends. */
		oncommit,
		/** Fires once each time progress reaches 1. */
		oncomplete,
		/** Snippet replacing the default circle: ({ progress, x, y, angle, offPath, dragging }). */
		thumb
	} = $props();

	/** Widen the search window as the pointer moves faster, so quick drags keep up. */
	const WINDOW_SPEED_FACTOR = 1.5;
	/** Ceiling on that widening, as a fraction of total arc length. */
	const MAX_WINDOW_FRACTION = 0.25;
	/** Continuity weight. Must stay below 1 — see `cost` in path-tracker.js. */
	const LAMBDA = 0.25;

	const clampProgress = (value) => (value < 0 ? 0 : value > 1 ? 1 : value);

	let svgEl = $state(null);
	let pathEl = $state(null);
	let lut = $state(null);
	let autoViewBox = $state(null);

	// Non-reactive drag bookkeeping — none of it is rendered.
	let ctm = null;
	let dragPointerId = null;
	let prevPoint = null;
	let pending = null;
	let rafId = 0;
	let completed = false;

	// getTotalLength/getPointAtLength/getBBox don't exist on the server, so all
	// geometry is deferred to an effect — effects don't run during SSR. The server
	// renders the bare track and everything else appears on hydrate.
	$effect(() => {
		d; // re-sample whenever the shape changes
		if (!pathEl) return;

		lut = buildLUT(pathEl);

		const box = pathEl.getBBox();
		const pad = padding + strokeWidth / 2 + thumbRadius;
		autoViewBox = `${box.x - pad} ${box.y - pad} ${box.width + pad * 2} ${box.height + pad * 2}`;
	});

	const resolvedViewBox = $derived(viewBox ?? autoViewBox ?? '0 0 100 100');
	const length = $derived(lut?.length ?? 0);
	const s = $derived(length * clampProgress(progress));
	const position = $derived(lut ? pointAt(lut, s) : null);
	const angle = $derived(lut ? angleAt(lut, s) : 0);
	/** Pressing anywhere within this of the track counts as grabbing it. */
	const grabRadius = $derived(Math.max(tolerance, thumbRadius));

	function commitProgress(value) {
		const next = clampProgress(value);
		if (next === progress) return;

		progress = next;

		if (lut) {
			const p = pointAt(lut, next * lut.length);
			onchange?.({
				progress: next,
				x: p.x,
				y: p.y,
				angle: angleAt(lut, next * lut.length),
				offPath
			});
		} else {
			onchange?.({ progress: next, x: 0, y: 0, angle: 0, offPath });
		}

		if (next < 1) completed = false;
		else if (!completed) {
			completed = true;
			oncomplete?.();
		}
	}

	function refreshCTM() {
		const matrix = pathEl?.getScreenCTM();
		ctm = matrix ? matrix.inverse() : null;
	}

	function toUserSpace(clientX, clientY) {
		if (!ctm) return null;
		const p = new DOMPoint(clientX, clientY).matrixTransform(ctm);
		return { x: p.x, y: p.y };
	}

	/** Advance the thumb toward one pointer sample. */
	function track(point) {
		const total = lut.length;
		const sPrev = clampProgress(progress) * total;

		// Project the pointer's motion onto the tangent to get a signed guess at how
		// far along the path it wants to travel. This is what lets the thumb round a
		// loop instead of cutting across it.
		const tangent = tangentAt(lut, sPrev);
		const dx = point.x - prevPoint.x;
		const dy = point.y - prevPoint.y;
		prevPoint = point;

		const dsGuess = dx * tangent.x + dy * tangent.y;

		// A pointer that has already strayed is not travelling along the path, so its
		// displacement says nothing useful about arc length. Anchor on where the thumb
		// actually stalled and let the distance term re-acquire the curve instead.
		const sExpected = offPath ? sPrev : Math.max(0, Math.min(total, sPrev + dsGuess));

		// Capped so a dropped frame or a pointer re-entering the page can't open the
		// window wide enough to hop branches — the thumb still has to walk there.
		const minWindow = Math.max(lut.ds * 3, total * 0.02);
		const searchWindow = Math.min(
			minWindow + WINDOW_SPEED_FACTOR * Math.abs(dsGuess),
			total * MAX_WINDOW_FRACTION
		);

		const hit = nearestLocal(lut, point.x, point.y, {
			sExpected,
			radius: searchWindow,
			lambda: LAMBDA
		});
		const sNext = monotonic ? Math.max(sPrev, hit.s) : hit.s;

		const target = pointAt(lut, sNext);
		const strayed = Math.hypot(point.x - target.x, point.y - target.y) > tolerance;

		// Stall rather than snap: hold position until the pointer comes back to the
		// path. `prevPoint` still advanced above, so the excursion is tracked in small
		// increments and re-acquires cleanly on return.
		offPath = strayed;
		if (strayed) return;

		commitProgress(sNext / total);
	}

	function flush() {
		rafId = 0;
		const queue = pending;
		pending = null;
		if (!queue || !lut || !prevPoint) return;

		// One layout read per frame, which also keeps the mapping correct if the page
		// scrolled or the SVG resized mid-drag.
		refreshCTM();
		if (!ctm) return;

		for (let i = 0; i < queue.length; i += 2) {
			const point = toUserSpace(queue[i], queue[i + 1]);
			if (point) track(point);
		}
	}

	function handlePointerDown(event) {
		if (disabled || !lut) return;

		refreshCTM();
		const point = toUserSpace(event.clientX, event.clientY);
		if (!point) return;

		const hit = nearestGlobal(lut, point.x, point.y);
		if (hit.dist > grabRadius) return; // pressed the box, not the track

		event.preventDefault();
		svgEl.setPointerCapture(event.pointerId);
		svgEl.focus();

		dragPointerId = event.pointerId;
		dragging = true;
		offPath = false;
		prevPoint = point;

		if (!monotonic || hit.s > s) commitProgress(hit.s / lut.length);
	}

	function handlePointerMove(event) {
		if (dragPointerId !== event.pointerId || !lut) return;

		// Replaying coalesced events keeps each step small on a high-refresh pointer,
		// which is what stops a fast drag from skipping across a loop's crossing.
		const coalesced = event.getCoalescedEvents?.();
		const samples = coalesced?.length ? coalesced : [event];

		pending ??= [];
		for (const sample of samples) pending.push(sample.clientX, sample.clientY);

		rafId ||= requestAnimationFrame(flush);
	}

	function handlePointerUp(event) {
		if (dragPointerId !== event.pointerId) return;

		if (svgEl.hasPointerCapture(event.pointerId)) svgEl.releasePointerCapture(event.pointerId);
		if (rafId) cancelAnimationFrame(rafId);

		rafId = 0;
		pending = null;
		prevPoint = null;
		dragPointerId = null;
		dragging = false;
		offPath = false;

		oncommit?.({ progress });
	}

	function handleKeyDown(event) {
		if (disabled || !lut) return;

		const amount = step * (event.shiftKey ? 10 : 1);
		let next;

		switch (event.key) {
			case 'ArrowRight':
			case 'ArrowUp':
				next = progress + amount;
				break;
			case 'ArrowLeft':
			case 'ArrowDown':
				next = progress - amount;
				break;
			case 'Home':
				next = 0;
				break;
			case 'End':
				next = 1;
				break;
			default:
				return;
		}

		event.preventDefault();
		// There is no pointer to be off-path, so `tolerance` doesn't apply here.
		if (monotonic && next < progress) return;
		commitProgress(next);
	}

	$effect(() => () => {
		if (rafId) cancelAnimationFrame(rafId);
	});
</script>

<svg
	bind:this={svgEl}
	class={[
		'path-slider group block h-auto w-full touch-none overflow-visible outline-none select-none',
		disabled ? 'cursor-not-allowed opacity-45' : dragging ? 'cursor-grabbing' : 'cursor-grab',
		className,
		dragging && 'is-dragging',
		offPath && 'is-off-path',
		disabled && 'is-disabled'
	]}
	viewBox={resolvedViewBox}
	preserveAspectRatio="xMidYMid meet"
	role="slider"
	tabindex={disabled ? -1 : 0}
	aria-label={label}
	aria-valuemin={0}
	aria-valuemax={1}
	aria-valuenow={progress}
	aria-valuetext="{Math.round(progress * 100)}%"
	aria-disabled={disabled}
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointercancel={handlePointerUp}
	onkeydown={handleKeyDown}
>
	<path
		bind:this={pathEl}
		class="ps-track stroke-track"
		{d}
		fill="none"
		stroke-width={strokeWidth}
		stroke-linecap="round"
		stroke-linejoin="round"
	/>

	{#if length}
		<path
			class="ps-fill stroke-track-active"
			{d}
			fill="none"
			stroke-width={strokeWidth}
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-dasharray="{length} {length}"
			stroke-dashoffset={length - s}
		/>
	{/if}

	{#if position}
		<g
			class="ps-thumb"
			transform="translate({position.x} {position.y}){rotateThumb ? ` rotate(${angle})` : ''}"
		>
			{#if thumb}
				{@render thumb({ progress, x: position.x, y: position.y, angle, offPath, dragging })}
			{:else}
				<!-- An SVG outline clips against the viewBox, so the focus ring lives on the
				     thumb's own stroke, driven by focus-visible on the <svg> group. -->
				<circle
					r={thumbRadius}
					class={[
						'stroke-thumb-ring stroke-2',
						'group-focus-visible:stroke-accent group-focus-visible:stroke-[4]',
						offPath ? 'fill-amber-400' : 'fill-neutral-300'
					]}
				/>
			{/if}
		</g>
	{/if}
</svg>
