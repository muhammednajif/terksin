async function testFetch() {
  const query = `
    [out:json][timeout:60];
    area["name:en"="Switzerland"]->.searchArea;
    (
      relation["route"="hiking"](area.searchArea);
      relation["route"="foot"](area.searchArea);
    );
    out center 10;
  `;

  try {
    const res = await fetch("https://overpass.kumi.systems/api/interpreter", {
      method: "POST",
      body: "data=" + encodeURIComponent(query),
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    const text = await res.text();
    console.log("Response Status:", res.status);
    console.log("Response Body:", text.substring(0, 500));
  } catch (e) {
    console.error(e);
  }
}
testFetch();
