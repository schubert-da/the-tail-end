export function calculateHorizontalProgress(current, pathConfig) {
	const pathExtents = pathConfig.extents;

	// 1. which pass is it on?
	const passNumber = Math.floor((current.y - pathExtents.top) / pathExtents.passHeight);

	// 2. how far along the pass is it?
	const isForwardPass = passNumber % 2 === 0;
	const passProgress = isForwardPass ? current.x - pathExtents.left : pathExtents.right - current.x;

	// 3. Return current horizontal progress / total horizontal distance of path
	const passWidth = pathExtents.right - pathExtents.left;
	return (passWidth * passNumber + passProgress) / (passWidth * pathExtents.passCount);
}
