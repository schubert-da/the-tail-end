<script>
	const components = [
		{
			href: '/components/slider',
			name: 'Path Slider',
			description: 'A slider whose track is an arbitrary SVG path — curved, doubling back, looping.'
		}
	];
</script>

<svelte:head><title>Components</title></svelte:head>

<div class="min-h-screen bg-paper text-ink">
	<div class="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8 sm:py-24">
		<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">Components</h1>

		<ul class="mt-10 space-y-4">
			{#each components as { href, name, description } (href)}
				<li>
					<a
						{href}
						class="block rounded-3xl border border-edge bg-surface p-6 no-underline transition-colors hover:border-accent sm:p-8"
					>
						<span class="text-lg font-semibold">{name}</span>
						<span class="mt-2 block text-sm leading-relaxed text-muted">{description}</span>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</div>
