const startTime = Date.now();
async function testFetch() {
  const query = `
    [out:json][timeout:10];
    (
      relation["route"="hiking"](45.8,5.9,47.8,10.5);
      relation["route"="foot"](45.8,5.9,47.8,10.5);
    );
    out center 50;
  `;

  try {
    const res = await fetch("https://overpass.osm.ch/api/interpreter", {
      method: "POST",
      body: "data=" + encodeURIComponent(query),
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    const data = await res.json();
    console.log("Time taken:", Date.now() - startTime, "ms");
    console.log("Results:", data.elements?.length || 0);
  } catch (e) {
    console.error(e);
  }
}
testFetch();
