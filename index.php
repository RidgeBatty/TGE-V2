<!DOCTYPE html>
<html>
	<head>
		<title>TGE</title>
	</head>
		<body class="cover">	
			<h1>Documentation</h1>
			<a href="TGE Documentation.pdf" targer="_blank">PDF</a>

			<h1>Files</h1>
	
<?php

$files = array_diff(scandir('.'), array('.', '..'));

foreach ($files as $value) {
	if (strpos($value, '.js')) {
		echo "<a href='$value'>$value</a><br>";
	}
}

?>	
			<h1>Examples</h1>
			<a href="examples/primer">Example 1 - Primer</a>
		</body>	
</html>