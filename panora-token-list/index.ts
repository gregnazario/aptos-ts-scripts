const end_point = "https://api.panora.exchange/tokenlist";

const query = {};

const headers = {
    "x-api-key":
        "a4^KV_EaTf4MW#ZdvgGKX#HUD^3IFEAOV_kzpIE^3BQGA8pDnrkT7JcIy#HNlLGi",
};

const queryString = new URLSearchParams(query);
const url = `${end_point}?${queryString}`;

const ret = await (
    await fetch(url, {
        method: "GET",
        headers: headers,
    })
).json();

console.log(JSON.stringify(ret, null, 2));