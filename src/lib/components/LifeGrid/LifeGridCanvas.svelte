<script>
	import { Application, Container, Graphics } from 'pixi.js';
	import { onMount } from 'svelte';
	import { pathConfig } from './LifeGridPath.js';
	import { calculateHorizontalProgress } from '$utils/pathUtils.js';
	import PathSlider from '$components/PathSlider.svelte';

	let app;
	let wrapper;

	let wrapperWidth = $state(0);
	let wrapperHeight = $derived(
		NUM_ROWS * cellWidth + (NUM_ROWS - 1) * GAP + PADDING.bottom + PADDING.top
	);
	let cells = [];

	const NUM_ROWS = 50;
	const NUM_COLS = 12;
	const GAP = 5;
	const PADDING = {
		top: 5,
		right: 5,
		bottom: 5,
		left: 5
	};
	let cellWidth = $derived(
		(wrapperWidth - (NUM_COLS - 1) * GAP - PADDING.left - PADDING.right) / NUM_COLS
	);

	// Slider configuration
	const sliderConfig = {
		d: pathConfig.d,
		viewbox: pathConfig.viewbox,
		tolerance: 5000,
		strokeWidth: 10,
		thumbRadius: 25,
		monotonic: false,
		rotateThumb: false,
		disabled: false
	};

	let progress = $state(0);
	let offPath = $state(false);
	let dragging = $state(false);
	let horizontalProgress = $state(0);

	onMount(async () => {
		app = new Application();
		await app.init({ background: '#333333', resizeTo: wrapper });
		wrapper.appendChild(app.canvas);

		const container = new Container();
		app.stage.addChild(container);

		for (let i = 0; i < NUM_ROWS * NUM_COLS; i++) {
			const cell = new Graphics().rect(0, 0, 50, 50).fill('#ffffff');

			container.addChild(cell);
			cells.push(cell);
		}

		layoutGrid();

		app.renderer.on('resize', (width) => layoutGrid(width));
	});

	function layoutGrid(width) {
		let computedWidth = width ? width : wrapperWidth;
		let computedCellWidth =
			(computedWidth - (NUM_COLS - 1) * GAP - PADDING.left - PADDING.right) / NUM_COLS;

		cells.forEach((cell, i) => {
			cell.x = (i % NUM_COLS) * (computedCellWidth + GAP) + PADDING.left;
			cell.y = Math.floor(i / NUM_COLS) * (computedCellWidth + GAP) + PADDING.top;
			cell.width = computedCellWidth;
			cell.height = computedCellWidth;
		});
	}
</script>

<div class="life-grid-container relative h-screen w-full p-3 sm:p-5 lg:p-10">
	<div
		class="wrapper mx-auto"
		bind:clientWidth={wrapperWidth}
		style:max-width="min(700px, 90vw)"
		style:height={wrapperHeight + 'px'}
		bind:this={wrapper}
	></div>

	<div
		class="absolute top-0 left-1/2 -translate-x-1/2"
		style:width="{wrapperWidth}px"
		style:height="{wrapperHeight}px"
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
			onchange={(current) => {
				horizontalProgress = calculateHorizontalProgress(current, pathConfig);
			}}
			label="Loop track progress"
		/>
	</div>
</div>
