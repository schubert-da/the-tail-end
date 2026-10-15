<script>
	import PathSlider from '$components/PathSlider.svelte';
	import { pathConfig } from './LifeGridPath.js';

	const MAX_CELL_WIDTH = 40;
	const YEARS = 100;
	const NUM_COLS = 12;

	let gridDimensions = $state({
		width: 524,
		height: 4396
	});

	let sliderConfig = $derived({
		d: pathConfig.d,
		viewbox: pathConfig.viewbox,
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
