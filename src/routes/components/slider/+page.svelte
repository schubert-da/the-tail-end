<script>
	import PathSlider from '$components/PathSlider.svelte';

	// Hand-authored `d` strings. The component takes any valid path data — these
	// exist to cover the cases that actually stress the tracker.
	const TRACKS = {
		// The important one. Crossed control points make the cubic loop through
		// itself, so the two branches meet — a naive nearest-point search teleports
		// here and windowed tracking does not.
		loop: 'M 30 160 L 140 160 C 265 50, 35 50, 175 160 L 370 160',
		// Rounded rectilinear serpentine — the shape from the reference.
		serpentine:
			'M 45 35 L 313 35 A 22 22 0 0 1 335 57 L 335 68 A 22 22 0 0 1 313 90 L 87 90 A 22 22 0 0 0 65 112 L 65 123 A 22 22 0 0 0 87 145 L 355 145',
		// Baseline: smooth, monotonic in x, nothing tricky.
		curve: 'M 30 150 C 90 40, 150 40, 200 100 S 320 170, 370 60',
		// Sharp corners, where the tangent flips direction instantly.
		zigzag: 'M 30 50 L 80 160 L 130 50 L 180 160 L 230 50 L 280 160 L 330 50 L 370 130',
		// Alternating semicircles about two centres. Adjacent turns sit 12 units
		// apart, so a small tolerance is the point of this one.
		spiral:
			'M 200 100 A 12 12 0 0 1 224 100 A 24 24 0 0 1 176 100 A 36 36 0 0 1 248 100 A 48 48 0 0 1 152 100 A 60 60 0 0 1 272 100 A 72 72 0 0 1 128 100 A 84 84 0 0 1 296 100'
	};

	const BOX = '0 0 400 200';

	// Repeated utility runs, named once so the markup stays readable.
	const CARD = 'rounded-3xl border border-edge bg-surface';
	const WELL = 'rounded-2xl bg-well';
	const CODE = 'rounded bg-well px-1.5 py-0.5 text-[0.9em]';
	const KBD = 'rounded border border-b-2 border-edge bg-surface px-1.5 py-0.5 text-[0.85em]';
	const TOGGLE =
		'cursor-pointer rounded-full border border-edge bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent aria-pressed:border-accent aria-pressed:bg-track-active';

	// Featured slider — bound state the rest of the page reads.
	let progress = $state(0);
	let offPath = $state(false);
	let dragging = $state(false);

	// Live controls.
	let tolerance = $state(48);
	let unlimited = $state(false);
	let monotonic = $state(false);
	let rotateThumb = $state(false);
	let disabled = $state(false);
	let completions = $state(0);

	const effectiveTolerance = $derived(unlimited ? Infinity : tolerance);
	const percent = $derived(Math.round(progress * 100));

	// Gallery.
	let serpentineProgress = $state(0);
	let curveProgress = $state(0);
	let zigzagProgress = $state(0);
	let spiralProgress = $state(0);
	let arrowProgress = $state(0);
</script>

<svelte:head><title>Path Slider — Components</title></svelte:head>

