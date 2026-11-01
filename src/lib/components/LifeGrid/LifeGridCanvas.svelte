<script>
	import { Application, Container, Graphics } from 'pixi.js';
	import { onMount } from 'svelte';

	let app;
	let wrapper;

	let wrapperWidth = $state(0);
	let cells = [];

	const NUM_ROWS = 10;
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

<div
	class="wrapper w-full"
	bind:clientWidth={wrapperWidth}
	style:max-width="min(700px, 90vw)"
	style:height={NUM_ROWS * cellWidth + (NUM_ROWS - 1) * GAP + PADDING.bottom + PADDING.top + 'px'}
	bind:this={wrapper}
></div>
