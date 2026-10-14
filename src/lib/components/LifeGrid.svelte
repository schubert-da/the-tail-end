<script>
	import PathSlider from '$components/PathSlider.svelte';

	const MAX_CELL_WIDTH = 40;
	const YEARS = 100;
	const NUM_COLS = 12;

	let gridDimensions = $state({
		width: 524,
		height: 4396
	});

	let sliderConfig = $derived({
		d: 'M 30 160 L 140 160 C 265 50, 35 50, 175 160 L 370 160',
		viewbox: '0 0 524 4396',
		tolerance: 50,
		strokeWidth: 10,
		thumbRadius: 14,
		monotonic: false,
		rotateThumb: false,
		disabled: false
	});

	let progress = $state(0);
	let offPath = $state(false);
	let dragging = $state(false);

	$inspect(gridDimensions);
</script>

<div class="life-grid-container relative w-full p-3 sm:p-5 lg:p-10">
	<div
		class="life-grid mx-auto w-fit gap-0.5 lg:gap-1"
		style:--cell-width="{MAX_CELL_WIDTH}px"
		style:--num-cols={NUM_COLS}
		bind:clientWidth={gridDimensions.width}
		bind:clientHeight={gridDimensions.height}
	>
		{#each Array(YEARS * NUM_COLS) as _, i}
			<div class="life-cell aspect-square w-full bg-gray-400"></div>
		{/each}
	</div>

	<div
		class="absolute top-0 left-1/2 -translate-x-1/2 pt-3 sm:pt-5 lg:pt-10"
		style:width="{gridDimensions.width}px"
		style:height="{gridDimensions.height}px"
	>
		<PathSlider
			d={sliderConfig.d}
			viewBox={sliderConfig.viewbox}
			bind:progress
			bind:offPath
			bind:dragging
			tolerance={sliderConfig.tolerance}
			strokeWidth={sliderConfig.strokeWidth}
			thumbRadius={sliderConfig.thumbRadius}
			monotonic={sliderConfig.monotonic}
			rotateThumb={sliderConfig.rotateThumb}
			disabled={sliderConfig.disabled}
			label="Loop track progress"
		/>
	</div>
</div>

<style>
	.life-grid {
		display: grid;
		grid-template-columns: repeat(var(--num-cols), minmax(0, var(--cell-width)));
	}
</style>
