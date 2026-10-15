// config for the path, a lot of these values are specific to the path in d,
// and will have to be updated when it changes.
export const pathConfig = {
	d: 'M 20 20 C 20 218, 504 218, 504 416 S 20 614, 20 812 S 504 1010, 504 1208 S 20 1406, 20 1604 S 504 1802, 504 2000 S 20 2198, 20 2396 S 504 2594, 504 2792 S 20 2990, 20 3188 S 504 3386, 504 3584 S 20 3782, 20 3980 S 504 4178, 504 4376',
	viewbox: '0 0 524 4396',
	extents: {
		left: 20,
		right: 504,
		top: 20,
		// one pass = one left or right movement of the path
		passHeight: 396,
		passCount: 11
	}
};