<div class="min-h-screen bg-paper text-ink">
	<!-- Single centred content column; every section aligns to it. -->
	<div class="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8 sm:py-24">
		<header>
			<a href="/components" class="text-sm text-muted no-underline hover:text-accent">
				← Components
			</a>

			<h1 class="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">Path Slider</h1>
			<p class="mt-4 max-w-2xl leading-relaxed text-muted">
				A slider whose track is an arbitrary SVG path. The thumb is pinned to the curve and dragged
				along it; <code class={CODE}>progress</code> is measured in arc length, so 0.5 is genuinely halfway
				along the line however the path is parameterised.
			</p>
		</header>

		<!-- Featured: the self-intersecting track, with everything wired up. -->
		<section class="{CARD} mt-14 p-6 sm:p-10">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<h2 class="text-2xl font-semibold tracking-tight">Loop track</h2>
				<div class="flex items-center gap-2">
					<span
						class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors {dragging
							? 'bg-accent text-surface'
							: 'bg-well text-muted'}"
					>
						dragging
					</span>
					<span
						class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors {offPath
							? 'bg-secondary text-locked'
							: 'bg-well text-muted'}"
					>
						off path
					</span>
				</div>
			</div>

			<p class="mt-3 max-w-xl text-sm leading-relaxed text-muted">
				Trace the loop slowly, then as fast as you can. The thumb has to travel around the loop — it
				can never jump across the crossing to the other branch.
			</p>

			<div class="{WELL} mt-8 p-6 sm:p-10">
				<PathSlider
					d={TRACKS.loop}
					viewBox={BOX}
					bind:progress
					bind:offPath
					bind:dragging
					tolerance={effectiveTolerance}
					strokeWidth={10}
					thumbRadius={14}
					{monotonic}
					{rotateThumb}
					{disabled}
					label="Loop track progress"
					oncomplete={() => completions++}
				/>
			</div>

			<!-- What the component exposes outward. -->
			<div class="mt-8 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8">
				<div class="tabular-nums">
					<div class="text-5xl font-bold tracking-tight">
						{percent}<span class="text-2xl text-muted">%</span>
					</div>
					<div class="mt-2 text-xs text-muted">
						progress = {progress.toFixed(4)} · completed {completions}×
					</div>
				</div>
				<div class="h-3 overflow-hidden rounded-full bg-well">
					<div
						class="h-full rounded-full bg-linear-to-r from-track-active to-accent"
						style="width: {percent}%"
					></div>
				</div>
			</div>

			<!-- Live props. -->
			<div class="mt-10 space-y-6 border-t border-edge pt-8">
				<div class="{WELL} p-5 sm:p-6">
					<label class="block">
						<span class="flex items-baseline justify-between gap-4 text-sm font-medium">
							tolerance
							<span class="text-muted tabular-nums">
								{unlimited ? 'Infinity' : `${tolerance} units`}
							</span>
						</span>
						<input
							type="range"
							min="4"
							max="160"
							bind:value={tolerance}
							disabled={unlimited}
							class="mt-3 w-full accent-accent disabled:opacity-40"
						/>
					</label>
					<p class="mt-3 text-xs leading-relaxed text-muted">
						How far the pointer may stray from the path before the thumb stalls.
					</p>
				</div>

				<div class="flex flex-wrap gap-3">
					<button
						type="button"
						class={TOGGLE}
						aria-pressed={unlimited}
						onclick={() => (unlimited = !unlimited)}
					>
						Always snap
					</button>
					<button
						type="button"
						class={TOGGLE}
						aria-pressed={monotonic}
						onclick={() => (monotonic = !monotonic)}
					>
						Forward only
					</button>
					<button
						type="button"
						class={TOGGLE}
						aria-pressed={rotateThumb}
						onclick={() => (rotateThumb = !rotateThumb)}
					>
						Rotate thumb
					</button>
					<button
						type="button"
						class={TOGGLE}
						aria-pressed={disabled}
						onclick={() => (disabled = !disabled)}
					>
						Disabled
					</button>
					<button
						type="button"
						class={TOGGLE}
						onclick={() => {
							progress = 0;
							completions = 0;
						}}
					>
						Reset
					</button>
				</div>
			</div>
		</section>

		<!-- Other shapes. -->
		<section class="mt-14">
			<h2 class="text-2xl font-semibold tracking-tight">Other tracks</h2>
			<p class="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
				Same component, different <code class={CODE}>d</code>. The spiral omits
				<code class={CODE}>viewBox</code> entirely and derives one from the path's bounding box.
			</p>

			<div class="mt-8 grid gap-6 md:grid-cols-2">
				<article class="{CARD} p-6 sm:p-8">
					<div class="flex items-baseline justify-between gap-4">
						<h3 class="text-lg font-semibold">Serpentine</h3>
						<span class="text-sm text-muted tabular-nums">
							{Math.round(serpentineProgress * 100)}%
						</span>
					</div>
					<p class="mt-2 text-xs leading-relaxed text-muted">
						Rounded rectilinear corners — the shape from the reference.
					</p>
					<div class="{WELL} mt-5 p-5 sm:p-6">
						<PathSlider
							d={TRACKS.serpentine}
							viewBox="0 0 400 180"
							bind:progress={serpentineProgress}
							strokeWidth={16}
							thumbRadius={18}
							label="Serpentine progress"
						/>
					</div>
				</article>

				<article class="{CARD} p-6 sm:p-8">
					<div class="flex items-baseline justify-between gap-4">
						<h3 class="text-lg font-semibold">S-curve</h3>
						<span class="text-sm text-muted tabular-nums">{Math.round(curveProgress * 100)}%</span>
					</div>
					<p class="mt-2 text-xs leading-relaxed text-muted">
						Smooth and well behaved — the baseline case.
					</p>
					<div class="{WELL} mt-5 p-5 sm:p-6">
						<PathSlider
							d={TRACKS.curve}
							viewBox={BOX}
							bind:progress={curveProgress}
							strokeWidth={12}
							thumbRadius={15}
							label="S-curve progress"
						/>
					</div>
				</article>

				<article class="{CARD} p-6 sm:p-8">
					<div class="flex items-baseline justify-between gap-4">
						<h3 class="text-lg font-semibold">Zigzag</h3>
						<span class="text-sm text-muted tabular-nums">{Math.round(zigzagProgress * 100)}%</span>
					</div>
					<p class="mt-2 text-xs leading-relaxed text-muted">
						Sharp corners, where the tangent flips direction instantly.
					</p>
					<div class="{WELL} mt-5 p-5 sm:p-6">
						<PathSlider
							d={TRACKS.zigzag}
							viewBox={BOX}
							bind:progress={zigzagProgress}
							strokeWidth={10}
							thumbRadius={14}
							label="Zigzag progress"
						/>
					</div>
				</article>

				<article class="{CARD} p-6 sm:p-8">
					<div class="flex items-baseline justify-between gap-4">
						<h3 class="text-lg font-semibold">Spiral</h3>
						<span class="text-sm text-muted tabular-nums">{Math.round(spiralProgress * 100)}%</span>
					</div>
					<p class="mt-2 text-xs leading-relaxed text-muted">
						Turns sit 12 units apart, so <code class={CODE}>tolerance</code> drops to 10 — stray onto
						the next turn and the thumb stalls instead of hopping.
					</p>
					<div class="{WELL} mt-5 p-5 sm:p-6">
						<PathSlider
							d={TRACKS.spiral}
							bind:progress={spiralProgress}
							tolerance={10}
							strokeWidth={5}
							thumbRadius={9}
							label="Spiral progress"
						/>
					</div>
				</article>

				<!-- One-off dark surface, so its colours are arbitrary values rather than tokens.
				     Tailwind utilities compile to var(--color-*), so overriding those tokens
				     inline retints the slider's internals for this subtree only. -->
				<article
					class="rounded-3xl border border-[#3a352c] bg-[#2c2822] p-6 text-well sm:p-8 md:col-span-2"
					style="--color-track: #3f3930; --color-thumb-ring: #23201b"
				>
					<div class="flex items-baseline justify-between gap-4">
						<h3 class="text-lg font-semibold">Custom thumb</h3>
						<span class="text-sm tabular-nums opacity-60">
							{Math.round(arrowProgress * 100)}%
						</span>
					</div>
					<p class="mt-2 text-xs leading-relaxed opacity-60">
						A <code class="rounded bg-black/25 px-1.5 py-0.5 text-[0.9em]">thumb</code> snippet,
						plus the
						<code class="rounded bg-black/25 px-1.5 py-0.5 text-[0.9em]">--color-*</code> theme tokens
						re-pointed for a dark surface.
					</p>
					<div class="mt-5 rounded-2xl bg-[#23201b] p-6 sm:p-8">
						<PathSlider
							d={TRACKS.curve}
							viewBox={BOX}
							bind:progress={arrowProgress}
							strokeWidth={12}
							label="Custom thumb progress"
						>
							{#snippet thumb({ angle })}
								<g transform="rotate({angle})">
									<path
										d="M -12 -11 L 14 0 L -12 11 Z"
										class="fill-secondary stroke-locked stroke-[1.5]"
										stroke-linejoin="round"
									/>
								</g>
							{/snippet}
						</PathSlider>
					</div>
				</article>
			</div>
		</section>

		<section class="{CARD} mt-14 p-6 sm:p-10">
			<h2 class="text-2xl font-semibold tracking-tight">Keyboard</h2>
			<p class="mt-3 text-sm leading-relaxed text-muted">
				Every slider is focusable. <kbd class={KBD}>←</kbd> <kbd class={KBD}>→</kbd> step by 1%,
				<kbd class={KBD}>Shift</kbd> multiplies by 10, and <kbd class={KBD}>Home</kbd> /
				<kbd class={KBD}>End</kbd> jump to either end. Keyboard input ignores
				<code class={CODE}>tolerance</code> — there is no pointer to be off-path.
			</p>
		</section>
	</div>
</div>
