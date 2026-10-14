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
		d: 'M 20 20 C 20 218, 504 218, 504 416 S 20 614, 20 812 S 504 1010, 504 1208 S 20 1406, 20 1604 S 504 1802, 504 2000 S 20 2198, 20 2396 S 504 2594, 504 2792 S 20 2990, 20 3188 S 504 3386, 504 3584 S 20 3782, 20 3980 S 504 4178, 504 4376',
		viewbox: '0 0 524 4396',
		tolerance: 100,
		strokeWidth: 10,
		thumbRadius: 30,
		monotonic: false,
		rotateThumb: false,
		disabled: false
	});

	let progress = $state(0);
	let offPath = $state(false);
	let dragging = $state(false);

	let screenHeight = $state(450);

	function calculateGridTranslation(progress, gridHeight) {
		let translation = progress * gridHeight;
		// start moving the grid only after its scrolled down a certain amt of the page (otherwise it gets stuck at the top)
		let effectiveTranslation =
			translation < screenHeight * 0.25 ? 0 : translation - screenHeight * 0.25;

		return `0 ${-effectiveTranslation}px`;
	}
</script>

<svelte:window bind:innerHeight={screenHeight} />

<div class="life-grid-container relative w-full p-3 sm:p-5 lg:p-10">
	<div
		class="grid-content-track relative mx-auto w-fit"
		style:translate={calculateGridTranslation(progress, gridDimensions.height)}
	>
		<div
			class="life-grid gap-0.5 lg:gap-1"
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
			class="absolute top-0 left-1/2 -translate-x-1/2"
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
</div>

<style>
	.life-grid {
		display: grid;
		grid-template-columns: repeat(var(--num-cols), minmax(0, var(--cell-width)));
	}
</style>
