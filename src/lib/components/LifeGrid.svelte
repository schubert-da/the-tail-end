<script>
	const MAX_CELL_WIDTH = 40;
	const YEARS = 100;
	const NUM_COLS = 12;
</script>

<div
	class="life-grid w-full justify-center gap-0.5 p-3 sm:p-5 lg:gap-1 lg:p-10"
	style:--cell-width="{MAX_CELL_WIDTH}px"
	style:--num-cols={NUM_COLS}
>
	{#each Array(YEARS * NUM_COLS) as _, i}
		<div class="life-cell aspect-square w-full max-w-full bg-gray-400"></div>
	{/each}
</div>

<style>
	.life-grid {
		display: grid;
		grid-template-columns: repeat(var(--num-cols), minmax(0, var(--cell-width)));
	}
</style>
