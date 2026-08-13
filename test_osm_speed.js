const startTime = Date.now();
async function testFetch() {
  const query = `
    [out:json][timeout:10];
    area["name:en"="Switzerland"]->.searchArea;
    way["highway"="path"]["sac_scale"](area.searchArea);
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
