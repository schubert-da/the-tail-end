<script>
	import { Application, Container, Graphics } from 'pixi.js';
	import { onMount } from 'svelte';

	let app;
	let wrapper;

	const NUM_COLS = 3;

	onMount(async () => {
		app = new Application();
		await app.init({ background: '#333333', resizeTo: window });
		wrapper.appendChild(app.view);

		const container = new Container();
		app.stage.addChild(container);

		for (let i = 0; i < 9; i++) {
			const cell = new Graphics().rect(0, 0, 50, 50).fill('#ffffff');
			cell.x = (i % NUM_COLS) * (50 + 5);
			cell.y = Math.floor(i / NUM_COLS) * (50 + 5);

			container.addChild(cell);
		}
	});
</script>

<div class="wrapper" bind:this={wrapper}></div>
